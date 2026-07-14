-- Autos
CREATE TABLE IF NOT EXISTS autos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  placa      TEXT NOT NULL,
  marca      TEXT,
  modelo     TEXT,
  anio       INTEGER,
  motor      TEXT,
  vin        TEXT,
  color      TEXT,
  notas      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Órdenes de Trabajo
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  auto_id                INTEGER REFERENCES autos(id) ON DELETE SET NULL,
  cliente_id             INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  estatus                TEXT NOT NULL DEFAULT 'recepcion',
  odometro               INTEGER,
  fecha_recepcion        TEXT NOT NULL DEFAULT (date('now')),
  fecha_entrega_estimada TEXT,
  fecha_cierre           TEXT,
  notas_recepcion        TEXT,
  costo_real             REAL,
  precio_real            REAL,
  origen_migracion       INTEGER,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Diagnóstico
CREATE TABLE IF NOT EXISTS diagnostico (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id     INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  notas_libres TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Checklist del diagnóstico
CREATE TABLE IF NOT EXISTS diagnostico_checklist (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnostico_id INTEGER NOT NULL REFERENCES diagnostico(id) ON DELETE CASCADE,
  seccion        TEXT NOT NULL,
  item           TEXT NOT NULL,
  estatus        TEXT NOT NULL DEFAULT 'ok',
  notas          TEXT
);

-- Ítems del diagnóstico
CREATE TABLE IF NOT EXISTS diagnostico_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnostico_id        INTEGER NOT NULL REFERENCES diagnostico(id) ON DELETE CASCADE,
  descripcion           TEXT NOT NULL,
  urgencia              TEXT DEFAULT 'normal',
  incluir_en_cotizacion INTEGER DEFAULT 1
);
