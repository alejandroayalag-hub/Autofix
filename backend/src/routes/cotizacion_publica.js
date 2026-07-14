const router = require('express').Router();
const db = require('../db/database');

// ─── GET /c/:token ────────────────────────────────────────────────────────────
router.get('/:token', (req, res) => {
  const cotizacion = db.prepare(`
    SELECT c.*,
           cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
           a.placa, a.marca, a.modelo, a.anio
    FROM cotizaciones c
    LEFT JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN ordenes_trabajo ot ON ot.id = c.orden_id
    LEFT JOIN autos a ON a.id = ot.auto_id
    WHERE c.token = ?
  `).get(req.params.token);

  if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

  const items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ? ORDER BY id').all(cotizacion.id);
  const total = items.reduce((s, i) => s + (i.subtotal_precio || i.precio_unitario || 0), 0);

  res.json({
    data: {
      ...cotizacion,
      items,
      total,
    },
  });
});

// ─── POST /c/:token/aprobar ───────────────────────────────────────────────────
router.post('/:token/aprobar', (req, res) => {
  const cotizacion = db.prepare('SELECT * FROM cotizaciones WHERE token = ?').get(req.params.token);
  if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

  if (cotizacion.estatus !== 'enviada') {
    return res.status(400).json({ error: 'Esta cotización ya fue procesada' });
  }

  db.prepare(
    `UPDATE cotizaciones SET estatus = 'aprobada', updated_at = datetime('now') WHERE id = ?`
  ).run(cotizacion.id);

  if (cotizacion.orden_id) {
    db.prepare(
      `UPDATE ordenes_trabajo SET estatus = 'aprobada', updated_at = datetime('now') WHERE id = ?`
    ).run(cotizacion.orden_id);
  }

  res.json({ data: { ok: true, estatus: 'aprobada' } });
});

// ─── POST /c/:token/rechazar ──────────────────────────────────────────────────
router.post('/:token/rechazar', (req, res) => {
  const { motivo } = req.body || {};
  if (!motivo) return res.status(400).json({ error: 'motivo es requerido' });

  const cotizacion = db.prepare('SELECT * FROM cotizaciones WHERE token = ?').get(req.params.token);
  if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

  if (cotizacion.estatus !== 'enviada') {
    return res.status(400).json({ error: 'Esta cotización ya fue procesada' });
  }

  db.prepare(
    `UPDATE cotizaciones SET estatus = 'rechazada', notas = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(motivo, cotizacion.id);

  if (cotizacion.orden_id) {
    db.prepare(
      `UPDATE ordenes_trabajo SET estatus = 'rechazada', updated_at = datetime('now') WHERE id = ?`
    ).run(cotizacion.orden_id);
  }

  res.json({ data: { ok: true, estatus: 'rechazada' } });
});

module.exports = router;
