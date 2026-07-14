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
  db.prepare('DELETE FROM paquete_actividades WHERE paquete_id=?').run(req.params.id);
  res.status(204).end();
});

// ── Paquetes compuestos (3 niveles) ───────────────────────────

function arbolPaquete(id) {
  const paq = db.prepare('SELECT * FROM paquetes WHERE id=?').get(id);
  if (!paq) return null;
  paq.actividades = db.prepare(`
    SELECT a.*, pa.orden AS orden_paquete
    FROM paquete_actividades pa
    JOIN actividades a ON a.id = pa.actividad_id
    WHERE pa.paquete_id = ? AND a.activo = 1
    ORDER BY pa.orden, pa.id
  `).all(id);
  const insumosDe = db.prepare(
    'SELECT * FROM catalogo_items WHERE actividad_id = ? AND activo = 1 ORDER BY orden, id'
  );
  paq.actividades.forEach(a => { a.insumos = insumosDe.all(a.id); });
  return paq;
}

// GET /api/paquetes/compuestos — lista con conteo de actividades
router.get('/compuestos', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, COUNT(pa.id) AS num_actividades
    FROM paquetes p
    LEFT JOIN paquete_actividades pa ON pa.paquete_id = p.id
    WHERE p.es_compuesto = 1 AND p.activo = 1
    GROUP BY p.id ORDER BY p.nombre
  `).all();
  res.json({ data: rows });
});

// GET /api/paquetes/:id/arbol — paquete con actividades e insumos (para el cotizador)
router.get('/:id/arbol', (req, res) => {
  const paq = arbolPaquete(req.params.id);
  if (!paq) return res.status(404).json({ error: 'Paquete no encontrado' });
  res.json({ data: paq });
});

// POST /api/paquetes/compuestos — nuevo paquete de 3 niveles
router.post('/compuestos', (req, res) => {
  const { nombre, categoria, descripcion, actividades = [] } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  const r = db.prepare(
    'INSERT INTO paquetes (nombre, categoria, descripcion, es_compuesto) VALUES (?,?,?,1)'
  ).run(nombre.trim(), categoria || 'mantenimiento', descripcion || null);
  const ins = db.prepare('INSERT INTO paquete_actividades (paquete_id, actividad_id, orden) VALUES (?,?,?)');
  actividades.forEach((aid, i) => ins.run(r.lastInsertRowid, aid, i));
  res.status(201).json({ data: arbolPaquete(r.lastInsertRowid) });
});

// PUT /api/paquetes/:id/actividades — reemplaza el armado del paquete
router.put('/:id/actividades', (req, res) => {
  const paq = db.prepare('SELECT * FROM paquetes WHERE id=?').get(req.params.id);
  if (!paq) return res.status(404).json({ error: 'Paquete no encontrado' });
  const { actividades = [] } = req.body;
  db.prepare('DELETE FROM paquete_actividades WHERE paquete_id=?').run(req.params.id);
  const ins = db.prepare('INSERT INTO paquete_actividades (paquete_id, actividad_id, orden) VALUES (?,?,?)');
  actividades.forEach((aid, i) => ins.run(req.params.id, aid, i));
  res.json({ data: arbolPaquete(req.params.id) });
});

module.exports = router;
