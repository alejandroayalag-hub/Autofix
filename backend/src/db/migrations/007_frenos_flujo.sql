-- Actualizar ítems de frenos para reflejar flujo diagnóstico → cotización
DELETE FROM catalogo_items WHERE tipo_servicio = 'frenos';

-- ── Diagnóstico base (siempre incluido) ──────────────────────
INSERT INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('frenos','Desmontaje de 4 ruedas','Retiro y recolocación de las cuatro ruedas del vehículo',0,'servicio',0,0,1),
  ('frenos','Limpieza y ajuste de frenos','Limpieza de componentes y ajuste mecánico del sistema en las 4 posiciones',0,'servicio',350,120,2),
  ('frenos','Medición de balatas','Registro de espesor de balatas en las 4 posiciones (mm)',0,'servicio',0,0,3),
  ('frenos','Medición de discos','Registro de espesor y condición de discos en las 4 posiciones (mm)',0,'servicio',0,0,4),
  ('frenos','Reporte de diagnóstico','Reporte con medidas tomadas, condición y recomendación de reemplazos',0,'servicio',0,0,5);

-- ── Reemplazos según diagnóstico (opcionales → van a cotización) ──
INSERT INTO catalogo_items
  (tipo_servicio, nombre, descripcion, es_opcional, unidad, precio_unitario, costo_unitario, orden)
VALUES
  ('frenos','Balatas delanteras','Par de balatas eje delantero — cotizar si espesor < mínimo',1,'par',580,290,10),
  ('frenos','Balatas traseras','Par de balatas eje trasero — cotizar si espesor < mínimo',1,'par',480,240,11),
  ('frenos','Discos delanteros','Par de discos eje delantero — cotizar si están fuera de especificación',1,'par',1200,600,12),
  ('frenos','Discos traseros','Par de discos eje trasero — cotizar si están fuera de especificación',1,'par',980,490,13),
  ('frenos','Líquido de frenos DOT 4','Cambio de líquido — cotizar si está contaminado o con humedad',1,'litro',180,70,14),
  ('frenos','Purga del sistema','Sangrado del sistema hidráulico post-reemplazo',1,'servicio',200,80,15);
