const router = require('express').Router();
const db = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/autos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo imágenes'));
  }
});

const FOTO_FIELDS = [
  { name: 'foto_vin', maxCount: 1 },
  { name: 'foto_frente', maxCount: 1 },
  { name: 'foto_lateral_der', maxCount: 1 },
  { name: 'foto_lateral_izq', maxCount: 1 },
  { name: 'foto_trasero', maxCount: 1 },
  { name: 'fotos_danos', maxCount: 5 },
];

// Helper: normalizar rutas de foto para devolver URLs relativas consistentes
function normFoto(val) {
  if (!val) return null;
  if (val.startsWith('/')) return val;
  return `/uploads/autos/${val}`;
}

// Eliminar archivo de disco de forma segura
function borrarArchivo(relPath) {
  if (!relPath) return;
  const abs = path.join(__dirname, '../..', relPath);
  fs.unlink(abs, () => {}); // ignorar errores
}

// Enriquecer un registro de auto con URLs de fotos normalizadas
function enriquecerFotos(auto) {
  if (!auto) return auto;
  const camposFoto = ['foto_vin', 'foto_frente', 'foto_lateral_der', 'foto_lateral_izq', 'foto_trasero'];
  const result = { ...auto };
  camposFoto.forEach(k => { result[k] = normFoto(auto[k]); });
  // fotos_danos es JSON de array
  if (auto.fotos_danos) {
    try {
      const arr = JSON.parse(auto.fotos_danos);
      result.fotos_danos = JSON.stringify(arr.map(normFoto));
    } catch { /* mantener valor original */ }
  }
  return result;
}

// GET /api/autos — lista todos los autos con cliente_nombre
router.get('/', (req, res) => {
  const autos = db.prepare(`
    SELECT a.*, c.nombre AS cliente_nombre
    FROM autos a
    LEFT JOIN clientes c ON c.id = a.cliente_id
    ORDER BY a.id DESC
  `).all();
  res.json({ data: autos.map(enriquecerFotos) });
});

// GET /api/autos/:id — un auto con cliente_nombre
router.get('/:id', (req, res) => {
  const auto = db.prepare(`
    SELECT a.*, c.nombre AS cliente_nombre
    FROM autos a
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!auto) return res.status(404).json({ error: 'Auto no encontrado' });
  res.json({ data: enriquecerFotos(auto) });
});

// POST /api/autos — crear auto
router.post('/', upload.fields(FOTO_FIELDS), (req, res) => {
  const { cliente_id, placa, marca, modelo, anio, motor, vin, color, notas, notas_danos } = req.body;
  if (!placa) return res.status(400).json({ error: 'Placa requerida' });
  if (!cliente_id) return res.status(400).json({ error: 'Cliente requerido — todo auto pertenece a un cliente' });
  const placaNorm = placa.toUpperCase().trim();

  const files = req.files || {};

  // Fotos individuales
  const fotoVin        = files.foto_vin        ? `/uploads/autos/${files.foto_vin[0].filename}`        : null;
  const fotoFrente     = files.foto_frente     ? `/uploads/autos/${files.foto_frente[0].filename}`     : null;
  const fotoLateralDer = files.foto_lateral_der ? `/uploads/autos/${files.foto_lateral_der[0].filename}` : null;
  const fotoLateralIzq = files.foto_lateral_izq ? `/uploads/autos/${files.foto_lateral_izq[0].filename}` : null;
  const fotoTrasero    = files.foto_trasero    ? `/uploads/autos/${files.foto_trasero[0].filename}`    : null;

  // Fotos de daños (array)
  const fotosDanos = files.fotos_danos && files.fotos_danos.length > 0
    ? JSON.stringify(files.fotos_danos.map(f => `/uploads/autos/${f.filename}`))
    : null;

  const result = db.prepare(`
    INSERT INTO autos
      (cliente_id, placa, marca, modelo, anio, motor, vin, color, notas,
       foto_vin, foto_frente, foto_lateral_der, foto_lateral_izq, foto_trasero,
       fotos_danos, notas_danos)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cliente_id || null,
    placaNorm,
    marca || null,
    modelo || null,
    anio || null,
    motor || null,
    vin || null,
    color || null,
    notas || null,
    fotoVin,
    fotoFrente,
    fotoLateralDer,
    fotoLateralIzq,
    fotoTrasero,
    fotosDanos,
    notas_danos || null
  );

  const auto = db.prepare(`
    SELECT a.*, c.nombre AS cliente_nombre
    FROM autos a
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ data: enriquecerFotos(auto) });
});

// PUT /api/autos/:id — actualizar auto
router.put('/:id', upload.fields(FOTO_FIELDS), (req, res) => {
  const existing = db.prepare(`
    SELECT a.*, c.nombre AS cliente_nombre
    FROM autos a
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Auto no encontrado' });

  const { cliente_id, placa, marca, modelo, anio, motor, vin, color, notas, notas_danos } = req.body;
  const clienteFinal = cliente_id !== undefined ? cliente_id : existing.cliente_id;
  if (!clienteFinal) return res.status(400).json({ error: 'Cliente requerido — todo auto pertenece a un cliente' });
  const placaNorm = placa ? placa.toUpperCase().trim() : existing.placa;
  const files = req.files || {};

  // Helper: si hay archivo nuevo, borrar el viejo y retornar nueva ruta; si no, conservar la existente
  function resolverFoto(fieldName, existingVal) {
    if (files[fieldName] && files[fieldName].length > 0) {
      if (existingVal) borrarArchivo(existingVal);
      return `/uploads/autos/${files[fieldName][0].filename}`;
    }
    return existingVal;
  }

  const fotoVin        = resolverFoto('foto_vin',        existing.foto_vin);
  const fotoFrente     = resolverFoto('foto_frente',     existing.foto_frente);
  const fotoLateralDer = resolverFoto('foto_lateral_der', existing.foto_lateral_der);
  const fotoLateralIzq = resolverFoto('foto_lateral_izq', existing.foto_lateral_izq);
  const fotoTrasero    = resolverFoto('foto_trasero',    existing.foto_trasero);

  // Fotos de daños: si hay nuevas, se AGREGAN (o se reemplazan si el body incluye
  // el campo 'limpiar_fotos_danos'). Aquí simplemente usamos las nuevas si se suben.
  let fotosDanos = existing.fotos_danos;
  if (files.fotos_danos && files.fotos_danos.length > 0) {
    // Borrar viejas si existían
    if (existing.fotos_danos) {
      try {
        JSON.parse(existing.fotos_danos).forEach(borrarArchivo);
      } catch {}
    }
    fotosDanos = JSON.stringify(files.fotos_danos.map(f => `/uploads/autos/${f.filename}`));
  }

  db.prepare(`
    UPDATE autos
    SET cliente_id=?, placa=?, marca=?, modelo=?, anio=?,
        motor=?, vin=?, color=?, notas=?,
        foto_vin=?, foto_frente=?, foto_lateral_der=?, foto_lateral_izq=?, foto_trasero=?,
        fotos_danos=?, notas_danos=?
    WHERE id=?
  `).run(
    cliente_id !== undefined ? (cliente_id || null) : existing.cliente_id,
    placaNorm,
    marca !== undefined ? (marca || null) : existing.marca,
    modelo !== undefined ? (modelo || null) : existing.modelo,
    anio !== undefined ? (anio || null) : existing.anio,
    motor !== undefined ? (motor || null) : existing.motor,
    vin !== undefined ? (vin || null) : existing.vin,
    color !== undefined ? (color || null) : existing.color,
    notas !== undefined ? (notas || null) : existing.notas,
    fotoVin,
    fotoFrente,
    fotoLateralDer,
    fotoLateralIzq,
    fotoTrasero,
    fotosDanos,
    notas_danos !== undefined ? (notas_danos || null) : existing.notas_danos,
    req.params.id
  );

  const auto = db.prepare(`
    SELECT a.*, c.nombre AS cliente_nombre
    FROM autos a
    LEFT JOIN clientes c ON c.id = a.cliente_id
    WHERE a.id = ?
  `).get(req.params.id);
  res.json({ data: enriquecerFotos(auto) });
});

// DELETE /api/autos/:id — eliminar auto
router.delete('/:id', (req, res) => {
  // Borrar fotos asociadas antes de eliminar el registro
  const auto = db.prepare('SELECT * FROM autos WHERE id = ?').get(req.params.id);
  if (!auto) return res.status(404).json({ error: 'Auto no encontrado' });

  ['foto_vin', 'foto_frente', 'foto_lateral_der', 'foto_lateral_izq', 'foto_trasero'].forEach(k => {
    borrarArchivo(auto[k]);
  });
  if (auto.fotos_danos) {
    try { JSON.parse(auto.fotos_danos).forEach(borrarArchivo); } catch {}
  }

  const info = db.prepare('DELETE FROM autos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Auto no encontrado' });
  res.status(204).end();
});

module.exports = router;
