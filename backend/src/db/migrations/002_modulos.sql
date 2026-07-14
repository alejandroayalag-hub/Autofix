-- Catálogo de paquetes/servicios
CREATE TABLE IF NOT EXISTS paquetes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT 'general',
  descripcion    TEXT,
  precio_lista   REAL,
  costo_estimado REAL,
  activo         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id     INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nombre TEXT,
  placa          TEXT,
  marca          TEXT,
  modelo         TEXT,
  anio           INTEGER,
  fecha          TEXT NOT NULL DEFAULT (date('now')),
  estatus        TEXT NOT NULL DEFAULT 'borrador',
  total_costo    REAL DEFAULT 0,
  total_precio   REAL DEFAULT 0,
  notas          TEXT,
  servicio_id    INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ítems de cotización
CREATE TABLE IF NOT EXISTS cotizacion_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  cotizacion_id    INTEGER NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  paquete_id       INTEGER REFERENCES paquetes(id) ON DELETE SET NULL,
  descripcion      TEXT NOT NULL,
  cantidad         REAL NOT NULL DEFAULT 1,
  costo_unitario   REAL DEFAULT 0,
  precio_unitario  REAL DEFAULT 0,
  subtotal_costo   REAL DEFAULT 0,
  subtotal_precio  REAL DEFAULT 0
);

-- Gastos
CREATE TABLE IF NOT EXISTS gastos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL DEFAULT (date('now')),
  categoria   TEXT NOT NULL DEFAULT 'general',
  descripcion TEXT NOT NULL,
  monto       REAL NOT NULL,
  proveedor   TEXT,
  tiene_factura INTEGER DEFAULT 0,
  notas       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ingresos manuales (los del servicio se calculan por separado)
CREATE TABLE IF NOT EXISTS ingresos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL DEFAULT (date('now')),
  descripcion TEXT NOT NULL,
  monto       REAL NOT NULL,
  metodo_pago TEXT DEFAULT 'efectivo',
  servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
  notas       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Facturas
CREATE TABLE IF NOT EXISTS facturas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha          TEXT NOT NULL DEFAULT (date('now')),
  numero         TEXT,
  tipo           TEXT NOT NULL DEFAULT 'ingreso',
  cliente_nombre TEXT,
  concepto       TEXT NOT NULL,
  subtotal       REAL DEFAULT 0,
  iva            REAL DEFAULT 0,
  total          REAL DEFAULT 0,
  estatus        TEXT DEFAULT 'pendiente',
  notas          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Datos de ejemplo paquetes
INSERT OR IGNORE INTO paquetes (nombre, categoria, precio_lista, costo_estimado) VALUES
  ('Cambio de aceite convencional',       'mantenimiento', 350,  180),
  ('Cambio de aceite sintético',          'mantenimiento', 650,  350),
  ('Cambio de aceite semi-sintético',     'mantenimiento', 480,  260),
  ('Afinación menor (4 bujías)',          'afinacion',     800,  400),
  ('Afinación mayor (4 bujías + filtros)','afinacion',    1400,  700),
  ('Limpieza de inyectores',              'inyectores',   1200,  600),
  ('Limpieza de inyectores ultrasónica',  'inyectores',   1800,  900),
  ('Revisión de frenos delanteros',       'frenos',        600,  300),
  ('Cambio de balatas delanteras',        'frenos',       1200,  600),
  ('Cambio de balatas traseras',          'frenos',       1000,  500),
  ('Alineación y balanceo',               'suspension',    600,  300),
  ('Revisión general',                    'general',       300,  150);
