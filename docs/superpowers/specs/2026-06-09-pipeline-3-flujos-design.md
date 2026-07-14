# Pipeline y 3 Flujos de Trabajo — AutoFix Querétaro
**Fecha:** 2026-06-09  
**Autor:** Juan Ayala / Alejandro  
**Versión:** 1.0

---

## Contexto

AutoFix Querétaro actualmente tiene un único flujo lineal (Flujo 2). Juan trabaja con 3 tipos de servicio distintos según cómo llega el cliente. Este spec amplía el sistema existente para soportar los 3 flujos sin romper las órdenes actuales, y agrega un pipeline visual como vista principal de órdenes.

---

## Enfoque adoptado

**Opción C — Flujo unificado con `tipo_flujo` + estados ampliados.**

- Se agrega `tipo_flujo` a la tabla existente
- Las órdenes existentes quedan como `flujo_2` por default
- El pipeline muestra columnas por estado, badges de color por flujo
- Flujo 3 puede activarse desde cualquier orden activa

---

## Los 3 flujos

### Flujo 1 — Servicio Estándar
Cliente aprueba por teléfono antes de llevar el auto.

```
en_cotizacion → esperando_aprobacion → aprobada/rechazada
→ unidad_recibida → en_taller → [progreso] → listo_entrega
→ en_cierre → cerrada
```

### Flujo 2 — Diagnóstico Previo *(flujo actual)*
La unidad llega al taller antes de cotizar.

```
recepcion → diagnostico → cotizacion_pendiente → cotizacion_enviada
→ esperando_aprobacion → aprobada/rechazada → en_taller
→ [progreso] → listo_entrega → en_cierre → cerrada
```

### Flujo 3 — Reparación Progresiva
Costo variable en tiempo real. Puede iniciarse como Flujo 3 o convertirse desde cualquier orden en `en_taller`.

**Si arranca como F3 desde el inicio:**
```
recepcion → en_taller → [gastos en tiempo real]
→ pausado_consulta ←→ en_taller  (puede oscilar varias veces)
→ listo_entrega → en_cierre → cerrada
```

**Si se convierte desde F1 o F2 ya en `en_taller`:**
```
(orden F1/F2 en en_taller) → [cambiar tipo_flujo a flujo_3]
→ habilita módulo de gastos y botón de consulta al cliente
→ sigue el mismo camino que arriba desde en_taller
```

---

## Cambios al modelo de datos

### Tabla `ordenes_trabajo` — columnas nuevas

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `tipo_flujo` | TEXT | `flujo_2` | `flujo_1` \| `flujo_2` \| `flujo_3` |
| `forma_pago` | TEXT | NULL | `efectivo` \| `transferencia` \| `tarjeta` \| `credito` |

### Estados nuevos (se suman a los existentes)

| Estado | Flujo | Descripción |
|---|---|---|
| `en_cotizacion` | F1 | Cotización generada antes de recibir la unidad |
| `unidad_recibida` | F1 | Cliente aprobó, el auto ya llegó al taller |
| `pausado_consulta` | F3 | Problema mayor detectado, esperando decisión del cliente |
| `en_cierre` | Todos | Trabajo terminado, remisión generada, pendiente WhatsApp |

### Tabla nueva `orden_progresos`

Bitácora de avances mientras se trabaja (`en_taller`).

```sql
CREATE TABLE IF NOT EXISTS orden_progresos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id    INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Tabla nueva `orden_gastos`

Gastos en tiempo real para Flujo 3.

```sql
CREATE TABLE IF NOT EXISTS orden_gastos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id    INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto       REAL NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'otro',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
-- tipo: refaccion | mano_obra | otro
```

### Tabla nueva `remisiones`

Documento de entrega generado al cerrar una orden.

```sql
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
```

---

## Pipeline visual

### Ruta
`/pipeline` — nueva página en el sidebar como vista principal de Órdenes activas.

### Columnas

| Columna | Estados que muestra | Quién aparece |
|---|---|---|
| En cotización | `en_cotizacion` | F1 |
| Esperando aprobación | `esperando_aprobacion` | F1 |
| Recepción | `recepcion` | F2, F3 |
| Diagnóstico | `diagnostico` | F2 |
| En taller | `en_taller` | F1, F2, F3 |
| Consulta cliente | `pausado_consulta` | F3 |
| Listo para entrega | `listo_entrega` | Todos |
| En cierre | `en_cierre` | Todos |

Las columnas vacías se muestran colapsadas para no ocupar espacio.

### Tarjeta de orden en el pipeline

```
┌────────────────────────────┐
│ [F1] ABC-1234              │
│ Toyota Corolla 2020        │
│ Juan García                │
│ ⏱ 2h en este paso          │
│ [Ver detalle →]            │
└────────────────────────────┘
```

Colores de badge: F1 = azul, F2 = gris, F3 = naranja.

### Comportamiento
- Auto-refresco cada 30 segundos
- Clic en tarjeta navega a `/ordenes/:id`
- Toggle en el sidebar/header para cambiar entre Pipeline y Tabla

---

## Nueva Orden — selección de flujo

Al abrir "Nueva orden", se muestra un selector antes del formulario:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Flujo 1       │  │   Flujo 2       │  │   Flujo 3       │
│ Cliente aprobó  │  │ Llega sin cita  │  │  Costo variable │
│  por teléfono   │  │  al taller      │  │  en tiempo real │
│  [Seleccionar]  │  │  [Seleccionar]  │  │  [Seleccionar]  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Cada flujo abre un formulario con campos relevantes:
- F1: placa, cliente, cotización inicial
- F2: placa, cliente, odómetro, notas de recepción (igual que hoy)
- F3: placa, cliente, descripción del problema, presupuesto estimado

---

## Flujo 3 — Gastos progresivos y consulta al cliente

### Dentro de una orden `en_taller` (cualquier flujo)

Se agrega una sección "Progreso y gastos" en `OrdenDetallePage`:
- Lista de entradas de `orden_progresos` con textarea para agregar nueva
- Para F3: tabla de `orden_gastos` con botón "+ Agregar gasto"
- Botón rojo **"Problema mayor — consultar cliente"** → pasa a `pausado_consulta`

### Estado `pausado_consulta`

Al pausar:
1. Sistema genera resumen de gastos acumulados
2. Juan envía WhatsApp al cliente con el resumen y opciones: continuar / cerrar
3. Juan registra la decisión en el sistema:
   - **Continuar** → vuelve a `en_taller`
   - **Cerrar** → va a `listo_entrega`

### Convertir a Flujo 3

Botón "Convertir a Flujo 3" disponible en cualquier orden con estatus `en_taller` que no sea ya F3. Al presionar, cambia `tipo_flujo` a `flujo_3` y habilita el módulo de gastos.

---

## Cierre unificado (todos los flujos)

### Pantalla de cierre (`/ordenes/:id/cierre` — se amplía la existente)

1. **Registrar forma de pago**: efectivo / transferencia / tarjeta / crédito
2. **Resumen de la orden**: servicios, gastos (F3), total
3. **Generar remisión**: crea registro en `remisiones`, genera PDF con folio autoincremental
4. **Enviar por WhatsApp**: abre WhatsApp con mensaje predefinido + PDF adjunto (link de descarga)
5. La orden pasa a `cerrada`

### Contenido del PDF de remisión

- Logo / nombre del taller
- Folio y fecha
- Datos del auto (placa, marca, modelo, año, VIN)
- Datos del cliente
- Lista de servicios realizados
- Gastos de refacciones (si F3)
- Total
- Forma de pago
- Firma de recepción (espacio en blanco)

### Mensaje de WhatsApp

```
Hola [nombre], tu [marca] [modelo] ([placa]) está lista.
Total: $[monto] — Pago: [forma_pago]
Remisión: [link_pdf]
AutoFix Querétaro
```

---

## Rutas nuevas

| Ruta | Componente | Descripción |
|---|---|---|
| `/pipeline` | `PipelinePage` | Vista kanban de todas las órdenes activas |
| `/ordenes/nueva` | `OrdenRecepcionPage` (modificada) | Agrega selector de flujo al inicio |
| `/ordenes/:id` | `OrdenDetallePage` (modificada) | Agrega sección de progreso, gastos, consulta cliente |
| `/ordenes/:id/cierre` | `OrdenCierrePage` (modificada) | Agrega forma de pago, remisión, WhatsApp |

No se crean rutas completamente nuevas para F1 y F3 — se reutilizan las páginas existentes con condicionales por `tipo_flujo`.

---

## API endpoints nuevos

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/ordenes?pipeline=1` | Todas las órdenes activas agrupadas por estatus |
| `POST` | `/api/ordenes/:id/progresos` | Agregar entrada de progreso |
| `GET` | `/api/ordenes/:id/progresos` | Listar progresos |
| `POST` | `/api/ordenes/:id/gastos` | Agregar gasto (F3) |
| `GET` | `/api/ordenes/:id/gastos` | Listar gastos |
| `DELETE` | `/api/ordenes/:id/gastos/:gasto_id` | Eliminar gasto |
| `POST` | `/api/ordenes/:id/remision` | Generar remisión y PDF |
| `GET` | `/api/remisiones/:id/pdf` | Descargar PDF de remisión |

---

## Migración

```sql
-- Migration 009_pipeline_3_flujos.sql
ALTER TABLE ordenes_trabajo ADD COLUMN tipo_flujo TEXT NOT NULL DEFAULT 'flujo_2';
ALTER TABLE ordenes_trabajo ADD COLUMN forma_pago TEXT;

CREATE TABLE IF NOT EXISTS orden_progresos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orden_gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto REAL NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'otro',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS remisiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  numero_folio TEXT NOT NULL UNIQUE,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  total REAL NOT NULL DEFAULT 0,
  forma_pago TEXT,
  pdf_path TEXT,
  whatsapp_enviado INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Las órdenes existentes quedan automáticamente como `flujo_2`.

---

## Fuera de scope (por ahora)

- Integración SAT / CFDI timbrado (queda pendiente para migración posterior)
- Portal de cliente con login propio
- App móvil para técnicos
- SMS / notificaciones push

---

## Orden de implementación sugerida

1. Migración DB + endpoints nuevos (base de todo)
2. Pipeline visual `/pipeline`
3. Selector de flujo en Nueva Orden
4. Sección de progreso y gastos en Detalle de Orden
5. Consulta al cliente (Flujo 3)
6. Cierre unificado: remisión PDF + WhatsApp
