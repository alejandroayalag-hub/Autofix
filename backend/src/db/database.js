const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.env.DB_PATH || './autofix.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    usuario       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    telefono   TEXT,
    email      TEXT,
    notas      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS servicios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    placa          TEXT NOT NULL,
    marca          TEXT,
    modelo         TEXT,
    anio           INTEGER,
    motor          TEXT,
    vin            TEXT,
    cliente_id     INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nombre TEXT,
    odometro       INTEGER,
    fecha          TEXT NOT NULL DEFAULT (date('now')),
    tipo_servicio  TEXT,
    cotizacion     REAL,
    costo          REAL,
    precio         REAL,
    utilidad       REAL,
    notas          TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migración 002
const sql002 = fs.readFileSync(path.join(__dirname, 'migrations', '002_modulos.sql'), 'utf8');
db.exec(sql002);

// Migración 003 — Órdenes de Trabajo
const sql003 = fs.readFileSync(path.join(__dirname, 'migrations', '003_ordenes_trabajo.sql'), 'utf8');
db.exec(sql003);

// Migración 004 — Fotos de autos
const sql004Stmts = fs.readFileSync(path.join(__dirname, 'migrations', '004_autos_fotos.sql'), 'utf8')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);
sql004Stmts.forEach((stmt) => {
  try {
    db.exec(stmt);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
});

// Columnas nuevas en cotizaciones (ALTER TABLE idempotente)
// SQLite no permite ADD COLUMN con UNIQUE; el índice se crea por separado.
[
  'ALTER TABLE cotizaciones ADD COLUMN orden_id INTEGER REFERENCES ordenes_trabajo(id) ON DELETE SET NULL',
  'ALTER TABLE cotizaciones ADD COLUMN token TEXT',
].forEach((stmt) => {
  try {
    db.exec(stmt);
  } catch (e) {
    // La columna ya existe — ignorar
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

// Índice único para cotizaciones.token (idempotente)
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cotizaciones_token ON cotizaciones(token) WHERE token IS NOT NULL');

// Migración 005 — Campos fiscales en clientes
const sql005 = fs.readFileSync(path.join(__dirname, 'migrations', '005_clientes_fiscal.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql005.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name')) throw e;
  }
});

// Migración 006 — Catálogo estructurado de servicios
const sql006 = fs.readFileSync(path.join(__dirname, 'migrations', '006_catalogo_servicios.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql006.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('already exists') && !e.message.includes('UNIQUE')) throw e;
  }
});

// Migración 007 — Flujo diagnóstico de frenos
const sql007 = fs.readFileSync(path.join(__dirname, 'migrations', '007_frenos_flujo.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql007.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('already exists')) throw e;
  }
});

// Migración 008 — tipo_servicio en órdenes + diagnóstico de frenos
const sql008 = fs.readFileSync(path.join(__dirname, 'migrations', '008_tipo_servicio_frenos.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql008.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) throw e;
  }
});

// Migración de datos: servicios → ordenes_trabajo
const { migrarServicios } = require('./migrate_servicios');
migrarServicios(db);

// Crear usuario JAYALA si no existe
const existe = db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get('JAYALA');
if (!existe) {
  const hash = bcrypt.hashSync('Autofix2026!', 10);
  db.prepare(
    'INSERT INTO usuarios (nombre, usuario, password_hash) VALUES (?, ?, ?)'
  ).run('Juan', 'JAYALA', hash);
  console.log('Usuario JAYALA creado — contraseña: Autofix2026!');
}

// Migración 009 — Pipeline + 3 flujos
const sql009 = fs.readFileSync(path.join(__dirname, 'migrations', '009_pipeline_3_flujos.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql009.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) throw e;
  }
});

// Migración 010 — flujo completo (auto_id en cotizaciones, checklist, pago remisión)
const sql010 = fs.readFileSync(path.join(__dirname, 'migrations', '010_flujo_completo.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql010.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) throw e;
  }
});

// Migración 011 — paquete → actividades → insumos
const sql011 = fs.readFileSync(path.join(__dirname, 'migrations', '011_paquetes_actividades.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql011.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) throw e;
  }
});

// Datos 011: convertir tipo_servicio existentes en actividades y ligar insumos
if (db.prepare('SELECT COUNT(*) n FROM actividades').get().n === 0) {
  const NOMBRES = {
    cambio_aceite: 'Cambio de aceite', afinacion: 'Afinación',
    escaneo: 'Escaneo / Diagnóstico', frenos: 'Frenos', reparacion: 'Reparación',
  };
  const tipos = db.prepare('SELECT DISTINCT tipo_servicio FROM catalogo_items').all();
  const ins = db.prepare('INSERT INTO actividades (nombre) VALUES (?)');
  const link = db.prepare('UPDATE catalogo_items SET actividad_id = ? WHERE tipo_servicio = ?');
  for (const { tipo_servicio } of tipos) {
    const r = ins.run(NOMBRES[tipo_servicio] || tipo_servicio);
    link.run(r.lastInsertRowid, tipo_servicio);
  }
  console.log(`011: ${tipos.length} actividades creadas desde catalogo_items`);
}

// 011: dedupe de catalogo_items (la seed 006 se re-insertaba en cada arranque) + índice único
db.prepare(`DELETE FROM catalogo_items WHERE id NOT IN (
  SELECT MIN(id) FROM catalogo_items GROUP BY tipo_servicio, nombre
)`).run();
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS ux_catalogo_tipo_nombre ON catalogo_items(tipo_servicio, nombre)');

// 011: relink idempotente — insumos seed sin actividad se ligan a la actividad de su tipo_servicio
db.prepare(`
  UPDATE catalogo_items SET actividad_id = (
    SELECT a.id FROM actividades a
    JOIN (SELECT 'cambio_aceite' ts, 'Cambio de aceite' n UNION SELECT 'afinacion','Afinación'
          UNION SELECT 'escaneo','Escaneo / Diagnóstico' UNION SELECT 'frenos','Frenos'
          UNION SELECT 'reparacion','Reparación') m ON m.n = a.nombre
    WHERE m.ts = catalogo_items.tipo_servicio
  )
  WHERE actividad_id IS NULL AND tipo_servicio NOT LIKE 'act_%'
`).run();

module.exports = db;
