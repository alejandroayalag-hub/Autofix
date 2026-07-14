# AutoFix Querétaro — Órdenes de Trabajo (Sub-proyecto 1)

**Fecha:** 2026-06-05
**Estado:** Aprobado

---

## Alcance

Este sub-proyecto cubre:
- Nuevo menú (sidebar reorganizado en 3 secciones)
- Módulo Autos (tabla nueva, CRUD, vinculado a clientes)
- Módulo Órdenes de Trabajo con flujo completo: recepción → diagnóstico → cotización → envío → aceptación → taller → cierre
- Página pública de aceptación de cotización (`/c/:token`, sin login)
- Envío por email (Nodemailer SMTP) + link WhatsApp
- Migración de `servicios` → `ordenes_trabajo` (script idempotente)

**Fuera de alcance:** Inventario de refacciones, Cultura empresarial (placeholders).

---

## Modelo de datos

### Tablas nuevas

```sql
CREATE TABLE autos (
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

CREATE TABLE ordenes_trabajo (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  auto_id                INTEGER REFERENCES autos(id) ON DELETE SET NULL,
  cliente_id             INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  estatus                TEXT NOT NULL DEFAULT 'recepcion',
  -- estatus: recepcion | diagnostico | cotizacion_pendiente |
  --          cotizacion_enviada | aprobada | rechazada |
  --          en_taller | listo_entrega | entregado
  odometro               INTEGER,
  fecha_recepcion        TEXT NOT NULL DEFAULT (date('now')),
  fecha_entrega_estimada TEXT,
  fecha_cierre           TEXT,
  notas_recepcion        TEXT,
  costo_real             REAL,
  precio_real            REAL,
  origen_migracion       INTEGER,  -- servicios.id si vino de migración
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE diagnostico (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id    INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  notas_libres TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE diagnostico_checklist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnostico_id INTEGER NOT NULL REFERENCES diagnostico(id) ON DELETE CASCADE,
  seccion       TEXT NOT NULL,  -- motor | frenos | suspension | electrico | carroceria
  item          TEXT NOT NULL,
  estatus       TEXT NOT NULL DEFAULT 'ok',  -- ok | revisar | urgente
  notas         TEXT
);

CREATE TABLE diagnostico_items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  diagnostico_id      INTEGER NOT NULL REFERENCES diagnostico(id) ON DELETE CASCADE,
  descripcion         TEXT NOT NULL,
  urgencia            TEXT DEFAULT 'normal',  -- normal | urgente
  incluir_en_cotizacion INTEGER DEFAULT 1
);
```

### Tablas modificadas

**`cotizaciones`** — añadir columnas:
- `orden_id INTEGER REFERENCES ordenes_trabajo(id) ON DELETE SET NULL`
- `token TEXT UNIQUE` — UUID para el link de aceptación pública

**`servicios`** — sin cambios, queda como tabla de archivo (solo lectura desde UI).

---

## Flujo de la Orden de Trabajo

### Estatus y transiciones

```
recepcion
  └─→ diagnostico          (al guardar recepción)
        └─→ cotizacion_pendiente   (al generar cotización desde diagnóstico)
              └─→ cotizacion_enviada   (al enviar al cliente)
                    ├─→ aprobada        (cliente aprueba vía token)
                    └─→ rechazada       (cliente rechaza — queda en OT para revisar)
                          └─→ cotizacion_pendiente  (se puede reenviar cotización corregida)
aprobada
  └─→ en_taller           (mecánico inicia trabajo)
        └─→ listo_entrega  (mecánico termina)
              └─→ entregado  (cierre: costos reales capturados, OT pasa a Bitácora)
```

### Pantallas

**Recepción (`/ordenes/nueva`)**
- Búsqueda de cliente existente o formulario de cliente nuevo
- Una vez seleccionado el cliente: lista de sus autos + opción "Auto nuevo"
- Captura: odómetro, fecha estimada de entrega, notas
- Guardar → OT en estatus `diagnostico`

**Diagnóstico (`/ordenes/:id/diagnostico`)**
- Checklist por sección (Motor / Frenos / Suspensión / Eléctrico / Carrocería)
  - Cada ítem: radio ok / ⚠ revisar / 🔴 urgente + campo de nota opcional
  - Ítems predefinidos por sección, con opción de agregar ítem libre
- Lista de problemas encontrados: descripción, urgencia, checkbox "incluir en cotización"
- Notas libres del mecánico
- Botón "Generar cotización" → crea cotización pre-llenada con ítems marcados → estatus `cotizacion_pendiente`

**Cotización de OT (`/ordenes/:id/cotizacion`)**
- Se pre-llena con ítems del diagnóstico marcados como `incluir_en_cotizacion`
- Se pueden agregar líneas del catálogo o líneas libres
- Botón "Enviar al cliente":
  - Genera token UUID en cotización
  - Envía email HTML al cliente
  - Muestra botón "Abrir WhatsApp" con link `wa.me/` pre-armado
  - Estatus → `cotizacion_enviada`

**Página pública (`/c/:token`, sin autenticación)**
- Logo AutoFix + nombre cliente + datos del auto
- Lista de servicios cotizados con precios + total
- Botones: ✅ Aprobar | ❌ Rechazar (con campo motivo obligatorio)
- Acción de un solo uso: una vez aprobada/rechazada, la página lo indica y bloquea los botones
- Al aprobar: OT → estatus `aprobada`
- Al rechazar: OT queda en `rechazada`, el mecánico recibe la notificación en el sistema

**Vista de OT activa (`/ordenes/:id`)**
- Barra de progreso visual con los estatus
- Botones de avance según estatus actual:
  - `aprobada` → "Iniciar trabajo" → `en_taller`
  - `en_taller` → "Marcar listo" → `listo_entrega`
  - `listo_entrega` → "Registrar cierre" → formulario de costos reales → `entregado`

**Cierre (`/ordenes/:id/cierre`)**
- Captura costos reales: líneas de refacciones (descripción, cantidad, precio unitario) + mano de obra
- Comparativa: cotizado vs. real (utilidad)
- Confirmar entrega → estatus `entregado` → OT aparece en Bitácora

---

## Envío y aceptación

### Email (Nodemailer)

Ruta: `POST /api/ordenes/:id/cotizacion/enviar`

Configuración en `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=autofix@gmail.com
SMTP_PASS=app-password-aqui
SMTP_FROM=AutoFix Querétaro <autofix@gmail.com>
```

El email incluye:
- Encabezado con logo y franja Herbie (rojo/blanco/azul)
- Datos del vehículo y cliente
- Tabla de servicios cotizados con precios
- Total en grande
- Botón CTA "Ver y aprobar cotización" → `http://62.238.3.136:8082/c/:token`

### WhatsApp

La respuesta de `/enviar` incluye `whatsapp_url`:
```
https://wa.me/521XXXXXXXXXX?text=Hola%20[nombre]%2C%20tu%20cotización...
```
El frontend muestra un botón "Abrir WhatsApp" que el mecánico toca desde su celular.

---

## Menú (Sidebar)

Franja racing: `h-3` (12px) — rojo / blanco / azul.

```
── OPERACIONES ──
  Autos              /autos
  Clientes           /clientes
  Órdenes de trabajo /ordenes     ← badge con contador de OT activas
  Cotizador          /cotizaciones

── TALLER ──────────
  Inventario         /inventario  ← placeholder "Próximamente"
  Catálogo           /paquetes
  Bitácora           /bitacora
  Financiero         /financiero

── EMPRESA ─────────
  Cultura empresarial /cultura    ← placeholder "Próximamente"
```

---

## Migración de datos

Script idempotente que corre al iniciar el backend (solo si `origen_migracion` no existe aún en `ordenes_trabajo`).

Por cada registro en `servicios`:
1. Buscar auto existente por `placa` (case-insensitive) o crear uno nuevo con `placa, marca, modelo, anio, motor, vin, cliente_id`
2. Crear `orden_trabajo` con `estatus = 'entregado'`, `origen_migracion = servicios.id`, y todos los datos históricos mapeados
3. El campo `servicios.cotizacion` (monto cotizado) se mapea a `precio_real` de la OT; no se crea registro en `cotizaciones` para registros migrados (no hay ítems detallados disponibles)

La tabla `servicios` no se modifica ni elimina.

---

## Archivos a crear / modificar

### Backend

| Archivo | Acción |
|---|---|
| `src/db/migrations/003_ordenes_trabajo.sql` | Crear — nuevas tablas + ALTER cotizaciones |
| `src/db/migrate_servicios.js` | Crear — script de migración one-shot |
| `src/db/database.js` | Modificar — cargar migración 003 + ejecutar migrate_servicios |
| `src/routes/autos.js` | Crear — CRUD autos |
| `src/routes/ordenes.js` | Crear — CRUD OT + transiciones de estatus + enviar cotización |
| `src/routes/cotizacion_publica.js` | Crear — GET /cotizacion-publica/:token + POST aprobar/rechazar (sin auth) |
| `src/index.js` | Modificar — registrar nuevas rutas |

### Frontend

| Archivo | Acción |
|---|---|
| `src/components/Sidebar.jsx` | Modificar — nuevo menú 3 secciones, franja `h-3` |
| `src/App.jsx` | Modificar — nuevas rutas |
| `src/pages/AutosPage.jsx` | Crear |
| `src/pages/OrdenesPage.jsx` | Crear — lista de OT activas |
| `src/pages/OrdenRecepcionPage.jsx` | Crear |
| `src/pages/OrdenDiagnosticoPage.jsx` | Crear |
| `src/pages/OrdenCotizacionPage.jsx` | Crear |
| `src/pages/OrdenDetallePage.jsx` | Crear — vista + avance de estatus |
| `src/pages/OrdenCierrePage.jsx` | Crear |
| `src/pages/CotizacionPublicaPage.jsx` | Crear — sin auth, acceso por token |
| `src/pages/BitacoraPage.jsx` | Modificar — muestra OT entregadas + servicios históricos |
| `src/api/autos.js` | Crear |
| `src/api/ordenes.js` | Crear |

---

## Criterios de éxito

- Una OT puede recorrer el flujo completo: recepción → diagnóstico → cotización → envío → aceptación pública → taller → cierre
- Los servicios históricos aparecen en Bitácora después de la migración
- El email llega al cliente con el link funcional de aceptación
- El link WhatsApp se abre con el texto pre-armado
- El token de aceptación es de un solo uso
- El sidebar muestra las 3 secciones con la franja racing de 12px
