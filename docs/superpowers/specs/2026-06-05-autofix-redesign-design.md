# AutoFix Querétaro — Rediseño UI

**Fecha:** 2026-06-05  
**Estado:** Aprobado  

## Decisiones de diseño

### 1. Layout — Sidebar con etiquetas

Reemplaza el top navbar horizontal por un sidebar vertical fijo de 210px.

**Estructura del sidebar:**
- Franja racing de 4px en la parte superior: rojo `#dc2626` · blanco `#ffffff` · azul `#1d4ed8` (guiño a Herbie Fully Loaded)
- Logo circular (🔧) sobre fondo blanco con borde rojo, diámetro 36px
- Nombre "AutoFix Querétaro" + subtítulo "Bitácora de servicios"
- Sección "Principal": Bitácora, Clientes, Paquetes, Cotizaciones
- Sección "Finanzas": Financiero
- Footer: avatar con iniciales, nombre de usuario, botón Salir
- Ítem activo: fondo `#1d4ed8`, texto blanco, font-weight 600
- Ítems inactivos: texto `#6b7280`, hover fondo `#1c1c1c`

**Cambio en `App.jsx`:** el `<nav>` horizontal se elimina; se introduce `<Sidebar>` como componente separado. El `<main>` pasa de `max-w-7xl mx-auto p-6` a ocupar el espacio restante con `flex-1 overflow-y-auto`.

### 2. Paleta de colores — Herbie Fully Loaded

| Token | Valor | Uso |
|---|---|---|
| `sidebar-bg` | `#111111` | Fondo del sidebar |
| `primary` | `#1d4ed8` | Botón principal, nav activo, KPI ingresos |
| `danger` | `#dc2626` | Botón destructivo, franja racing, KPI gastos |
| `success` | `#059669` | KPI utilidad/ganancias |
| `neutral-dark` | `#111111`–`#374151` | KPI neutro (conteo de servicios) |
| `bg` | `#fafafa` | Fondo de la app |
| `surface` | `#ffffff` | Tarjetas, formularios, modales |
| `border` | `#e5e5e5` | Bordes sutiles |
| `text-main` | `#111111` | Texto principal |
| `text-sub` | `#6b7280` | Texto secundario, labels |
| `text-muted` | `#9ca3af` | Placeholders, headers de tabla |

El naranja `#f97316` queda eliminado de toda la UI.

### 3. Componentes — Gradiente en KPIs, header oscuro en tablas

**Tarjetas KPI:**
- Fondo con `linear-gradient(135deg, color1, color2)`, texto blanco
- Azul: `#1d4ed8 → #1e40af` (ingresos, cotizaciones)
- Rojo: `#dc2626 → #b91c1c` (gastos, pérdidas)
- Verde: `#059669 → #047857` (utilidad, ganancia neta)
- Gris oscuro: `#111111 → #374151` (conteos neutros)
- Estructura interna: label xs arriba, número `text-2xl font-bold`, subtítulo xs abajo
- Detalle decorativo: círculo semitransparente en esquina superior derecha

**Tablas:**
- `<thead>` con fondo `#111111`, texto `#9ca3af`, font-size 10px, uppercase
- Filas alternas: `white` / `#fafafa`
- Hover: `#eff6ff` (azul muy suave)
- Columnas de montos alineadas a la derecha, utilidades positivas en verde `#059669`, negativas en rojo `#dc2626`

**Botones:**
- Primario: `bg-[#1d4ed8] text-white` — crear, guardar, buscar
- Destructivo: `bg-[#dc2626] text-white` — eliminar
- Secundario: `bg-white border border-[#e5e5e5] text-[#374151]` — cancelar, volver, limpiar
- Acciones en tabla: ghost — azul (`bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]`) para editar, rojo (`bg-[#fef2f2] border-[#fecaca] text-[#dc2626]`) para eliminar

**Badges de estado:**
- Azul claro: tipo de servicio, estatus activo
- Gris: estatus neutral
- Rojo claro: rechazado, vencido

### 4. Login

- Fondo negro `#111111`
- Franja Herbie horizontal centrada en la parte superior de la card
- Card blanca centrada, `max-w-sm`, `rounded-2xl shadow-2xl`
- Logo circular con borde rojo, tamaño 52px
- Focus rings en azul `#1d4ed8` (reemplaza naranja actual)
- Botón submit en azul primario

### 5. Topbar de contenido

Cada página tiene una barra superior dentro del `<main>`:
- Fondo blanco, `border-b border-[#e5e5e5]`, padding `py-3 px-5`
- Título de la página a la izquierda (`text-base font-bold text-[#111]`)
- Botón de acción principal a la derecha (cuando aplica)

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `App.jsx` | Reemplazar `<nav>` por `<Sidebar>` importado; ajustar layout a flex-row |
| `frontend/src/components/Sidebar.jsx` | Nuevo componente (no existe aún) |
| `LoginPage.jsx` | Actualizar colores, agregar franja, ajustar logo |
| `BitacoraPage.jsx` | KPIs con gradiente, tabla nuevo header, botones actualizados |
| `ClientesPage.jsx` | Botones, formulario con nuevos colores |
| `PaquetesPage.jsx` | Botones, tabla, colores |
| `CotizacionesPage.jsx` | Botones, tabla, badges de estatus |
| `CotizacionFormPage.jsx` | Botones, inputs con focus azul |
| `ServicioFormPage.jsx` | Botones, inputs con focus azul |
| `FinancieroPage.jsx` | KPIs con gradiente, tablas, modales, botones |
| `index.css` | Sin cambios (solo `@import "tailwindcss"`) |

## Lo que NO cambia

- Estructura de rutas (`App.jsx` routing)
- Lógica de negocio y llamadas a API
- Componente `ProtectedRoute`
- Backend (ningún cambio)

## Criterios de éxito

- El naranja desaparece completamente de la UI
- El sidebar se ve correctamente en todas las páginas
- Las KPI cards usan gradientes en Bitácora y Financiero
- Los headers de tablas son negros en todas las páginas
- La franja racing aparece en sidebar y login
- El build de Vite completa sin errores
