-- Catálogo estructurado de servicios
CREATE TABLE IF NOT EXISTS catalogo_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_servicio   TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  es_opcional     INTEGER NOT NULL DEFAULT 0,
  configurable    TEXT,        -- NULL | 'litros' | 'piezas'
  config_min      INTEGER,
  config_max      INTEGER,
  config_default  INTEGER,
  unidad          TEXT,        -- 'L' | 'pzas' | 'par' | 'litro' | 'servicio'
  precio_unitario REAL NOT NULL DEFAULT 0,
  costo_unitario  REAL NOT NULL DEFAULT 0,
  orden           INTEGER NOT NULL DEFAULT 0,
  activo          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Cambio de aceite ─────────────────────────────────────────
INSERT OR IGNORE INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, configurable, config_min, config_max, config_default, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('cambio_aceite','Aceite motor','Aceite según especificación del fabricante',0,'litros',3,8,4,'L',65,35,1),
  ('cambio_aceite','Filtro de aceite','Filtro OEM o equivalente',0,NULL,NULL,NULL,NULL,'pza',120,65,2),
  ('cambio_aceite','Arandela de tapón','Arandela de cobre o aluminio para el tapón de cárter',0,NULL,NULL,NULL,NULL,'pza',15,8,3),
  ('cambio_aceite','Flush / Lavado interno','Producto de limpieza interna del motor antes del cambio',1,NULL,NULL,NULL,NULL,'pza',180,90,4);

-- ── Afinación ────────────────────────────────────────────────
INSERT OR IGNORE INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, configurable, config_min, config_max, config_default, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('afinacion','Lavado de cuerpo de aceleración','Limpieza con producto especializado',0,NULL,NULL,NULL,NULL,'servicio',250,100,1),
  ('afinacion','Bujías','Cambio de bujías según número de cilindros',0,'piezas',3,8,4,'pzas',85,40,2),
  ('afinacion','Filtro de aire','Elemento filtrante de entrada de aire al motor',0,NULL,NULL,NULL,NULL,'pza',180,90,3),
  ('afinacion','Filtro de cabina','Filtro habitáculo / antipolen / polvo',0,NULL,NULL,NULL,NULL,'pza',220,110,4),
  ('afinacion','Filtro de gasolina','Aplica según modelo y año del vehículo',1,NULL,NULL,NULL,NULL,'pza',280,140,5);

-- ── Frenos ───────────────────────────────────────────────────
INSERT OR IGNORE INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, configurable, config_min, config_max, config_default, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('frenos','Revisión de frenos','Inspección visual y prueba de eficiencia del sistema',0,NULL,NULL,NULL,NULL,'servicio',150,60,1),
  ('frenos','Balatas delanteras','Par de balatas eje delantero',1,NULL,NULL,NULL,NULL,'par',580,290,2),
  ('frenos','Balatas traseras','Par de balatas eje trasero',1,NULL,NULL,NULL,NULL,'par',480,240,3),
  ('frenos','Discos delanteros','Par de discos eje delantero',1,NULL,NULL,NULL,NULL,'par',1200,600,4),
  ('frenos','Discos traseros','Par de discos eje trasero',1,NULL,NULL,NULL,NULL,'par',980,490,5),
  ('frenos','Líquido de frenos DOT 4','Cambio de líquido de frenos',1,NULL,NULL,NULL,NULL,'litro',180,70,6),
  ('frenos','Purga del sistema','Sangrado del sistema hidráulico de frenos',1,NULL,NULL,NULL,NULL,'servicio',200,80,7);

-- ── Escaneo y diagnóstico ─────────────────────────────────────
INSERT OR IGNORE INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, configurable, config_min, config_max, config_default, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('escaneo','Escaneo OBD2','Lectura de códigos de falla con escáner profesional',0,NULL,NULL,NULL,NULL,'servicio',350,80,1),
  ('escaneo','Reporte de diagnóstico','Reporte con hallazgos, causas y recomendaciones',0,NULL,NULL,NULL,NULL,'servicio',0,0,2),
  ('escaneo','Borrado de códigos','Borrado de fallas confirmadas tras la reparación',1,NULL,NULL,NULL,NULL,'servicio',150,30,3),
  ('escaneo','Prueba en carretera','Prueba dinámica post-reparación para confirmar corrección',1,NULL,NULL,NULL,NULL,'servicio',200,50,4);
