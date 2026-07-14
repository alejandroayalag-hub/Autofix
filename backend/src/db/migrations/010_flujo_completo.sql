-- 010: flujo completo cliente→auto→cotización→OT→checklist→remisión→salida

-- Cotización ligada al auto registrado
ALTER TABLE cotizaciones ADD COLUMN auto_id INTEGER REFERENCES autos(id);

-- Checklist de trabajo realizado por orden
CREATE TABLE IF NOT EXISTS orden_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL REFERENCES ordenes_trabajo(id),
  descripcion TEXT NOT NULL,
  hecho INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pago de remisión → habilita orden de salida
ALTER TABLE remisiones ADD COLUMN pagada INTEGER NOT NULL DEFAULT 0;
ALTER TABLE remisiones ADD COLUMN fecha_pago TEXT;
