# Pipeline + Fundación — Plan A: DB, Backend y Vista Kanban

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar la base de datos para soportar 3 flujos, agregar los endpoints de pipeline/progresos/gastos al backend, y crear la vista kanban en `/pipeline`.

**Architecture:** Se agregan columnas y tablas a SQLite sin romper datos existentes. El endpoint `GET /api/ordenes?pipeline=1` devuelve órdenes agrupadas por estatus. `PipelinePage` hace polling cada 30s y renderiza columnas solo cuando tienen tarjetas.

**Tech Stack:** Node.js + better-sqlite3 (backend), React + Vite + Tailwind (frontend).

---

## Task 1: Migración DB + database.js

**Files:**
- Create: `backend/src/db/migrations/009_pipeline_3_flujos.sql`
- Modify: `backend/src/db/database.js`

- [ ] **Paso 1: Crear el archivo de migración SQL**

Crear `backend/src/db/migrations/009_pipeline_3_flujos.sql` con este contenido exacto:

```sql
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
```

- [ ] **Paso 2: Agregar la migración 009 al final de `database.js`**

Insertar justo antes de `module.exports = db;` en `backend/src/db/database.js`:

```js
// Migración 009 — Pipeline + 3 flujos
const sql009 = fs.readFileSync(path.join(__dirname, 'migrations', '009_pipeline_3_flujos.sql'), 'utf8')
  .split(';').map(s => s.trim()).filter(s => s.length > 0);
sql009.forEach(stmt => {
  try { db.exec(stmt); } catch (e) {
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) throw e;
  }
});
```

- [ ] **Paso 3: Verificar que la migración corre sin errores localmente**

```bash
cd ~/autofix/backend && node -e "require('./src/db/database'); console.log('OK')"
```

Resultado esperado: `OK` (sin errores).

- [ ] **Paso 4: Commit**

```bash
cd ~/autofix
git init 2>/dev/null; git add backend/src/db/migrations/009_pipeline_3_flujos.sql backend/src/db/database.js
git commit -m "feat: migración 009 — tipo_flujo, orden_progresos, orden_gastos, remisiones"
```

---

## Task 2: Backend — Actualizar ordenes.js

**Files:**
- Modify: `backend/src/routes/ordenes.js` (líneas 1-16 TRANSICIONES y líneas 19-38 GET /)

- [ ] **Paso 1: Reemplazar el objeto TRANSICIONES al inicio de ordenes.js**

Reemplazar el bloque `const TRANSICIONES = { ... };` existente (líneas 6-16) con:

```js
const TRANSICIONES = {
  // Flujo 1
  en_cotizacion:        ['cotizacion_pendiente'],
  unidad_recibida:      ['en_taller'],
  // Flujo 3
  pausado_consulta:     ['en_taller', 'listo_entrega'],
  // Nuevo pre-cierre
  en_cierre:            ['entregado'],
  // Existentes (sin cambios)
  recepcion:            ['diagnostico'],
  diagnostico:          ['cotizacion_pendiente'],
  cotizacion_pendiente: ['cotizacion_enviada'],
  cotizacion_enviada:   ['aprobada', 'rechazada'],
  aprobada:             ['en_taller', 'unidad_recibida'],
  rechazada:            ['cotizacion_pendiente'],
  en_taller:            ['listo_entrega', 'pausado_consulta'],
  listo_entrega:        ['en_cierre', 'entregado'],
  entregado:            [],
};
```

- [ ] **Paso 2: Agregar el bloque pipeline al inicio del handler GET /**

Dentro de `router.get('/', (req, res) => {`, agregar como primer bloque antes del `let where`:

```js
  // Pipeline: devuelve órdenes activas agrupadas por estatus
  if (req.query.pipeline === '1') {
    const rows = db.prepare(`
      SELECT ot.id, ot.estatus, ot.tipo_flujo, ot.updated_at, ot.fecha_recepcion,
             a.placa, a.marca, a.modelo,
             cl.nombre AS cliente_nombre
      FROM ordenes_trabajo ot
      LEFT JOIN autos a ON a.id = ot.auto_id
      LEFT JOIN clientes cl ON cl.id = ot.cliente_id
      WHERE ot.estatus NOT IN ('entregado', 'rechazada')
      ORDER BY ot.updated_at ASC
    `).all();
    const agrupado = {};
    rows.forEach(r => {
      if (!agrupado[r.estatus]) agrupado[r.estatus] = [];
      agrupado[r.estatus].push(r);
    });
    return res.json({ data: agrupado });
  }
```

- [ ] **Paso 3: Actualizar el ESTATUS_STYLE en OrdenDetallePage.jsx para incluir estados nuevos**

En `frontend/src/pages/OrdenDetallePage.jsx`, agregar al objeto `ESTATUS_STYLE`:

```js
  en_cotizacion:    { bg: '#eff6ff', text: '#1d4ed8',  label: 'En cotización' },
  unidad_recibida:  { bg: '#e0f2fe', text: '#0369a1',  label: 'Unidad recibida' },
  pausado_consulta: { bg: '#fef2f2', text: '#dc2626',  label: 'Consulta cliente' },
  en_cierre:        { bg: '#f5f3ff', text: '#7c3aed',  label: 'En cierre' },
```

Y agregar al array `PROGRESO`:

```js
  { key: 'en_cotizacion',    label: 'En cotización' },
  { key: 'unidad_recibida',  label: 'Unidad recibida' },
  { key: 'pausado_consulta', label: 'Consulta cliente' },
  { key: 'en_cierre',        label: 'En cierre' },
```

(Insertar `en_cotizacion` antes de `recepcion`, `unidad_recibida` después de `aprobada`, `pausado_consulta` después de `en_taller`, `en_cierre` después de `listo_entrega`.)

- [ ] **Paso 4: Commit**

```bash
cd ~/autofix
git add backend/src/routes/ordenes.js frontend/src/pages/OrdenDetallePage.jsx
git commit -m "feat: ampliar TRANSICIONES y endpoint pipeline en ordenes.js"
```

---

## Task 3: Backend — rutas progresos.js y gastos.js

**Files:**
- Create: `backend/src/routes/progresos.js`
- Create: `backend/src/routes/gastos.js`
- Modify: `backend/src/index.js`

- [ ] **Paso 1: Crear `backend/src/routes/progresos.js`**

```js
const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM orden_progresos WHERE orden_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { descripcion } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'descripcion requerida' });
  const r = db.prepare(
    'INSERT INTO orden_progresos (orden_id, descripcion) VALUES (?, ?)'
  ).run(req.params.id, descripcion.trim());
  const row = db.prepare('SELECT * FROM orden_progresos WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ data: row });
});

router.delete('/:prog_id', (req, res) => {
  db.prepare('DELETE FROM orden_progresos WHERE id = ? AND orden_id = ?')
    .run(req.params.prog_id, req.params.id);
  res.status(204).end();
});

module.exports = router;
```

- [ ] **Paso 2: Crear `backend/src/routes/gastos.js`**

```js
const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM orden_gastos WHERE orden_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  const total = rows.reduce((s, r) => s + r.monto, 0);
  res.json({ data: rows, total });
});

router.post('/', (req, res) => {
  const { descripcion, monto, tipo = 'otro' } = req.body;
  if (!descripcion?.trim()) return res.status(400).json({ error: 'descripcion requerida' });
  if (monto === undefined || isNaN(Number(monto))) return res.status(400).json({ error: 'monto requerido' });
  const TIPOS = ['refaccion', 'mano_obra', 'otro'];
  const tipoVal = TIPOS.includes(tipo) ? tipo : 'otro';
  const r = db.prepare(
    'INSERT INTO orden_gastos (orden_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, descripcion.trim(), Number(monto), tipoVal);
  const row = db.prepare('SELECT * FROM orden_gastos WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ data: row });
});

router.delete('/:gasto_id', (req, res) => {
  db.prepare('DELETE FROM orden_gastos WHERE id = ? AND orden_id = ?')
    .run(req.params.gasto_id, req.params.id);
  res.status(204).end();
});

module.exports = router;
```

- [ ] **Paso 3: Registrar las rutas en `backend/src/index.js`**

Agregar después de la línea `app.use('/api/ordenes/:id/frenos', ...)`:

```js
app.use('/api/ordenes/:id/progresos', auth, require('./routes/progresos'));
app.use('/api/ordenes/:id/gastos',    auth, require('./routes/gastos'));
```

- [ ] **Paso 4: Verificar que el backend arranca sin errores**

```bash
cd ~/autofix/backend && node src/index.js &
sleep 2 && curl -s http://localhost:3003/api/health
kill %1
```

Resultado esperado: `{"ok":true}`

- [ ] **Paso 5: Commit**

```bash
cd ~/autofix
git add backend/src/routes/progresos.js backend/src/routes/gastos.js backend/src/index.js
git commit -m "feat: rutas progresos y gastos por orden"
```

---

## Task 4: Frontend — clientes API y ordenes.js

**Files:**
- Create: `frontend/src/api/progresos.js`
- Create: `frontend/src/api/gastos.js`
- Modify: `frontend/src/api/ordenes.js`

- [ ] **Paso 1: Crear `frontend/src/api/progresos.js`**

```js
import api from './client';

export const getProgresos  = (id)           => api.get(`/ordenes/${id}/progresos`);
export const addProgreso   = (id, desc)     => api.post(`/ordenes/${id}/progresos`, { descripcion: desc });
export const deleteProgreso = (id, progId)  => api.delete(`/ordenes/${id}/progresos/${progId}`);
```

- [ ] **Paso 2: Crear `frontend/src/api/gastos.js`**

```js
import api from './client';

export const getGastos  = (id)             => api.get(`/ordenes/${id}/gastos`);
export const addGasto   = (id, data)       => api.post(`/ordenes/${id}/gastos`, data);
export const deleteGasto = (id, gastoId)   => api.delete(`/ordenes/${id}/gastos/${gastoId}`);
```

- [ ] **Paso 3: Agregar `getPipeline` y `updateOrdenTipoFlujo` a `frontend/src/api/ordenes.js`**

Agregar al final del archivo:

```js
export const getPipeline         = ()           => api.get('/ordenes', { params: { pipeline: 1 } });
export const updateOrdenTipoFlujo = (id, tipo)  => api.put(`/ordenes/${id}`, { tipo_flujo: tipo });
```

- [ ] **Paso 4: Commit**

```bash
cd ~/autofix
git add frontend/src/api/progresos.js frontend/src/api/gastos.js frontend/src/api/ordenes.js
git commit -m "feat: API clients progresos, gastos y getPipeline"
```

---

## Task 5: Frontend — PipelinePage.jsx

**Files:**
- Create: `frontend/src/pages/PipelinePage.jsx`

- [ ] **Paso 1: Crear `frontend/src/pages/PipelinePage.jsx`**

```jsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPipeline } from '../api/ordenes';

const COLUMNAS = [
  { key: 'en_cotizacion',        label: 'En cotización',    color: '#1d4ed8' },
  { key: 'recepcion',            label: 'Recepción',        color: '#374151' },
  { key: 'diagnostico',          label: 'Diagnóstico',      color: '#92400e' },
  { key: 'cotizacion_pendiente', label: 'Cotiz. pendiente', color: '#d97706' },
  { key: 'cotizacion_enviada',   label: 'Cotiz. enviada',   color: '#1e40af' },
  { key: 'aprobada',             label: 'Aprobada',         color: '#166534' },
  { key: 'unidad_recibida',      label: 'Unidad recibida',  color: '#0369a1' },
  { key: 'en_taller',            label: 'En taller',        color: '#d97706' },
  { key: 'pausado_consulta',     label: 'Consulta cliente', color: '#dc2626' },
  { key: 'listo_entrega',        label: 'Listo entrega',    color: '#059669' },
  { key: 'en_cierre',            label: 'En cierre',        color: '#7c3aed' },
];

const FLUJO_BADGE = {
  flujo_1: { label: 'F1', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  flujo_2: { label: 'F2', bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  flujo_3: { label: 'F3', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
};

const tiempoEnEstado = (updatedAt) => {
  if (!updatedAt) return '—';
  const diff = Date.now() - new Date(updatedAt).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

function OrdenCard({ orden }) {
  const badge = FLUJO_BADGE[orden.tipo_flujo] || FLUJO_BADGE.flujo_2;
  const titulo = [orden.marca, orden.modelo].filter(Boolean).join(' ') || '—';

  return (
    <Link
      to={`/ordenes/${orden.id}`}
      className="block bg-white border border-[#e5e5e5] rounded-xl p-3 hover:border-[#1d4ed8] hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="bg-[#111] text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
          {orden.placa || '—'}
        </span>
        <span
          style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
        >
          {badge.label}
        </span>
      </div>
      <p className="text-xs font-semibold text-[#111] truncate">{titulo}</p>
      <p className="text-[11px] text-[#6b7280] truncate mt-0.5">{orden.cliente_nombre || '—'}</p>
      <p className="text-[10px] text-[#9ca3af] mt-2 flex items-center gap-1">
        <span>⏱</span>
        <span>{tiempoEnEstado(orden.updated_at)}</span>
      </p>
    </Link>
  );
}

function Columna({ col, ordenes }) {
  if (!ordenes || ordenes.length === 0) return null;
  return (
    <div className="flex-shrink-0 w-48">
      <div
        className="flex items-center gap-2 mb-3 px-1"
        style={{ borderBottom: `2px solid ${col.color}`, paddingBottom: 6 }}
      >
        <span className="text-[11px] font-bold text-[#111] uppercase tracking-wider leading-tight">
          {col.label}
        </span>
        <span
          className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
          style={{ background: col.color, color: '#fff' }}
        >
          {ordenes.length}
        </span>
      </div>
      <div className="space-y-2">
        {ordenes.map(o => <OrdenCard key={o.id} orden={o} />)}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [agrupado, setAgrupado] = useState({});
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const r = await getPipeline();
      setAgrupado(r.data?.data ?? {});
      setUltimaActualizacion(new Date());
    } catch {
      // silencioso — no interrumpir el polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [cargar]);

  const total = Object.values(agrupado).reduce((s, arr) => s + arr.length, 0);
  const fmtHora = d => d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-[#111]">Pipeline</h1>
          {!loading && (
            <span className="bg-[#eff6ff] text-[#1d4ed8] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {total} activas
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {ultimaActualizacion && (
            <span className="text-[11px] text-[#9ca3af]">
              Actualizado {fmtHora(ultimaActualizacion)} · refresca cada 30s
            </span>
          )}
          <button
            onClick={cargar}
            className="text-xs text-[#1d4ed8] border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 rounded-lg hover:bg-[#dbeafe]"
          >
            ↻ Actualizar
          </button>
          <Link
            to="/ordenes/nueva"
            className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Nueva OT
          </Link>
        </div>
      </div>

      {/* Leyenda de flujos */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {Object.entries(FLUJO_BADGE).map(([k, v]) => (
          <span
            key={k}
            style={{ background: v.bg, color: v.text, borderColor: v.border }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded border"
          >
            {v.label} — {k === 'flujo_1' ? 'Cotización previa' : k === 'flujo_2' ? 'Diagnóstico' : 'Progresivo'}
          </span>
        ))}
      </div>

      {/* Tablero */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af]">Cargando pipeline…</div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af]">
          <div className="text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold text-[#111]">Sin órdenes activas</p>
            <p className="text-sm mt-1">Todas las órdenes han sido entregadas</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNAS.map(col => (
            <Columna key={col.key} col={col} ordenes={agrupado[col.key]} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
cd ~/autofix
git add frontend/src/pages/PipelinePage.jsx
git commit -m "feat: PipelinePage con kanban de columnas por estatus y polling 30s"
```

---

## Task 6: Frontend — Sidebar + App.jsx + Deploy

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Paso 1: Agregar Pipeline al array OPERACIONES en Sidebar.jsx**

Reemplazar:

```js
const OPERACIONES = [
  { to: '/autos', label: 'Autos', ...
  { to: '/clientes', label: 'Clientes', ...
  { to: '/ordenes', label: 'Órdenes', badge: true, ...
  { to: '/cotizaciones', label: 'Cotizador', ...
];
```

Por:

```js
const OPERACIONES = [
  { to: '/pipeline', label: 'Pipeline', badge: true,
    icon: <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /> },
  { to: '/autos', label: 'Autos',
    icon: <Icon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4" /> },
  { to: '/clientes', label: 'Clientes',
    icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /> },
  { to: '/ordenes', label: 'Órdenes',
    icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
  { to: '/cotizaciones', label: 'Cotizador',
    icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
];
```

Nota: el badge del Pipeline usa el mismo contador `otActivas` que ya existe en el componente.

- [ ] **Paso 2: Agregar ruta `/pipeline` en App.jsx**

En `frontend/src/App.jsx`, agregar el import:

```js
import PipelinePage from './pages/PipelinePage';
```

Y dentro de `<Routes>` agregar:

```jsx
<Route path="/pipeline" element={<PipelinePage />} />
```

(Insertar antes de la ruta `/` de BitacoraPage.)

- [ ] **Paso 3: Build y deploy frontend**

```bash
cd ~/autofix/frontend && npm run build
rsync -az frontend/dist/ root@62.238.3.136:/root/autofix/frontend/dist/
```

Resultado esperado: `✓ built in X.XXs`

- [ ] **Paso 4: Deploy backend**

```bash
rsync -az ~/autofix/backend/src/ root@62.238.3.136:/root/autofix/backend/src/
ssh root@62.238.3.136 "pm2 reload autofix-backend"
```

- [ ] **Paso 5: Verificar en producción**

Abrir `http://62.238.3.136:8082/pipeline` y confirmar:
- Las órdenes activas aparecen como tarjetas en sus columnas correspondientes
- El badge F2 aparece en las tarjetas de órdenes existentes
- Cada 30 segundos el texto "Actualizado XX:XX" cambia

- [ ] **Paso 6: Commit final Plan A**

```bash
cd ~/autofix
git add frontend/src/components/Sidebar.jsx frontend/src/App.jsx
git commit -m "feat: Pipeline en sidebar y routing — Plan A completo"
```
