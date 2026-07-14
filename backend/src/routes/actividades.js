const router = require('express').Router();
const db = require('../db/database');

function conInsumos(act) {
  act.insumos = db.prepare(
    'SELECT * FROM catalogo_items WHERE actividad_id = ? AND activo = 1 ORDER BY orden, id'
  ).all(act.id);
  return act;
}

// GET /api/actividades — todas con insumos
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM actividades WHERE activo = 1 ORDER BY nombre').all();
  res.json({ data: rows.map(conInsumos) });
});

router.post('/', (req, res) => {
  const { nombre, descripcion, horas_mano_obra, tarifa_hora } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare(
    'INSERT INTO actividades (nombre, descripcion, horas_mano_obra, tarifa_hora) VALUES (?,?,?,?)'
  ).run(nombre.trim(), descripcion || null, parseFloat(horas_mano_obra) || 0, parseFloat(tarifa_hora) || 0);
  res.status(201).json({ data: conInsumos(db.prepare('SELECT * FROM actividades WHERE id=?').get(r.lastInsertRowid)) });
});

router.put('/:id', (req, res) => {
  const act = db.prepare('SELECT * FROM actividades WHERE id=?').get(req.params.id);
  if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });
  const { nombre, descripcion, horas_mano_obra, tarifa_hora } = req.body;
  db.prepare(
    'UPDATE actividades SET nombre=?, descripcion=?, horas_mano_obra=?, tarifa_hora=? WHERE id=?'
  ).run(
    nombre?.trim() || act.nombre,
    descripcion !== undefined ? descripcion : act.descripcion,
    horas_mano_obra !== undefined ? parseFloat(horas_mano_obra) || 0 : act.horas_mano_obra,
    tarifa_hora !== undefined ? parseFloat(tarifa_hora) || 0 : act.tarifa_hora,
    req.params.id,
  );
  res.json({ data: conInsumos(db.prepare('SELECT * FROM actividades WHERE id=?').get(req.params.id)) });
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE actividades SET activo = 0 WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM paquete_actividades WHERE actividad_id=?').run(req.params.id);
  res.status(204).end();
});

// ── Insumos de una actividad ──────────────────────────────────
router.post('/:id/insumos', (req, res) => {
  const { nombre, tipo, unidad, precio_unitario, costo_unitario, config_default } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const TIPOS = ['refaccion', 'consumible'];
  // tipo_servicio lleva el id de la actividad para no chocar con el índice único (tipo_servicio, nombre)
  const r = db.prepare(`
    INSERT INTO catalogo_items (tipo_servicio, actividad_id, nombre, tipo, unidad, precio_unitario, costo_unitario, config_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`act_${req.params.id}`, req.params.id, nombre.trim(), TIPOS.includes(tipo) ? tipo : 'refaccion',
    unidad || 'pza', parseFloat(precio_unitario) || 0, parseFloat(costo_unitario) || 0,
    parseFloat(config_default) || 1);
  res.status(201).json({ data: db.prepare('SELECT * FROM catalogo_items WHERE id=?').get(r.lastInsertRowid) });
});

router.put('/:id/insumos/:insumoId', (req, res) => {
  const it = db.prepare('SELECT * FROM catalogo_items WHERE id=? AND actividad_id=?').get(req.params.insumoId, req.params.id);
  if (!it) return res.status(404).json({ error: 'Insumo no encontrado' });
  const { nombre, tipo, unidad, precio_unitario, costo_unitario, config_default } = req.body;
  db.prepare(`
    UPDATE catalogo_items SET nombre=?, tipo=?, unidad=?, precio_unitario=?, costo_unitario=?, config_default=?
    WHERE id=?
  `).run(
    nombre?.trim() || it.nombre,
    tipo || it.tipo,
    unidad || it.unidad,
    precio_unitario !== undefined ? parseFloat(precio_unitario) || 0 : it.precio_unitario,
    costo_unitario !== undefined ? parseFloat(costo_unitario) || 0 : it.costo_unitario,
    config_default !== undefined ? parseFloat(config_default) || 1 : it.config_default,
    req.params.insumoId,
  );
  res.json({ data: db.prepare('SELECT * FROM catalogo_items WHERE id=?').get(req.params.insumoId) });
});

router.delete('/:id/insumos/:insumoId', (req, res) => {
  db.prepare('UPDATE catalogo_items SET activo = 0 WHERE id=? AND actividad_id=?').run(req.params.insumoId, req.params.id);
  res.status(204).end();
});

module.exports = router;
