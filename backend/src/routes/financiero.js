const router = require('express').Router();
const db = require('../db/database');

/* ─── GASTOS ─────────────────────────────────────────────────── */
router.get('/gastos', (req, res) => {
  const { desde, hasta } = req.query;
  let q = 'SELECT * FROM gastos';
  const p = [];
  if (desde && hasta) { q += ' WHERE fecha BETWEEN ? AND ?'; p.push(desde, hasta); }
  else if (desde)     { q += ' WHERE fecha >= ?'; p.push(desde); }
  else if (hasta)     { q += ' WHERE fecha <= ?'; p.push(hasta); }
  q += ' ORDER BY fecha DESC, id DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/gastos', (req, res) => {
  const d = req.body;
  if (!d.descripcion || !d.monto) return res.status(400).json({ error: 'Descripción y monto requeridos' });
  const r = db.prepare(
    `INSERT INTO gastos (fecha, categoria, descripcion, monto, proveedor, tiene_factura, notas)
     VALUES (?,?,?,?,?,?,?)`
  ).run(d.fecha || new Date().toISOString().slice(0,10),
    d.categoria || 'general', d.descripcion,
    parseFloat(d.monto), d.proveedor || null,
    d.tiene_factura ? 1 : 0, d.notas || null);
  res.status(201).json(db.prepare('SELECT * FROM gastos WHERE id=?').get(r.lastInsertRowid));
});

router.put('/gastos/:id', (req, res) => {
  const d = req.body;
  db.prepare(
    `UPDATE gastos SET fecha=?, categoria=?, descripcion=?, monto=?, proveedor=?,
     tiene_factura=?, notas=? WHERE id=?`
  ).run(d.fecha, d.categoria || 'general', d.descripcion,
    parseFloat(d.monto), d.proveedor || null,
    d.tiene_factura ? 1 : 0, d.notas || null, req.params.id);
  res.json(db.prepare('SELECT * FROM gastos WHERE id=?').get(req.params.id));
});

router.delete('/gastos/:id', (req, res) => {
  db.prepare('DELETE FROM gastos WHERE id=?').run(req.params.id);
  res.status(204).end();
});

/* ─── INGRESOS ───────────────────────────────────────────────── */
router.get('/ingresos', (req, res) => {
  const { desde, hasta } = req.query;
  let q = 'SELECT * FROM ingresos';
  const p = [];
  if (desde && hasta) { q += ' WHERE fecha BETWEEN ? AND ?'; p.push(desde, hasta); }
  else if (desde)     { q += ' WHERE fecha >= ?'; p.push(desde); }
  else if (hasta)     { q += ' WHERE fecha <= ?'; p.push(hasta); }
  q += ' ORDER BY fecha DESC, id DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/ingresos', (req, res) => {
  const d = req.body;
  if (!d.descripcion || !d.monto) return res.status(400).json({ error: 'Descripción y monto requeridos' });
  const r = db.prepare(
    `INSERT INTO ingresos (fecha, descripcion, monto, metodo_pago, servicio_id, notas)
     VALUES (?,?,?,?,?,?)`
  ).run(d.fecha || new Date().toISOString().slice(0,10),
    d.descripcion, parseFloat(d.monto),
    d.metodo_pago || 'efectivo', d.servicio_id || null, d.notas || null);
  res.status(201).json(db.prepare('SELECT * FROM ingresos WHERE id=?').get(r.lastInsertRowid));
});

router.put('/ingresos/:id', (req, res) => {
  const d = req.body;
  db.prepare(
    `UPDATE ingresos SET fecha=?, descripcion=?, monto=?, metodo_pago=?, servicio_id=?, notas=? WHERE id=?`
  ).run(d.fecha, d.descripcion, parseFloat(d.monto),
    d.metodo_pago || 'efectivo', d.servicio_id || null, d.notas || null, req.params.id);
  res.json(db.prepare('SELECT * FROM ingresos WHERE id=?').get(req.params.id));
});

router.delete('/ingresos/:id', (req, res) => {
  db.prepare('DELETE FROM ingresos WHERE id=?').run(req.params.id);
  res.status(204).end();
});

/* ─── FACTURAS ───────────────────────────────────────────────── */
router.get('/facturas', (req, res) => {
  res.json(db.prepare('SELECT * FROM facturas ORDER BY fecha DESC, id DESC').all());
});

router.post('/facturas', (req, res) => {
  const d = req.body;
  if (!d.concepto) return res.status(400).json({ error: 'Concepto requerido' });
  const subtotal = parseFloat(d.subtotal) || 0;
  const iva = parseFloat(d.iva) || 0;
  const total = d.total !== undefined ? parseFloat(d.total) : subtotal + iva;
  const r = db.prepare(
    `INSERT INTO facturas (fecha, numero, tipo, cliente_nombre, concepto, subtotal, iva, total, estatus, notas)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(d.fecha || new Date().toISOString().slice(0,10),
    d.numero || null, d.tipo || 'ingreso',
    d.cliente_nombre || null, d.concepto,
    subtotal, iva, total, d.estatus || 'pendiente', d.notas || null);
  res.status(201).json(db.prepare('SELECT * FROM facturas WHERE id=?').get(r.lastInsertRowid));
});

router.put('/facturas/:id', (req, res) => {
  const d = req.body;
  const subtotal = parseFloat(d.subtotal) || 0;
  const iva = parseFloat(d.iva) || 0;
  const total = d.total !== undefined ? parseFloat(d.total) : subtotal + iva;
  db.prepare(
    `UPDATE facturas SET fecha=?, numero=?, tipo=?, cliente_nombre=?, concepto=?,
     subtotal=?, iva=?, total=?, estatus=?, notas=? WHERE id=?`
  ).run(d.fecha, d.numero || null, d.tipo || 'ingreso',
    d.cliente_nombre || null, d.concepto,
    subtotal, iva, total, d.estatus || 'pendiente', d.notas || null, req.params.id);
  res.json(db.prepare('SELECT * FROM facturas WHERE id=?').get(req.params.id));
});

router.delete('/facturas/:id', (req, res) => {
  db.prepare('DELETE FROM facturas WHERE id=?').run(req.params.id);
  res.status(204).end();
});

/* ─── RESUMEN / DASHBOARD ────────────────────────────────────── */
router.get('/resumen', (req, res) => {
  const { desde, hasta } = req.query;
  let whereS = '';
  const args = [];
  if (desde && hasta) { whereS = 'WHERE fecha BETWEEN ? AND ?'; args.push(desde, hasta); }
  else if (desde)     { whereS = 'WHERE fecha >= ?'; args.push(desde); }
  else if (hasta)     { whereS = 'WHERE fecha <= ?'; args.push(hasta); }

  const ingresos_servicios = db.prepare(
    `SELECT COALESCE(SUM(precio),0) AS total FROM servicios ${whereS}`
  ).get(...args).total;

  const ingresos_manuales = db.prepare(
    `SELECT COALESCE(SUM(monto),0) AS total FROM ingresos ${whereS}`
  ).get(...args).total;

  const total_gastos = db.prepare(
    `SELECT COALESCE(SUM(monto),0) AS total FROM gastos ${whereS}`
  ).get(...args).total;

  const costo_servicios = db.prepare(
    `SELECT COALESCE(SUM(costo),0) AS total FROM servicios ${whereS}`
  ).get(...args).total;

  const total_ingresos = ingresos_servicios + ingresos_manuales;
  const ganancia_bruta = total_ingresos - costo_servicios;
  const ganancia_neta  = ganancia_bruta - total_gastos;

  const gastos_por_categoria = db.prepare(
    `SELECT categoria, COALESCE(SUM(monto),0) AS total FROM gastos ${whereS} GROUP BY categoria ORDER BY total DESC`
  ).all(...args);

  const servicios_por_mes = db.prepare(
    `SELECT strftime('%Y-%m', fecha) AS mes,
            COUNT(*) AS qty,
            COALESCE(SUM(precio),0) AS ingresos,
            COALESCE(SUM(costo),0)  AS costos,
            COALESCE(SUM(utilidad),0) AS utilidad
     FROM servicios ${whereS} GROUP BY mes ORDER BY mes DESC LIMIT 12`
  ).all(...args);

  res.json({
    ingresos_servicios,
    ingresos_manuales,
    total_ingresos,
    costo_servicios,
    total_gastos,
    ganancia_bruta,
    ganancia_neta,
    gastos_por_categoria,
    servicios_por_mes,
  });
});

module.exports = router;
