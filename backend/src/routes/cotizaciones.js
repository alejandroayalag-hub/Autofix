const router = require('express').Router();
const db = require('../db/database');

const calcTotales = (items) => {
  const total_costo  = items.reduce((s, i) => s + (i.subtotal_costo  || 0), 0);
  const total_precio = items.reduce((s, i) => s + (i.subtotal_precio || 0), 0);
  return { total_costo, total_precio };
};

router.get('/', (req, res) => {
  const rows = db.prepare(
    `SELECT c.*, cl.nombre AS cliente_nombre_cat
     FROM cotizaciones c LEFT JOIN clientes cl ON cl.id = c.cliente_id
     ORDER BY c.id DESC`
  ).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const cotizacion = db.prepare(
    `SELECT c.*, cl.nombre AS cliente_nombre_cat
     FROM cotizaciones c LEFT JOIN clientes cl ON cl.id=c.cliente_id
     WHERE c.id=?`
  ).get(req.params.id);
  if (!cotizacion) return res.status(404).json({ error: 'No encontrada' });
  cotizacion.items = db.prepare(
    `SELECT ci.*, p.nombre AS paquete_nombre
     FROM cotizacion_items ci LEFT JOIN paquetes p ON p.id=ci.paquete_id
     WHERE ci.cotizacion_id=? ORDER BY ci.id`
  ).all(req.params.id);
  res.json(cotizacion);
});

router.post('/', (req, res) => {
  const d = req.body;
  const items = d.items || [];
  const { total_costo, total_precio } = calcTotales(items);
  const r = db.prepare(
    `INSERT INTO cotizaciones (auto_id, cliente_id, cliente_nombre, placa, marca, modelo, anio,
     fecha, estatus, total_costo, total_precio, notas)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(d.auto_id || null, d.cliente_id || null, d.cliente_nombre || null, d.placa || null,
    d.marca || null, d.modelo || null, d.anio || null,
    d.fecha || new Date().toISOString().slice(0,10),
    d.estatus || 'borrador', total_costo, total_precio, d.notas || null);

  const cotId = r.lastInsertRowid;
  const insItem = db.prepare(
    `INSERT INTO cotizacion_items
     (cotizacion_id, paquete_id, actividad, descripcion, cantidad, costo_unitario, precio_unitario, subtotal_costo, subtotal_precio)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  for (const it of items) {
    insItem.run(cotId, it.paquete_id || null, it.actividad || null, it.descripcion,
      it.cantidad || 1, it.costo_unitario || 0, it.precio_unitario || 0,
      it.subtotal_costo || 0, it.subtotal_precio || 0);
  }
  const cotizacion = db.prepare('SELECT * FROM cotizaciones WHERE id=?').get(cotId);
  cotizacion.items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id=?').all(cotId);
  res.status(201).json(cotizacion);
});

router.put('/:id', (req, res) => {
  const d = req.body;
  const items = d.items || [];
  const { total_costo, total_precio } = calcTotales(items);
  db.prepare(
    `UPDATE cotizaciones SET auto_id=?, cliente_id=?, cliente_nombre=?, placa=?, marca=?, modelo=?,
     anio=?, fecha=?, estatus=?, total_costo=?, total_precio=?, notas=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(d.auto_id || null, d.cliente_id || null, d.cliente_nombre || null, d.placa || null,
    d.marca || null, d.modelo || null, d.anio || null, d.fecha,
    d.estatus || 'borrador', total_costo, total_precio, d.notas || null, req.params.id);

  db.prepare('DELETE FROM cotizacion_items WHERE cotizacion_id=?').run(req.params.id);
  const insItem = db.prepare(
    `INSERT INTO cotizacion_items
     (cotizacion_id, paquete_id, actividad, descripcion, cantidad, costo_unitario, precio_unitario, subtotal_costo, subtotal_precio)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  for (const it of items) {
    insItem.run(req.params.id, it.paquete_id || null, it.actividad || null, it.descripcion,
      it.cantidad || 1, it.costo_unitario || 0, it.precio_unitario || 0,
      it.subtotal_costo || 0, it.subtotal_precio || 0);
  }
  const cotizacion = db.prepare('SELECT * FROM cotizaciones WHERE id=?').get(req.params.id);
  cotizacion.items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id=?').all(req.params.id);
  res.json(cotizacion);
});

// Convertir cotización a servicio
router.post('/:id/convertir', (req, res) => {
  const cot = db.prepare('SELECT * FROM cotizaciones WHERE id=?').get(req.params.id);
  if (!cot) return res.status(404).json({ error: 'No encontrada' });

  const items = db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id=?').all(cot.id);
  const tipoServicio = items.map(i => i.descripcion).join(' | ');
  const utilidad = (cot.total_precio || 0) - (cot.total_costo || 0);

  const r = db.prepare(
    `INSERT INTO servicios (placa, marca, modelo, anio, cliente_id, cliente_nombre,
     fecha, tipo_servicio, cotizacion, costo, precio, utilidad, notas)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(cot.placa, cot.marca, cot.modelo, cot.anio,
    cot.cliente_id, cot.cliente_nombre,
    cot.fecha, tipoServicio,
    cot.total_precio, cot.total_costo, null, utilidad,
    cot.notas);

  db.prepare(
    `UPDATE cotizaciones SET estatus='convertida', servicio_id=?, updated_at=datetime('now') WHERE id=?`
  ).run(r.lastInsertRowid, cot.id);

  res.json({ servicio_id: r.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cotizaciones WHERE id=?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
