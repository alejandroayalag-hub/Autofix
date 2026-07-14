'use strict';

/**
 * Migración idempotente: convierte registros de `servicios` en `ordenes_trabajo`.
 * Se ejecuta una sola vez; si ya existe alguna fila con origen_migracion IS NOT NULL, sale sin hacer nada.
 *
 * @param {import('better-sqlite3').Database} db
 */
function migrarServicios(db) {
  // Guard: si ya se ejecutó la migración, no hacer nada
  const totalServicios = db.prepare('SELECT COUNT(*) as n FROM servicios').get().n;
  const yaMigrados = db.prepare('SELECT COUNT(*) as n FROM ordenes_trabajo WHERE origen_migracion IS NOT NULL').get().n;
  if (yaMigrados >= totalServicios) return; // ya corrió

  const servicios = db.prepare('SELECT * FROM servicios').all();

  if (servicios.length === 0) {
    return;
  }

  const buscarAuto = db.prepare(
    'SELECT id FROM autos WHERE UPPER(TRIM(placa)) = UPPER(TRIM(?)) LIMIT 1'
  );

  const insertAuto = db.prepare(`
    INSERT INTO autos (cliente_id, placa, marca, modelo, anio, motor, vin)
    VALUES (@cliente_id, @placa, @marca, @modelo, @anio, @motor, @vin)
  `);

  const insertOrden = db.prepare(`
    INSERT INTO ordenes_trabajo
      (auto_id, cliente_id, estatus, odometro, fecha_recepcion, fecha_cierre,
       notas_recepcion, precio_real, costo_real, origen_migracion)
    VALUES
      (@auto_id, @cliente_id, 'entregado', @odometro, @fecha_recepcion, @fecha_cierre,
       @notas_recepcion, @precio_real, @costo_real, @origen_migracion)
  `);

  const migrate = db.transaction(() => {
    for (const s of servicios) {
      // 1. Buscar o crear auto
      const placa = (s.placa || '').trim().toUpperCase();
      if (!placa) {
        // Sin placa: construir notas y insertar orden sin auto
        let notasRecepcionSinPlaca = s.tipo_servicio || null;
        if (s.notas) {
          notasRecepcionSinPlaca = notasRecepcionSinPlaca
            ? `${notasRecepcionSinPlaca}\n${s.notas}`
            : s.notas;
        }
        insertOrden.run({
          auto_id:          null,
          cliente_id:       s.cliente_id     || null,
          odometro:         s.odometro       || null,
          fecha_recepcion:  s.fecha          || new Date().toISOString().slice(0, 10),
          fecha_cierre:     s.fecha          || null,
          notas_recepcion:  notasRecepcionSinPlaca,
          precio_real:      s.precio         ?? null,
          costo_real:       s.costo          ?? null,
          origen_migracion: s.id,
        });
        continue;
      }

      let autoId;
      const autoExistente = buscarAuto.get(s.placa);

      if (autoExistente) {
        autoId = autoExistente.id;
      } else {
        const result = insertAuto.run({
          cliente_id: s.cliente_id || null,
          placa:      (s.placa || '').trim().toUpperCase(),
          marca:      s.marca  || null,
          modelo:     s.modelo || null,
          anio:       s.anio   || null,
          motor:      s.motor  || null,
          vin:        s.vin    || null,
        });
        autoId = result.lastInsertRowid;
      }

      // 2. Construir notas_recepcion
      let notasRecepcion = s.tipo_servicio || null;
      if (s.notas) {
        notasRecepcion = notasRecepcion
          ? `${notasRecepcion}\n${s.notas}`
          : s.notas;
      }

      // 3. Crear orden de trabajo
      insertOrden.run({
        auto_id:          autoId,
        cliente_id:       s.cliente_id     || null,
        odometro:         s.odometro       || null,
        fecha_recepcion:  s.fecha          || new Date().toISOString().slice(0, 10),
        fecha_cierre:     s.fecha          || null,
        notas_recepcion:  notasRecepcion,
        precio_real:      s.precio         ?? null,
        costo_real:       s.costo          ?? null,
        origen_migracion: s.id,
      });
    }
  });

  migrate();
  console.log(`[migrate_servicios] ${servicios.length} servicios migrados a ordenes_trabajo.`);
}

module.exports = { migrarServicios };
