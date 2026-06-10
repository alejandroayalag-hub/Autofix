const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM orden_gastos WHERE orden_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  const total = rows.reduce((s, r) => s + r.monto, 0);
  res.json({ data: rows, total });
});

router.post('/', (req, res) => {
  const { descripcion, monto, tipo = 'otro' } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'descripcion requerida' });
  if (monto === undefined || isNaN(Number(monto))) return res.status(400).json({ error: 'monto requerido' });
  const TIPOS = ['refaccion', 'mano_obra', 'otro'];
  const tipoVal = TIPOS.includes(tipo) ? tipo : 'otro';
  const r = db.prepare(
    'INSERT INTO orden_gastos (orden_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, descripcion.trim(), Number(monto), tipoVal);
  const row = db.prepare('SELECT * FROM orden_gastos WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ data: row });
});

router.delete('/:gasto_id', (req, res) => {
  db.prepare('DELETE FROM orden_gastos WHERE id = ? AND orden_id = ?')
    .run(req.params.gasto_id, req.params.id);
  res.status(204).end();
});

module.exports = router;
