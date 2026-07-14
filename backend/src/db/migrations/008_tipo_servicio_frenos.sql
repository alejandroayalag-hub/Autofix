-- Tipo de servicio en órdenes de trabajo
ALTER TABLE ordenes_trabajo ADD COLUMN tipo_servicio TEXT DEFAULT NULL;

-- Diagnóstico especializado de frenos
CREATE TABLE IF NOT EXISTS diagnostico_frenos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id      INTEGER NOT NULL UNIQUE REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  -- Delantera izquierda
  di_balata_mm  REAL,
  di_disco_mm   REAL,
  di_balata_est TEXT NOT NULL DEFAULT 'ok',
  di_disco_est  TEXT NOT NULL DEFAULT 'ok',
  -- Delantera derecha
  dd_balata_mm  REAL,
  dd_disco_mm   REAL,
  dd_balata_est TEXT NOT NULL DEFAULT 'ok',
  dd_disco_est  TEXT NOT NULL DEFAULT 'ok',
  -- Trasera izquierda
  ti_balata_mm  REAL,
  ti_disco_mm   REAL,
  ti_balata_est TEXT NOT NULL DEFAULT 'ok',
  ti_disco_est  TEXT NOT NULL DEFAULT 'ok',
  -- Trasera derecha
  td_balata_mm  REAL,
  td_disco_mm   REAL,
  td_balata_est TEXT NOT NULL DEFAULT 'ok',
  td_disco_est  TEXT NOT NULL DEFAULT 'ok',
  -- Líquido de frenos
  liq_nivel     TEXT NOT NULL DEFAULT 'ok',
  liq_estado    TEXT NOT NULL DEFAULT 'ok',
  -- General
  notas         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
