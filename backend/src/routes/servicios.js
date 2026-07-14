const router = require('express').Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { q, desde, hasta } = req.query;
  let sql = `
    SELECT s.*, c.nombre AS cliente_nombre_cat
    FROM servicios s
    LEFT JOIN clientes c ON c.id = s.cliente_id
    WHERE 1=1
  `;
  const params = [];
  if (q) {
    sql += ` AND (s.placa LIKE ? OR s.cliente_nombre LIKE ? OR c.nombre LIKE ? OR s.tipo_servicio LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (desde) { sql += ` AND s.fecha >= ?`; params.push(desde); }
  if (hasta) { sql += ` AND s.fecha <= ?`; params.push(hasta); }
  sql += ` ORDER BY s.id DESC`;
  const servicios = db.prepare(sql).all(...params);
  res.json(servicios);
});

router.get('/resumen', (req, res) => {
  const row = db.prepare(`
    SELECT
      COUNT(*) AS total_servicios,
      COALESCE(SUM(cotizacion), 0) AS total_cotizacion,
      COALESCE(SUM(costo), 0)      AS total_costo,
      COALESCE(SUM(precio), 0)     AS total_precio,
      COALESCE(SUM(utilidad), 0)   AS total_utilidad
    FROM servicios
  `).get();
  res.json(row);
});

router.get('/:id', (req, res) => {
  const s = db.prepare(`
    SELECT s.*, c.nombre AS cliente_nombre_cat
    FROM servicios s LEFT JOIN clientes c ON c.id = s.cliente_id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!s) return res.status(404).json({ error: 'No encontrado' });
  res.json(s);
});

router.post('/', (req, res) => {
  const d = req.body;
  const utilidad = (parseFloat(d.precio) || 0) - (parseFloat(d.costo) || 0);
  const result = db.prepare(`
    INSERT INTO servicios
      (placa, marca, modelo, anio, motor, vin, cliente_id, cliente_nombre,
       odometro, fecha, tipo_servicio, cotizacion, costo, precio, utilidad, notas)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    d.placa, d.marca || null, d.modelo || null, d.anio || null,
    d.motor || null, d.vin || null,
    d.cliente_id || null, d.cliente_nombre || null,
    d.odometro || null, d.fecha || new Date().toISOString().slice(0, 10),
    d.tipo_servicio || null,
    parseFloat(d.cotizacion) || null, parseFloat(d.costo) || null,
    parseFloat(d.precio) || null, utilidad ?? null,
    d.notas || null
  );
  const servicio = db.prepare('SELECT * FROM servicios WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(servicio);
});

router.put('/:id', (req, res) => {
  const d = req.body;
  const utilidad = (parseFloat(d.precio) || 0) - (parseFloat(d.costo) || 0);
  db.prepare(`
    UPDATE servicios SET
      placa=?, marca=?, modelo=?, anio=?, motor=?, vin=?,
      cliente_id=?, cliente_nombre=?, odometro=?, fecha=?,
      tipo_servicio=?, cotizacion=?, costo=?, precio=?, utilidad=?,
      notas=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    d.placa, d.marca || null, d.modelo || null, d.anio || null,
    d.motor || null, d.vin || null,
    d.cliente_id || null, d.cliente_nombre || null,
    d.odometro || null, d.fecha,
    d.tipo_servicio || null,
    parseFloat(d.cotizacion) || null, parseFloat(d.costo) || null,
    parseFloat(d.precio) || null, utilidad ?? null,
    d.notas || null, req.params.id
  );
  const servicio = db.prepare('SELECT * FROM servicios WHERE id = ?').get(req.params.id);
  if (!servicio) return res.status(404).json({ error: 'No encontrado' });
  res.json(servicio);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM servicios WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
