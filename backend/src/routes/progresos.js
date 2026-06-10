const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM orden_progresos WHERE orden_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { descripcion } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'descripcion requerida' });
  const r = db.prepare(
    'INSERT INTO orden_progresos (orden_id, descripcion) VALUES (?, ?)'
  ).run(req.params.id, descripcion.trim());
  const row = db.prepare('SELECT * FROM orden_progresos WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ data: row });
});

router.delete('/:prog_id', (req, res) => {
  db.prepare('DELETE FROM orden_progresos WHERE id = ? AND orden_id = ?')
    .run(req.params.prog_id, req.params.id);
  res.status(204).end();
});

module.exports = router;
