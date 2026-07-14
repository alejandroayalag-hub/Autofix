const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM orden_checklist WHERE orden_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { descripcion } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'descripcion requerida' });
  const r = db.prepare(
    'INSERT INTO orden_checklist (orden_id, descripcion) VALUES (?, ?)'
  ).run(req.params.id, descripcion.trim());
  const row = db.prepare('SELECT * FROM orden_checklist WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ data: row });
});

// Marcar / desmarcar item
router.put('/:item_id', (req, res) => {
  const { hecho } = req.body;
  db.prepare('UPDATE orden_checklist SET hecho = ? WHERE id = ? AND orden_id = ?')
    .run(hecho ? 1 : 0, req.params.item_id, req.params.id);
  const row = db.prepare('SELECT * FROM orden_checklist WHERE id = ?').get(req.params.item_id);
  res.json({ data: row });
});

router.delete('/:item_id', (req, res) => {
  db.prepare('DELETE FROM orden_checklist WHERE id = ? AND orden_id = ?')
    .run(req.params.item_id, req.params.id);
  res.status(204).end();
});

module.exports = router;
