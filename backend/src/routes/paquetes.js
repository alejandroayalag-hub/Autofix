const router = require('express').Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const solo = req.query.activos === '1';
  const rows = db.prepare(
    `SELECT * FROM paquetes ${solo ? 'WHERE activo=1' : ''} ORDER BY categoria, nombre`
  ).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nombre, categoria, descripcion, precio_lista, costo_estimado } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare(
    `INSERT INTO paquetes (nombre, categoria, descripcion, precio_lista, costo_estimado)
     VALUES (?,?,?,?,?)`
  ).run(nombre, categoria || 'general', descripcion || null,
    parseFloat(precio_lista) || null, parseFloat(costo_estimado) || null);
  res.status(201).json(db.prepare('SELECT * FROM paquetes WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { nombre, categoria, descripcion, precio_lista, costo_estimado, activo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const info = db.prepare(
    `UPDATE paquetes SET nombre=?, categoria=?, descripcion=?, precio_lista=?,
     costo_estimado=?, activo=? WHERE id=?`
  ).run(nombre, categoria, descripcion || null,
    parseFloat(precio_lista) || null, parseFloat(costo_estimado) || null,
    activo !== undefined ? activo : 1, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(db.prepare('SELECT * FROM paquetes WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM paquetes WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
