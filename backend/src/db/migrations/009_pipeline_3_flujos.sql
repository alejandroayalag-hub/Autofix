ALTER TABLE ordenes_trabajo ADD COLUMN tipo_flujo TEXT NOT NULL DEFAULT 'flujo_2';
ALTER TABLE ordenes_trabajo ADD COLUMN forma_pago TEXT;

CREATE TABLE IF NOT EXISTS orden_progresos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id    INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orden_gastos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id    INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto       REAL NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'otro',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remisiones (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id         INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  numero_folio     TEXT NOT NULL UNIQUE,
  fecha            TEXT NOT NULL DEFAULT (date('now')),
  total            REAL NOT NULL DEFAULT 0,
  forma_pago       TEXT,
  pdf_path         TEXT,
  whatsapp_enviado INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
