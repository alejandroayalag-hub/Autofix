-- 011: cotizador de 3 niveles — paquete → actividades → insumos

CREATE TABLE IF NOT EXISTS actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  horas_mano_obra REAL NOT NULL DEFAULT 0,
  tarifa_hora REAL NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insumos (catalogo_items) se ligan a una actividad
ALTER TABLE catalogo_items ADD COLUMN actividad_id INTEGER REFERENCES actividades(id);
ALTER TABLE catalogo_items ADD COLUMN tipo TEXT NOT NULL DEFAULT 'refaccion';

-- Un paquete arma N actividades y una actividad vive en N paquetes
CREATE TABLE IF NOT EXISTS paquete_actividades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paquete_id INTEGER NOT NULL REFERENCES paquetes(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id),
  orden INTEGER NOT NULL DEFAULT 0,
  UNIQUE(paquete_id, actividad_id)
);

-- Paquetes de 3 niveles se distinguen de los 300 precios sueltos importados
ALTER TABLE paquetes ADD COLUMN es_compuesto INTEGER NOT NULL DEFAULT 0;

-- Snapshot del agrupador en la cotización
ALTER TABLE cotizacion_items ADD COLUMN actividad TEXT;
