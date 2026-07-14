const router = require('express').Router();
const db = require('../db/database');

const TIPOS = ['cambio_aceite', 'afinacion', 'frenos', 'escaneo', 'reparacion'];

// GET /catalogo → todos los ítems agrupados
router.get('/', (req, res) => {
  const items = db.prepare(
    'SELECT * FROM catalogo_items ORDER BY tipo_servicio, orden, id'
  ).all();
  res.json(items);
});

// GET /catalogo/:tipo → ítems de un servicio
router.get('/:tipo', (req, res) => {
  if (!TIPOS.includes(req.params.tipo)) return res.status(400).json({ error: 'Tipo inválido' });
  const items = db.prepare(
    'SELECT * FROM catalogo_items WHERE tipo_servicio = ? ORDER BY orden, id'
  ).all(req.params.tipo);
  res.json(items);
});

// POST /catalogo → nuevo ítem
router.post('/', (req, res) => {
  const { tipo_servicio, nombre, descripcion, es_opcional, configurable,
          config_min, config_max, config_default, unidad,
          precio_unitario, costo_unitario, orden } = req.body;
  if (!tipo_servicio || !nombre) return res.status(400).json({ error: 'tipo_servicio y nombre son requeridos' });

  const r = db.prepare(`
    INSERT INTO catalogo_items
      (tipo_servicio, nombre, descripcion, es_opcional, configurable,
       config_min, config_max, config_default, unidad,
       precio_unitario, costo_unitario, orden, activo)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)
  `).run(
    tipo_servicio, nombre, descripcion || null,
    es_opcional ? 1 : 0,
    configurable || null,
    config_min ?? null, config_max ?? null, config_default ?? null,
    unidad || null,
    parseFloat(precio_unitario) || 0,
    parseFloat(costo_unitario)  || 0,
    parseInt(orden) || 99
  );
  res.status(201).json(db.prepare('SELECT * FROM catalogo_items WHERE id = ?').get(r.lastInsertRowid));
});

// PUT /catalogo/:id → editar ítem
router.put('/:id', (req, res) => {
  const { nombre, descripcion, es_opcional, configurable,
          config_min, config_max, config_default, unidad,
          precio_unitario, costo_unitario, orden, activo } = req.body;

  const info = db.prepare(`
    UPDATE catalogo_items SET
      nombre=?, descripcion=?, es_opcional=?, configurable=?,
      config_min=?, config_max=?, config_default=?, unidad=?,
      precio_unitario=?, costo_unitario=?, orden=?, activo=?
    WHERE id=?
  `).run(
    nombre, descripcion || null,
    es_opcional ? 1 : 0,
    configurable || null,
    config_min ?? null, config_max ?? null, config_default ?? null,
    unidad || null,
    parseFloat(precio_unitario) || 0,
    parseFloat(costo_unitario)  || 0,
    parseInt(orden) || 0,
    activo !== undefined ? (activo ? 1 : 0) : 1,
    req.params.id
  );
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  res.json(db.prepare('SELECT * FROM catalogo_items WHERE id = ?').get(req.params.id));
});

// DELETE /catalogo/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM catalogo_items WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
