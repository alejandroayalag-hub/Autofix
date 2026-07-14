const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const pdfDir = path.join(__dirname, '../../uploads/remisiones');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

const fmt = n => `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

function datosOrden(ordenId) {
  return db.prepare(`
    SELECT ot.*, a.placa, a.marca, a.modelo, a.anio,
           cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(ordenId);
}

function generarPdf(remision, ot, items) {
  const archivo = `${remision.numero_folio}.pdf`;
  const abs = path.join(pdfDir, archivo);
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(fs.createWriteStream(abs));

  // Encabezado
  doc.fontSize(18).font('Helvetica-Bold').text('AutoFix Querétaro', { continued: true })
     .fontSize(18).text(`  Remisión ${remision.numero_folio}`, { align: 'right' });
  doc.fontSize(9).font('Helvetica').fillColor('#666')
     .text('Bitácora de servicios automotrices');
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.8);

  // Datos
  doc.fillColor('#000').fontSize(10);
  const linea = (k, v) => { doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v || '—'); };
  linea('Fecha', remision.fecha);
  linea('Cliente', ot.cliente_nombre);
  linea('Teléfono', ot.cliente_telefono);
  linea('Vehículo', [ot.placa, ot.marca, ot.modelo, ot.anio].filter(Boolean).join(' — '));
  linea('Orden de trabajo', `#${ot.id}`);
  linea('Forma de pago', remision.forma_pago);
  doc.moveDown(1);

  // Items
  doc.font('Helvetica-Bold').fontSize(10).text('Concepto', 50, doc.y, { continued: true }).text('Importe', { align: 'right' });
  doc.moveTo(50, doc.y + 2).lineTo(562, doc.y + 2).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  if (items.length > 0) {
    for (const it of items) {
      const desc = `${it.descripcion}${it.cantidad > 1 ? ` x${it.cantidad}` : ''}`;
      doc.text(desc, 50, doc.y, { continued: true, width: 512 }).text(fmt(it.subtotal_precio), { align: 'right' });
      doc.moveDown(0.3);
    }
  } else {
    doc.text('Servicio automotriz', 50, doc.y, { continued: true }).text(fmt(remision.total), { align: 'right' });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#ccc').stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).text('TOTAL', 50, doc.y, { continued: true }).text(fmt(remision.total), { align: 'right' });

  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica').fillColor('#666')
     .text('Gracias por su preferencia — AutoFix Querétaro', { align: 'center' });
  doc.end();
  return `/uploads/remisiones/${archivo}`;
}

// GET /api/ordenes/:id/remision — remisión de la orden (si existe)
router.get('/', (req, res) => {
  const rem = db.prepare('SELECT * FROM remisiones WHERE orden_id = ?').get(req.params.id);
  res.json({ data: rem || null });
});

// POST /api/ordenes/:id/remision — genera remisión + PDF (idempotente: si ya hay, la regresa)
router.post('/', (req, res) => {
  const ot = datosOrden(req.params.id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  const existente = db.prepare('SELECT * FROM remisiones WHERE orden_id = ?').get(ot.id);
  if (existente) return res.json({ data: existente });

  const { forma_pago } = req.body;
  if (!forma_pago) return res.status(400).json({ error: 'Forma de pago requerida' });

  const total = ot.precio_real || 0;
  const num = (db.prepare('SELECT COUNT(*) AS n FROM remisiones').get().n) + 1;
  const folio = `R-${String(num).padStart(4, '0')}`;
  const fecha = new Date().toISOString().slice(0, 10);

  const cot = db.prepare('SELECT id FROM cotizaciones WHERE orden_id = ?').get(ot.id);
  const items = cot ? db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?').all(cot.id) : [];

  const remision = { numero_folio: folio, fecha, total, forma_pago };
  const pdfPath = generarPdf(remision, ot, items);

  const r = db.prepare(
    'INSERT INTO remisiones (orden_id, numero_folio, fecha, total, forma_pago, pdf_path) VALUES (?,?,?,?,?,?)'
  ).run(ot.id, folio, fecha, total, forma_pago, pdfPath);
  db.prepare("UPDATE ordenes_trabajo SET forma_pago = ?, updated_at = datetime('now') WHERE id = ?")
    .run(forma_pago, ot.id);

  res.status(201).json({ data: db.prepare('SELECT * FROM remisiones WHERE id = ?').get(r.lastInsertRowid) });
});

// PUT /api/ordenes/:id/remision/pagar — remisión pagada → cierra orden (habilita orden de salida)
router.put('/pagar', (req, res) => {
  const rem = db.prepare('SELECT * FROM remisiones WHERE orden_id = ?').get(req.params.id);
  if (!rem) return res.status(404).json({ error: 'La orden no tiene remisión' });
  if (!rem.pagada) {
    db.prepare("UPDATE remisiones SET pagada = 1, fecha_pago = datetime('now') WHERE id = ?").run(rem.id);
    db.prepare("UPDATE ordenes_trabajo SET estatus = 'entregado', fecha_cierre = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(req.params.id);
  }
  res.json({ data: db.prepare('SELECT * FROM remisiones WHERE id = ?').get(rem.id) });
});

module.exports = router;
