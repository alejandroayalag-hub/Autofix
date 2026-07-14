const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');

// ── Multer para CSF PDF ───────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/clientes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `${Date.now()}-csf${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo archivos PDF'));
  },
});

// ── Campos de texto ───────────────────────────────────────────────
const CAMPOS = [
  'nombre','telefono','email','notas',
  'rfc','razon_social','calle_numero','colonia','codigo_postal',
  'correo_facturacion','regimen_fiscal','nombre_contacto','telefono_contacto',
];

const pickCampos = body => {
  const obj = {};
  CAMPOS.forEach(k => { obj[k] = body[k] || null; });
  return obj;
};

// ── GET / ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nombre').all();
  res.json(clientes);
});

// ── POST / ────────────────────────────────────────────────────────
router.post('/', upload.single('csf_pdf'), (req, res) => {
  const { nombre, ...rest } = pickCampos(req.body);
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  const csf_pdf = req.file ? `/uploads/clientes/${req.file.filename}` : null;
  const result = db.prepare(`
    INSERT INTO clientes
      (nombre, telefono, email, notas, rfc, razon_social, calle_numero, colonia,
       codigo_postal, correo_facturacion, regimen_fiscal, nombre_contacto, telefono_contacto, csf_pdf)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    nombre, rest.telefono, rest.email, rest.notas,
    rest.rfc, rest.razon_social, rest.calle_numero, rest.colonia,
    rest.codigo_postal, rest.correo_facturacion, rest.regimen_fiscal,
    rest.nombre_contacto, rest.telefono_contacto, csf_pdf
  );
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cliente);
});

// ── PUT /:id ──────────────────────────────────────────────────────
router.put('/:id', upload.single('csf_pdf'), (req, res) => {
  const { nombre, ...rest } = pickCampos(req.body);
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  // Si llega PDF nuevo, borrar el anterior
  let csf_pdf = req.body.csf_pdf_existing || null;
  if (req.file) {
    const anterior = db.prepare('SELECT csf_pdf FROM clientes WHERE id = ?').get(req.params.id);
    if (anterior?.csf_pdf) {
      const oldPath = path.join(__dirname, '../../', anterior.csf_pdf);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    csf_pdf = `/uploads/clientes/${req.file.filename}`;
  }

  const info = db.prepare(`
    UPDATE clientes SET
      nombre=?, telefono=?, email=?, notas=?,
      rfc=?, razon_social=?, calle_numero=?, colonia=?,
      codigo_postal=?, correo_facturacion=?, regimen_fiscal=?,
      nombre_contacto=?, telefono_contacto=?, csf_pdf=?
    WHERE id=?
  `).run(
    nombre, rest.telefono, rest.email, rest.notas,
    rest.rfc, rest.razon_social, rest.calle_numero, rest.colonia,
    rest.codigo_postal, rest.correo_facturacion, rest.regimen_fiscal,
    rest.nombre_contacto, rest.telefono_contacto, csf_pdf,
    req.params.id
  );
  if (info.changes === 0) return res.status(404).json({ error: 'No encontrado' });
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  res.json(cliente);
});

// ── DELETE /:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const c = db.prepare('SELECT csf_pdf FROM clientes WHERE id = ?').get(req.params.id);
  if (c?.csf_pdf) {
    const p = path.join(__dirname, '../../', c.csf_pdf);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM clientes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
