const router = require('express').Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const TRANSICIONES = {
  // Flujo 1
  en_cotizacion:        ['cotizacion_pendiente'],
  unidad_recibida:      ['en_taller'],
  // Flujo 3
  pausado_consulta:     ['en_taller', 'listo_entrega'],
  // Nuevo pre-cierre
  en_cierre:            ['entregado'],
  // Existentes (sin cambios)
  recepcion:            ['diagnostico'],
  diagnostico:          ['cotizacion_pendiente'],
  cotizacion_pendiente: ['cotizacion_enviada'],
  cotizacion_enviada:   ['aprobada', 'rechazada'],
  aprobada:             ['en_taller', 'unidad_recibida'],
  rechazada:            ['cotizacion_pendiente'],
  en_taller:            ['listo_entrega', 'pausado_consulta'],
  listo_entrega:        ['en_cierre', 'entregado'],
  entregado:            [],
};

// ─── GET /api/ordenes ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  // Pipeline: devuelve órdenes activas agrupadas por estatus
  if (req.query.pipeline === '1') {
    const rows = db.prepare(`
      SELECT ot.id, ot.estatus, ot.tipo_flujo, ot.updated_at, ot.fecha_recepcion,
             a.placa, a.marca, a.modelo,
             cl.nombre AS cliente_nombre
      FROM ordenes_trabajo ot
      LEFT JOIN autos a ON a.id = ot.auto_id
      LEFT JOIN clientes cl ON cl.id = ot.cliente_id
      WHERE ot.estatus NOT IN ('entregado', 'rechazada')
      ORDER BY ot.updated_at ASC
    `).all();
    const agrupado = {};
    rows.forEach(r => {
      if (!agrupado[r.estatus]) agrupado[r.estatus] = [];
      agrupado[r.estatus].push(r);
    });
    return res.json({ data: agrupado });
  }

  let where = '';
  if (req.query.activas === '1') {
    where = `WHERE ot.estatus != 'entregado' AND ot.estatus != 'rechazada'`;
  } else if (req.query.entregadas === '1') {
    where = `WHERE ot.estatus = 'entregado'`;
  }

  const rows = db.prepare(`
    SELECT ot.*,
           a.placa, a.marca, a.modelo,
           cl.nombre AS cliente_nombre
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    ${where}
    ORDER BY ot.id DESC
  `).all();

  res.json({ data: rows });
});

// ─── GET /api/ordenes/:id ────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const ot = db.prepare(`
    SELECT ot.*,
           a.placa, a.marca, a.modelo, a.anio, a.motor, a.vin, a.color,
           cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
           cl.email AS cliente_email
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(req.params.id);

  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  // Diagnóstico
  const diag = db.prepare('SELECT * FROM diagnostico WHERE orden_id = ?').get(ot.id);
  if (diag) {
    diag.checklist = db.prepare('SELECT * FROM diagnostico_checklist WHERE diagnostico_id = ?').all(diag.id);
    diag.items = db.prepare('SELECT * FROM diagnostico_items WHERE diagnostico_id = ?').all(diag.id);
    ot.diagnostico = diag;
  } else {
    ot.diagnostico = null;
  }

  // Cotización activa
  const cotizacion = db.prepare(
    `SELECT * FROM cotizaciones WHERE orden_id = ? AND estatus != 'convertida' ORDER BY id DESC LIMIT 1`
  ).get(ot.id);
  if (cotizacion) {
    cotizacion.items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?').all(cotizacion.id);
    ot.cotizacion = cotizacion;
  } else {
    ot.cotizacion = null;
  }

  res.json({ data: ot });
});

// ─── POST /api/ordenes ───────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { auto_id, cliente_id, odometro, fecha_entrega_estimada, notas_recepcion, tipo_servicio, tipo_flujo, estatus_inicial } = req.body;
  if (!auto_id) return res.status(400).json({ error: 'auto_id es requerido' });

  // Si no se pasa cliente_id, intentar obtenerlo del auto
  let cid = cliente_id || null;
  if (!cid) {
    const auto = db.prepare('SELECT cliente_id FROM autos WHERE id = ?').get(auto_id);
    if (auto) cid = auto.cliente_id || null;
  }

  const tipoFlujoVal = ['flujo_1', 'flujo_2', 'flujo_3'].includes(tipo_flujo) ? tipo_flujo : 'flujo_2';
  // Flujo 1 arranca en cotización (aún sin unidad); los demás en recepción
  const estatusIni = (tipoFlujoVal === 'flujo_1' && estatus_inicial === 'en_cotizacion') ? 'en_cotizacion' : 'recepcion';

  const r = db.prepare(`
    INSERT INTO ordenes_trabajo (auto_id, cliente_id, estatus, tipo_flujo, odometro, fecha_entrega_estimada, notas_recepcion, tipo_servicio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(auto_id, cid, estatusIni, tipoFlujoVal, odometro || null, fecha_entrega_estimada || null, notas_recepcion || null, tipo_servicio || null);

  const ot = db.prepare(`
    SELECT ot.*, a.placa, a.marca, a.modelo, cl.nombre AS cliente_nombre
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(r.lastInsertRowid);

  res.status(201).json({ data: ot });
});

// ─── PUT /api/ordenes/:id/estatus ────────────────────────────────────────────
router.put('/:id/estatus', (req, res) => {
  const { estatus } = req.body;
  if (!estatus) return res.status(400).json({ error: 'estatus es requerido' });

  const ot = db.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const permitidos = TRANSICIONES[ot.estatus] || [];
  if (!permitidos.includes(estatus)) {
    return res.status(400).json({
      error: `Transición inválida: ${ot.estatus} → ${estatus}`,
      permitidos,
    });
  }

  const fechaCierre = estatus === 'entregado' ? new Date().toISOString().slice(0, 10) : ot.fecha_cierre;
  db.prepare(`
    UPDATE ordenes_trabajo SET estatus = ?, fecha_cierre = ?, updated_at = datetime('now') WHERE id = ?
  `).run(estatus, fechaCierre, req.params.id);

  const updated = db.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  res.json({ data: updated });
});

// ─── PUT /api/ordenes/:id ────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const ot = db.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const { costo_real, precio_real, tipo_flujo } = req.body;
  const tipoFlujoVal = ['flujo_1', 'flujo_2', 'flujo_3'].includes(tipo_flujo) ? tipo_flujo : ot.tipo_flujo;

  db.prepare(`
    UPDATE ordenes_trabajo
    SET costo_real = ?, precio_real = ?, tipo_flujo = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    costo_real !== undefined ? costo_real : ot.costo_real,
    precio_real !== undefined ? precio_real : ot.precio_real,
    tipoFlujoVal,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  res.json({ data: updated });
});

// ─── DELETE /api/ordenes/:id ─────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const ot = db.prepare('SELECT * FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });
  if (ot.estatus !== 'recepcion') {
    return res.status(400).json({ error: 'Solo se puede eliminar una orden en estatus recepcion' });
  }
  db.prepare('DELETE FROM ordenes_trabajo WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// ─── GET /api/ordenes/:id/diagnostico ────────────────────────────────────────
router.get('/:id/diagnostico', (req, res) => {
  const ot = db.prepare('SELECT id FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const diag = db.prepare('SELECT * FROM diagnostico WHERE orden_id = ?').get(req.params.id);
  if (!diag) return res.status(404).json({ error: 'Diagnóstico no encontrado' });

  diag.checklist = db.prepare('SELECT * FROM diagnostico_checklist WHERE diagnostico_id = ?').all(diag.id);
  diag.items = db.prepare('SELECT * FROM diagnostico_items WHERE diagnostico_id = ?').all(diag.id);

  res.json({ data: diag });
});

// ─── POST /api/ordenes/:id/diagnostico ───────────────────────────────────────
router.post('/:id/diagnostico', (req, res) => {
  const ot = db.prepare('SELECT id FROM ordenes_trabajo WHERE id = ?').get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const { notas_libres, checklist = [], items = [] } = req.body;

  const upsert = db.transaction(() => {
    // Borrar existente si lo hay
    const existing = db.prepare('SELECT id FROM diagnostico WHERE orden_id = ?').get(req.params.id);
    if (existing) {
      db.prepare('DELETE FROM diagnostico_checklist WHERE diagnostico_id = ?').run(existing.id);
      db.prepare('DELETE FROM diagnostico_items WHERE diagnostico_id = ?').run(existing.id);
      db.prepare('DELETE FROM diagnostico WHERE id = ?').run(existing.id);
    }

    // Crear nuevo
    const r = db.prepare(
      `INSERT INTO diagnostico (orden_id, notas_libres) VALUES (?, ?)`
    ).run(req.params.id, notas_libres || null);
    const diagId = r.lastInsertRowid;

    const insCheck = db.prepare(
      `INSERT INTO diagnostico_checklist (diagnostico_id, seccion, item, estatus, notas) VALUES (?,?,?,?,?)`
    );
    for (const c of checklist) {
      insCheck.run(diagId, c.seccion, c.item, c.estatus || 'ok', c.notas || null);
    }

    const insItem = db.prepare(
      `INSERT INTO diagnostico_items (diagnostico_id, descripcion, urgencia, incluir_en_cotizacion) VALUES (?,?,?,?)`
    );
    for (const it of items) {
      insItem.run(diagId, it.descripcion, it.urgencia || 'normal', it.incluir_en_cotizacion !== undefined ? (it.incluir_en_cotizacion ? 1 : 0) : 1);
    }

    return diagId;
  });

  const diagId = upsert();
  const diag = db.prepare('SELECT * FROM diagnostico WHERE id = ?').get(diagId);
  diag.checklist = db.prepare('SELECT * FROM diagnostico_checklist WHERE diagnostico_id = ?').all(diagId);
  diag.items = db.prepare('SELECT * FROM diagnostico_items WHERE diagnostico_id = ?').all(diagId);

  res.status(201).json({ data: diag });
});

// ─── POST /api/ordenes/:id/cotizacion ────────────────────────────────────────
router.post('/:id/cotizacion', (req, res) => {
  const ot = db.prepare(`
    SELECT ot.*, a.placa, a.marca, a.modelo, a.anio,
           cl.nombre AS cliente_nombre
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const diag = db.prepare('SELECT id FROM diagnostico WHERE orden_id = ?').get(req.params.id);
  if (!diag) return res.status(400).json({ error: 'La orden no tiene diagnóstico' });

  const diagItems = db.prepare(
    'SELECT * FROM diagnostico_items WHERE diagnostico_id = ? AND incluir_en_cotizacion = 1'
  ).all(diag.id);

  const gen = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO cotizaciones (orden_id, cliente_id, cliente_nombre, placa, marca, modelo, anio,
        fecha, estatus, total_costo, total_precio)
      VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), 'borrador', 0, 0)
    `).run(ot.id, ot.cliente_id || null, ot.cliente_nombre || null,
      ot.placa || null, ot.marca || null, ot.modelo || null, ot.anio || null);
    const cotId = r.lastInsertRowid;

    const insItem = db.prepare(
      `INSERT INTO cotizacion_items (cotizacion_id, descripcion, cantidad, costo_unitario, precio_unitario, subtotal_costo, subtotal_precio)
       VALUES (?,?,1,0,0,0,0)`
    );
    for (const it of diagItems) {
      insItem.run(cotId, it.descripcion);
    }

    return cotId;
  });

  const cotizacion_id = gen();
  res.status(201).json({ data: { cotizacion_id } });
});

// ─── POST /api/ordenes/:id/cotizacion/enviar ─────────────────────────────────
router.post('/:id/cotizacion/enviar', async (req, res) => {
  const ot = db.prepare(`
    SELECT ot.*, a.placa, a.marca, a.modelo, a.anio,
           cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
           cl.email AS cliente_email
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const cotizacion = db.prepare(
    `SELECT * FROM cotizaciones WHERE orden_id = ? AND estatus != 'convertida' ORDER BY id DESC LIMIT 1`
  ).get(req.params.id);
  if (!cotizacion) return res.status(404).json({ error: 'No hay cotización activa para esta orden' });

  // Generar token si no tiene
  const token = cotizacion.token || uuidv4();

  // Actualizar cotización y OT
  db.prepare(
    `UPDATE cotizaciones SET estatus = 'enviada', token = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(token, cotizacion.id);
  db.prepare(
    `UPDATE ordenes_trabajo SET estatus = 'cotizacion_enviada', updated_at = datetime('now') WHERE id = ?`
  ).run(req.params.id);

  const items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?').all(cotizacion.id);
  const total = items.reduce((s, i) => s + (i.subtotal_precio || i.precio_unitario || 0), 0);

  const publicUrl = `http://62.238.3.136:8082/c/${token}`;

  // WhatsApp URL
  const telefono = (ot.cliente_telefono || '').replace(/\D/g, '');
  const waMsg = `Hola ${ot.cliente_nombre || 'cliente'}, tu cotización de AutoFix Querétaro para tu ${ot.marca || ''} ${ot.modelo || ''} (${ot.placa || ''}) está lista. Revísala aquí: ${publicUrl}`;
  const whatsapp_url = telefono
    ? `https://wa.me/52${telefono}?text=${encodeURIComponent(waMsg)}`
    : null;

  // Intentar enviar email
  let email_enviado = false;
  const emailCliente = ot.cliente_email;
  if (emailCliente && process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const itemsHtml = items.map(it =>
        `<tr><td>${it.descripcion}</td><td>${it.cantidad || 1}</td><td>$${(it.precio_unitario || 0).toFixed(2)}</td><td>$${(it.subtotal_precio || it.precio_unitario || 0).toFixed(2)}</td></tr>`
      ).join('');

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: emailCliente,
        subject: 'Tu cotización de AutoFix Querétaro está lista',
        html: `
          <h2>Hola ${ot.cliente_nombre || 'cliente'},</h2>
          <p>Tu cotización para tu vehículo <strong>${ot.marca || ''} ${ot.modelo || ''} (${ot.placa || ''})</strong> está lista.</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
            <thead><tr><th>Servicio</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>$${total.toFixed(2)}</strong></td></tr></tfoot>
          </table>
          <br>
          <p><a href="${publicUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Ver y aprobar cotización</a></p>
          <p>AutoFix Querétaro</p>
        `,
      });
      email_enviado = true;
    } catch (err) {
      console.error('[ordenes] Error enviando email:', err.message);
    }
  }

  res.json({ data: { token, whatsapp_url, email_enviado } });
});

module.exports = router;
