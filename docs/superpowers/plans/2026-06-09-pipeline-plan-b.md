# Pipeline + 3 Flujos — Plan B: Flujos, Progreso y Cierre Unificado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar el selector de 3 flujos al crear órdenes, registro de progreso y gastos en detalle de orden, lógica de Flujo 3 (pausar + consultar cliente), y el cierre unificado con remisión PDF + WhatsApp.

**Architecture:** Plan B depende de Plan A completado. Se modifica `OrdenRecepcionPage` para elegir flujo, `OrdenDetallePage` para progreso/gastos/F3, y `OrdenCierrePage` para generar remisión PDF (pdfkit en el backend, PDF servido desde `/var/www/html/remisiones/`) y abrir WhatsApp con link + forma de pago.

**Tech Stack:** Node.js + pdfkit (nuevo), React + Vite + Tailwind.

**Prerequisito:** Plan A completado y desplegado.

---

## Task 1: Backend — remisiones.js + pdfkit

**Files:**
- Create: `backend/src/routes/remisiones.js`
- Modify: `backend/src/index.js`

- [ ] **Paso 1: Instalar pdfkit en el backend**

```bash
cd ~/autofix/backend && npm install pdfkit
```

Resultado esperado: `added X packages` sin errores.

- [ ] **Paso 2: Crear directorio de PDFs en el servidor**

```bash
ssh root@62.238.3.136 "mkdir -p /var/www/html/remisiones && chmod 755 /var/www/html/remisiones"
```

Los PDFs quedarán accesibles en `http://62.238.3.136:8082/remisiones/`.

- [ ] **Paso 3: Crear `backend/src/routes/remisiones.js`**

```js
const router = require('express').Router();
const db = require('../db/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const PDF_DIR = process.env.PDF_DIR || '/var/www/html/remisiones';
const BASE_URL = process.env.BASE_URL || 'http://62.238.3.136:8082';

const fmt = n => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN` : '—';

const siguienteFolio = () => {
  const anio = new Date().getFullYear();
  const last = db.prepare(
    `SELECT numero_folio FROM remisiones WHERE numero_folio LIKE 'REM-${anio}-%' ORDER BY id DESC LIMIT 1`
  ).get();
  const seq = last
    ? String(parseInt(last.numero_folio.split('-')[2], 10) + 1).padStart(4, '0')
    : '0001';
  return `REM-${anio}-${seq}`;
};

// POST /api/remisiones — genera remisión para una orden
router.post('/', (req, res) => {
  const { orden_id, forma_pago } = req.body;
  if (!orden_id) return res.status(400).json({ error: 'orden_id requerido' });

  const ot = db.prepare(`
    SELECT ot.*, a.placa, a.marca, a.modelo, a.anio, a.vin, a.motor, a.color,
           cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono, cl.rfc
    FROM ordenes_trabajo ot
    LEFT JOIN autos a ON a.id = ot.auto_id
    LEFT JOIN clientes cl ON cl.id = ot.cliente_id
    WHERE ot.id = ?
  `).get(orden_id);
  if (!ot) return res.status(404).json({ error: 'Orden no encontrada' });

  // Items de la cotización aprobada
  const cot = db.prepare(
    `SELECT * FROM cotizaciones WHERE orden_id = ? ORDER BY id DESC LIMIT 1`
  ).get(orden_id);
  const items = cot
    ? db.prepare('SELECT * FROM cotizacion_items WHERE cotizacion_id = ?').all(cot.id)
    : [];

  // Gastos (Flujo 3)
  const gastos = db.prepare('SELECT * FROM orden_gastos WHERE orden_id = ? ORDER BY created_at ASC').all(orden_id);

  const totalServicios = items.reduce((s, i) => s + (i.subtotal_precio || i.precio_unitario || 0), 0);
  const totalGastos    = gastos.reduce((s, g) => s + g.monto, 0);
  const total          = totalServicios + totalGastos || ot.precio_real || 0;

  const folio    = siguienteFolio();
  const fecha    = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const fileName = `${folio}.pdf`;
  const filePath = path.join(PDF_DIR, fileName);

  // Crear PDF
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // — Encabezado —
  doc.fontSize(20).font('Helvetica-Bold').text('AutoFix Querétaro', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
     .text('Taller de servicios automotrices', 50, 75);
  doc.fillColor('#111111');

  doc.fontSize(16).font('Helvetica-Bold').text('REMISIÓN DE SERVICIO', 350, 50, { align: 'right' });
  doc.fontSize(10).font('Helvetica')
     .text(`Folio: ${folio}`, 350, 75, { align: 'right' })
     .text(`Fecha: ${fecha}`, 350, 90, { align: 'right' });

  doc.moveTo(50, 115).lineTo(560, 115).strokeColor('#e5e5e5').stroke();

  // — Datos del vehículo —
  doc.y = 130;
  doc.fontSize(10).font('Helvetica-Bold').text('DATOS DEL VEHÍCULO', 50);
  doc.fontSize(9).font('Helvetica').moveDown(0.3);

  const filaVehiculo = [
    ['Placa', ot.placa || '—'],
    ['Vehículo', [ot.marca, ot.modelo, ot.anio].filter(Boolean).join(' ') || '—'],
    ['Motor', ot.motor || '—'],
    ['Color', ot.color || '—'],
    ['VIN', ot.vin || '—'],
  ];
  filaVehiculo.forEach(([k, v]) => {
    doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v);
  });

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#e5e5e5').stroke();
  doc.moveDown(0.5);

  // — Datos del cliente —
  doc.fontSize(10).font('Helvetica-Bold').text('CLIENTE');
  doc.fontSize(9).font('Helvetica').moveDown(0.3);
  doc.font('Helvetica-Bold').text('Nombre: ', { continued: true }).font('Helvetica').text(ot.cliente_nombre || '—');
  doc.font('Helvetica-Bold').text('Teléfono: ', { continued: true }).font('Helvetica').text(ot.cliente_telefono || '—');
  if (ot.rfc) doc.font('Helvetica-Bold').text('RFC: ', { continued: true }).font('Helvetica').text(ot.rfc);

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#e5e5e5').stroke();
  doc.moveDown(0.5);

  // — Servicios realizados —
  doc.fontSize(10).font('Helvetica-Bold').text('SERVICIOS REALIZADOS');
  doc.moveDown(0.3);

  if (items.length === 0 && gastos.length === 0) {
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
       .text(ot.notas_recepcion || 'Servicio realizado según indicaciones del cliente');
    doc.fillColor('#111111');
  } else {
    // Encabezado tabla
    const col = { desc: 50, cant: 360, precio: 420, subtotal: 490 };
    doc.fontSize(8).font('Helvetica-Bold')
       .text('Descripción', col.desc, doc.y)
       .text('Cant.', col.cant, doc.y - 10)
       .text('Precio', col.precio, doc.y - 10)
       .text('Subtotal', col.subtotal, doc.y - 10);
    doc.moveTo(50, doc.y + 2).lineTo(560, doc.y + 2).strokeColor('#e5e5e5').stroke();
    doc.moveDown(0.4);

    items.forEach(it => {
      const y = doc.y;
      doc.fontSize(8).font('Helvetica')
         .text(it.descripcion, col.desc, y, { width: 290 })
         .text(String(it.cantidad || 1), col.cant, y)
         .text(fmt(it.precio_unitario), col.precio, y)
         .text(fmt(it.subtotal_precio || it.precio_unitario), col.subtotal, y);
      doc.moveDown(0.5);
    });

    if (gastos.length > 0) {
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text('REFACCIONES Y MATERIALES');
      doc.moveDown(0.2);
      gastos.forEach(g => {
        const y = doc.y;
        const tipoLabel = g.tipo === 'refaccion' ? 'Refacción' : g.tipo === 'mano_obra' ? 'Mano de obra' : 'Otro';
        doc.fontSize(8).font('Helvetica')
           .text(`${g.descripcion} (${tipoLabel})`, col.desc, y, { width: 340 })
           .text(fmt(g.monto), col.subtotal, y);
        doc.moveDown(0.5);
      });
    }
  }

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#111').stroke();
  doc.moveDown(0.4);

  // — Total y forma de pago —
  const fpLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia bancaria', tarjeta: 'Tarjeta', credito: 'Crédito / Por cobrar' };
  doc.fontSize(11).font('Helvetica-Bold')
     .text(`TOTAL: ${fmt(total)}`, 350, doc.y, { align: 'right' });
  doc.fontSize(9).font('Helvetica').fillColor('#374151')
     .text(`Forma de pago: ${fpLabel[forma_pago] || forma_pago || '—'}`, 350, doc.y + 4, { align: 'right' });
  doc.fillColor('#111111');

  doc.moveDown(3);
  doc.moveTo(50, doc.y).lineTo(200, doc.y).strokeColor('#111').stroke();
  doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text('Firma de recepción', 50, doc.y + 4);
  doc.fillColor('#111111');

  doc.moveDown(2);
  doc.fontSize(7).fillColor('#9ca3af')
     .text('AutoFix Querétaro — gracias por su preferencia', 50, doc.y, { align: 'center' });

  doc.end();

  stream.on('finish', () => {
    const pdfUrl = `${BASE_URL}/remisiones/${fileName}`;
    const r = db.prepare(`
      INSERT INTO remisiones (orden_id, numero_folio, total, forma_pago, pdf_path)
      VALUES (?, ?, ?, ?, ?)
    `).run(orden_id, folio, total, forma_pago || null, pdfUrl);
    const remision = db.prepare('SELECT * FROM remisiones WHERE id = ?').get(r.lastInsertRowid);

    // Actualizar forma_pago en la orden
    if (forma_pago) {
      db.prepare("UPDATE ordenes_trabajo SET forma_pago = ?, updated_at = datetime('now') WHERE id = ?")
        .run(forma_pago, orden_id);
    }

    res.status(201).json({ data: { ...remision, pdf_url: pdfUrl } });
  });

  stream.on('error', (err) => {
    console.error('[remisiones] Error PDF:', err);
    res.status(500).json({ error: 'Error al generar PDF' });
  });
});

// GET /api/remisiones/:id — obtener remisión
router.get('/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM remisiones WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Remisión no encontrada' });
  res.json({ data: r });
});

// GET /api/remisiones/orden/:orden_id — remisión de una orden
router.get('/orden/:orden_id', (req, res) => {
  const r = db.prepare('SELECT * FROM remisiones WHERE orden_id = ? ORDER BY id DESC LIMIT 1').get(req.params.orden_id);
  res.json({ data: r || null });
});

module.exports = router;
```

- [ ] **Paso 4: Registrar la ruta en `backend/src/index.js`**

Agregar después de las rutas de gastos y progresos:

```js
app.use('/api/remisiones', auth, require('./routes/remisiones'));
```

- [ ] **Paso 5: Verificar que el backend arranca con pdfkit**

```bash
cd ~/autofix/backend && node -e "require('./src/routes/remisiones'); console.log('pdfkit OK')"
```

Resultado esperado: `pdfkit OK`

- [ ] **Paso 6: Commit**

```bash
cd ~/autofix
git add backend/src/routes/remisiones.js backend/src/index.js backend/package.json backend/package-lock.json
git commit -m "feat: remisiones con generación de PDF via pdfkit"
```

---

## Task 2: Frontend — API client remisiones.js

**Files:**
- Create: `frontend/src/api/remisiones.js`

- [ ] **Paso 1: Crear `frontend/src/api/remisiones.js`**

```js
import api from './client';

export const crearRemision  = (orden_id, forma_pago) =>
  api.post('/remisiones', { orden_id, forma_pago });

export const getRemision    = (id) => api.get(`/remisiones/${id}`);

export const getRemisionOrden = (orden_id) =>
  api.get(`/remisiones/orden/${orden_id}`);
```

- [ ] **Paso 2: Commit**

```bash
cd ~/autofix
git add frontend/src/api/remisiones.js
git commit -m "feat: API client para remisiones"
```

---

## Task 3: Frontend — OrdenRecepcionPage: selector de flujo

**Files:**
- Modify: `frontend/src/pages/OrdenRecepcionPage.jsx`

- [ ] **Paso 1: Leer el archivo actual para entender la estructura**

```bash
head -60 ~/autofix/frontend/src/pages/OrdenRecepcionPage.jsx
```

- [ ] **Paso 2: Agregar estado `tipoFlujo` al componente**

Al inicio de la función `OrdenRecepcionPage`, agregar después de los estados existentes:

```js
const [tipoFlujo, setTipoFlujo] = useState(null); // null = no seleccionado aún
```

- [ ] **Paso 3: Reemplazar el return del render por un selector de flujo antes del formulario**

Envolver el contenido actual del return en una condicional. Antes del formulario existente, mostrar el selector si `tipoFlujo === null`:

```jsx
if (!tipoFlujo) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#6b7280] hover:text-[#111]">←</button>
        <h1 className="text-base font-bold text-[#111]">Nueva orden de trabajo</h1>
      </div>
      <p className="text-sm text-[#6b7280]">Selecciona cómo llega este servicio al taller:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'flujo_1',
            titulo: 'Flujo 1',
            subtitulo: 'Cotización previa',
            desc: 'El cliente aprobó por teléfono. Se genera cotización antes de recibir la unidad.',
            badge: '#eff6ff',
            badgeText: '#1d4ed8',
            border: '#bfdbfe',
          },
          {
            key: 'flujo_2',
            titulo: 'Flujo 2',
            subtitulo: 'Diagnóstico en taller',
            desc: 'La unidad llega sin cita. Se diagnostica y cotiza con el auto presente.',
            badge: '#f3f4f6',
            badgeText: '#374151',
            border: '#d1d5db',
          },
          {
            key: 'flujo_3',
            titulo: 'Flujo 3',
            subtitulo: 'Reparación progresiva',
            desc: 'Costo variable. Los gastos se registran en tiempo real y se consulta al cliente ante imprevistos.',
            badge: '#fff7ed',
            badgeText: '#c2410c',
            border: '#fed7aa',
          },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setTipoFlujo(f.key)}
            className="text-left p-5 rounded-xl border-2 hover:shadow-md transition-all"
            style={{ borderColor: f.border, background: f.badge }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-extrabold" style={{ color: f.badgeText }}>{f.titulo}</span>
              <span className="text-xs font-semibold" style={{ color: f.badgeText }}>{f.subtitulo}</span>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed">{f.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Paso 4: Pasar `tipo_flujo` al crear la orden**

En la función `handleGuardar` (o la que llama a `createOrden`), agregar `tipo_flujo: tipoFlujo` al objeto que se envía:

```js
const r = await createOrden({
  ...datosExistentes,
  tipo_flujo: tipoFlujo,
  // Para Flujo 1: estatus inicial debe ser 'en_cotizacion'
  ...(tipoFlujo === 'flujo_1' ? { estatus_inicial: 'en_cotizacion' } : {}),
});
```

- [ ] **Paso 5: Actualizar el backend para aceptar `estatus_inicial`**

En `backend/src/routes/ordenes.js`, en el `router.post('/')`, cambiar el INSERT para usar `estatus_inicial` cuando se pasa:

```js
const { auto_id, cliente_id, odometro, fecha_entrega_estimada, notas_recepcion, tipo_servicio, tipo_flujo, estatus_inicial } = req.body;
if (!auto_id) return res.status(400).json({ error: 'auto_id es requerido' });

// Validar estatus inicial permitido
const ESTATUS_INICIALES_VALIDOS = ['recepcion', 'en_cotizacion'];
const estatusInicial = ESTATUS_INICIALES_VALIDOS.includes(estatus_inicial) ? estatus_inicial : 'recepcion';
const tipoFlujoVal = ['flujo_1', 'flujo_2', 'flujo_3'].includes(tipo_flujo) ? tipo_flujo : 'flujo_2';

// ... (resto del código existente)
const r = db.prepare(`
  INSERT INTO ordenes_trabajo (auto_id, cliente_id, estatus, tipo_flujo, odometro, fecha_entrega_estimada, notas_recepcion, tipo_servicio)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(auto_id, cid, estatusInicial, tipoFlujoVal, odometro || null, fecha_entrega_estimada || null, notas_recepcion || null, tipo_servicio || null);
```

- [ ] **Paso 6: Mostrar indicador del flujo seleccionado en el formulario**

En el formulario (cuando `tipoFlujo !== null`), agregar un banner en la parte superior:

```jsx
<div
  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold mb-4"
  style={tipoFlujo === 'flujo_1' ? { background: '#eff6ff', color: '#1d4ed8' }
       : tipoFlujo === 'flujo_3' ? { background: '#fff7ed', color: '#c2410c' }
       : { background: '#f3f4f6', color: '#374151' }}
>
  <span>
    {tipoFlujo === 'flujo_1' ? 'Flujo 1 — Cotización previa'
   : tipoFlujo === 'flujo_3' ? 'Flujo 3 — Reparación progresiva'
   : 'Flujo 2 — Diagnóstico en taller'}
  </span>
  <button onClick={() => setTipoFlujo(null)} className="ml-auto text-xs underline opacity-70 hover:opacity-100">
    Cambiar
  </button>
</div>
```

- [ ] **Paso 7: Commit**

```bash
cd ~/autofix
git add frontend/src/pages/OrdenRecepcionPage.jsx backend/src/routes/ordenes.js
git commit -m "feat: selector de flujo (F1/F2/F3) en nueva orden"
```

---

## Task 4: Frontend — OrdenDetallePage: progreso, gastos y acciones F3

**Files:**
- Modify: `frontend/src/pages/OrdenDetallePage.jsx`

- [ ] **Paso 1: Agregar imports de los nuevos API clients**

Al inicio de `OrdenDetallePage.jsx`, agregar:

```js
import { getProgresos, addProgreso, deleteProgreso } from '../api/progresos';
import { getGastos, addGasto, deleteGasto } from '../api/gastos';
```

- [ ] **Paso 2: Agregar estados para progreso, gastos y F3**

Dentro del componente, agregar después de los estados existentes:

```js
const [progresos, setProgresos]         = useState([]);
const [gastos, setGastos]               = useState([]);
const [totalGastos, setTotalGastos]     = useState(0);
const [nuevoProgreso, setNuevoProgreso] = useState('');
const [nuevoGasto, setNuevoGasto]       = useState({ descripcion: '', monto: '', tipo: 'refaccion' });
const [guardandoProg, setGuardandoProg] = useState(false);
const [guardandoGasto, setGuardandoGasto] = useState(false);
```

- [ ] **Paso 3: Cargar progresos y gastos junto con la orden**

Modificar la función `cargar` para que también cargue progresos y gastos cuando el estatus lo amerita:

```js
const cargar = () => {
  setLoading(true);
  getOrden(id)
    .then(data => {
      const o = data.data?.data ?? data.data;
      setOrden(o);
      // Cargar progresos si está en taller o más adelante
      const estadosTaller = ['en_taller', 'pausado_consulta', 'listo_entrega', 'en_cierre', 'entregado'];
      if (estadosTaller.includes(o?.estatus)) {
        getProgresos(id).then(r => setProgresos(r.data?.data ?? [])).catch(() => {});
        getGastos(id).then(r => { setGastos(r.data?.data ?? []); setTotalGastos(r.data?.total ?? 0); }).catch(() => {});
      }
    })
    .catch(() => setError('No se pudo cargar la orden'))
    .finally(() => setLoading(false));
};
```

- [ ] **Paso 4: Agregar handlers para progreso**

```js
const handleAddProgreso = async () => {
  if (!nuevoProgreso.trim()) return;
  setGuardandoProg(true);
  try {
    await addProgreso(id, nuevoProgreso.trim());
    setNuevoProgreso('');
    const r = await getProgresos(id);
    setProgresos(r.data?.data ?? []);
  } finally { setGuardandoProg(false); }
};

const handleDeleteProgreso = async (progId) => {
  await deleteProgreso(id, progId);
  const r = await getProgresos(id);
  setProgresos(r.data?.data ?? []);
};
```

- [ ] **Paso 5: Agregar handlers para gastos**

```js
const handleAddGasto = async () => {
  if (!nuevoGasto.descripcion.trim() || !nuevoGasto.monto) return;
  setGuardandoGasto(true);
  try {
    await addGasto(id, { descripcion: nuevoGasto.descripcion.trim(), monto: Number(nuevoGasto.monto), tipo: nuevoGasto.tipo });
    setNuevoGasto({ descripcion: '', monto: '', tipo: 'refaccion' });
    const r = await getGastos(id);
    setGastos(r.data?.data ?? []);
    setTotalGastos(r.data?.total ?? 0);
  } finally { setGuardandoGasto(false); }
};

const handleDeleteGasto = async (gastoId) => {
  await deleteGasto(id, gastoId);
  const r = await getGastos(id);
  setGastos(r.data?.data ?? []);
  setTotalGastos(r.data?.total ?? 0);
};
```

- [ ] **Paso 6: Agregar sección de Progreso en el render**

Agregar después del bloque "Datos de la OT" y antes de "Acciones", mostrar cuando el estatus es `en_taller`, `pausado_consulta`, `listo_entrega`, o `en_cierre`:

```jsx
{['en_taller', 'pausado_consulta', 'listo_entrega', 'en_cierre', 'entregado'].includes(estatusActual) && (
  <div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
    <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">Bitácora de progreso</p>

    {progresos.length === 0 && (
      <p className="text-sm text-[#9ca3af]">Sin registros de progreso aún.</p>
    )}
    <div className="space-y-2">
      {progresos.map(p => (
        <div key={p.id} className="flex items-start gap-3 bg-[#f9fafb] rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#111]">{p.descripcion}</p>
            <p className="text-[10px] text-[#9ca3af] mt-0.5">
              {new Date(p.created_at).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
            </p>
          </div>
          {estatusActual === 'en_taller' && (
            <button onClick={() => handleDeleteProgreso(p.id)} className="text-[#dc2626] text-xs hover:text-red-700 shrink-0">✕</button>
          )}
        </div>
      ))}
    </div>

    {estatusActual === 'en_taller' && (
      <div className="flex gap-2">
        <input
          value={nuevoProgreso}
          onChange={e => setNuevoProgreso(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddProgreso()}
          placeholder="Ej: Cambio de aceite completado, esperando refacción..."
          className="flex-1 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
        />
        <button
          onClick={handleAddProgreso}
          disabled={guardandoProg || !nuevoProgreso.trim()}
          className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + Agregar
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Paso 7: Agregar sección de Gastos (solo para Flujo 3)**

Agregar después de la sección de Progreso:

```jsx
{orden?.tipo_flujo === 'flujo_3' && ['en_taller', 'pausado_consulta', 'listo_entrega', 'en_cierre', 'entregado'].includes(estatusActual) && (
  <div className="bg-white rounded-xl border border-[#fed7aa] p-5 space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-[#c2410c] uppercase tracking-wider font-semibold">Gastos progresivos (Flujo 3)</p>
      <span className="text-sm font-bold text-[#111]">
        Total: ${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </span>
    </div>

    {gastos.length === 0 && <p className="text-sm text-[#9ca3af]">Sin gastos registrados.</p>}
    <div className="space-y-2">
      {gastos.map(g => (
        <div key={g.id} className="flex items-center gap-3 bg-[#fff7ed] rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#111]">{g.descripcion}</p>
            <span className="text-[10px] text-[#9ca3af]">
              {g.tipo === 'refaccion' ? 'Refacción' : g.tipo === 'mano_obra' ? 'Mano de obra' : 'Otro'}
            </span>
          </div>
          <span className="text-sm font-bold text-[#c2410c] shrink-0">
            ${Number(g.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          {estatusActual === 'en_taller' && (
            <button onClick={() => handleDeleteGasto(g.id)} className="text-[#dc2626] text-xs shrink-0">✕</button>
          )}
        </div>
      ))}
    </div>

    {estatusActual === 'en_taller' && (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          value={nuevoGasto.descripcion}
          onChange={e => setNuevoGasto(g => ({ ...g, descripcion: e.target.value }))}
          placeholder="Descripción"
          className="sm:col-span-2 border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2410c]"
        />
        <input
          type="number"
          value={nuevoGasto.monto}
          onChange={e => setNuevoGasto(g => ({ ...g, monto: e.target.value }))}
          placeholder="Monto $"
          className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c2410c]"
        />
        <select
          value={nuevoGasto.tipo}
          onChange={e => setNuevoGasto(g => ({ ...g, tipo: e.target.value }))}
          className="border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="refaccion">Refacción</option>
          <option value="mano_obra">Mano de obra</option>
          <option value="otro">Otro</option>
        </select>
        <button
          onClick={handleAddGasto}
          disabled={guardandoGasto || !nuevoGasto.descripcion.trim() || !nuevoGasto.monto}
          className="sm:col-span-4 bg-[#c2410c] hover:bg-[#9a3412] disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold"
        >
          + Agregar gasto
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Paso 8: Agregar botones de Flujo 3 en la sección "Acciones"**

Dentro del bloque `estatusActual === 'en_taller'`, después del botón "Marcar listo", agregar:

```jsx
{/* Botón convertir a Flujo 3 */}
{orden?.tipo_flujo !== 'flujo_3' && (
  <button
    onClick={() => avanzarEstatus('en_taller')} // placeholder — ver paso 9
    className="border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#ffedd5]"
  >
    ↗ Convertir a Flujo 3
  </button>
)}
{/* Botón consultar cliente (solo F3) */}
{orden?.tipo_flujo === 'flujo_3' && (
  <button
    onClick={() => avanzarEstatus('pausado_consulta')}
    disabled={saving}
    className="bg-[#dc2626] hover:bg-[#b91c1c] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
  >
    {saving ? '...' : '⚠ Problema mayor — consultar cliente'}
  </button>
)}
```

- [ ] **Paso 9: Agregar handler de "Convertir a Flujo 3"**

Importar `updateOrdenTipoFlujo` del API client:

```js
import { getOrden, updateOrdenEstatus, updateOrdenTipoFlujo } from '../api/ordenes';
```

Reemplazar el botón placeholder con la lógica real:

```jsx
<button
  onClick={async () => {
    if (!confirm('¿Convertir esta orden a Flujo 3 (reparación progresiva)? Se habilitará el registro de gastos en tiempo real.')) return;
    setSaving(true);
    try {
      await updateOrdenTipoFlujo(id, 'flujo_3');
      await cargar();
    } catch { setError('Error al convertir'); }
    finally { setSaving(false); }
  }}
  disabled={saving}
  className="border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#ffedd5] disabled:opacity-50"
>
  ↗ Convertir a Flujo 3
</button>
```

- [ ] **Paso 10: Agregar acciones para `pausado_consulta` en la sección Acciones**

Después del bloque `estatusActual === 'en_taller'`, agregar:

```jsx
{estatusActual === 'pausado_consulta' && (
  <div className="space-y-3">
    <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg px-4 py-3">
      <p className="text-sm font-semibold text-[#dc2626] mb-1">⚠ Orden pausada — esperando decisión del cliente</p>
      <p className="text-xs text-[#374151]">
        Gastos acumulados: <strong>${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
      </p>
    </div>
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => avanzarEstatus('en_taller')}
        disabled={saving}
        className="bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
      >
        {saving ? '...' : '✓ Cliente aprobó — continuar trabajo'}
      </button>
      <button
        onClick={() => avanzarEstatus('listo_entrega')}
        disabled={saving}
        className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-semibold"
      >
        {saving ? '...' : '✓ Cliente pidió cerrar — ir a entrega'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Paso 11: Commit**

```bash
cd ~/autofix
git add frontend/src/pages/OrdenDetallePage.jsx
git commit -m "feat: progreso, gastos F3 y consulta cliente en OrdenDetallePage"
```

---

## Task 5: Frontend — OrdenCierrePage: forma de pago, remisión y WhatsApp

**Files:**
- Modify: `frontend/src/pages/OrdenCierrePage.jsx`

- [ ] **Paso 1: Leer el archivo actual**

```bash
cat ~/autofix/frontend/src/pages/OrdenCierrePage.jsx
```

- [ ] **Paso 2: Agregar import de remisiones y estados nuevos**

```js
import { crearRemision, getRemisionOrden } from '../api/remisiones';
```

Agregar estados en el componente:

```js
const [formaPago, setFormaPago]       = useState('efectivo');
const [remision, setRemision]         = useState(null);
const [generandoPdf, setGenerandoPdf] = useState(false);
const [remisionError, setRemisionError] = useState('');
```

- [ ] **Paso 3: Cargar remisión existente al montar**

En el `useEffect` que carga la orden, agregar:

```js
getRemisionOrden(id)
  .then(r => { if (r.data?.data) setRemision(r.data.data); })
  .catch(() => {});
```

- [ ] **Paso 4: Agregar campo forma de pago al formulario de cierre**

Antes del botón de guardar/cerrar existente, agregar:

```jsx
<div>
  <label className="text-xs text-[#6b7280] mb-1 block">Forma de pago</label>
  <select
    value={formaPago}
    onChange={e => setFormaPago(e.target.value)}
    className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]"
  >
    <option value="efectivo">Efectivo</option>
    <option value="transferencia">Transferencia bancaria</option>
    <option value="tarjeta">Tarjeta</option>
    <option value="credito">Crédito / Por cobrar</option>
  </select>
</div>
```

- [ ] **Paso 5: Agregar sección de remisión PDF después del formulario de cierre**

Después del bloque de guardar existente:

```jsx
{/* Remisión */}
<div className="bg-white rounded-xl border border-[#e5e5e5] p-5 space-y-4">
  <p className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-semibold">Remisión de entrega</p>

  {remision ? (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-4 py-3">
        <span className="text-lg">📄</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#166534]">Folio {remision.numero_folio}</p>
          <p className="text-xs text-[#4ade80]">PDF generado — {remision.fecha}</p>
        </div>
        <a
          href={remision.pdf_path}
          target="_blank"
          rel="noreferrer"
          className="bg-[#166534] text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[#14532d]"
        >
          Ver PDF
        </a>
      </div>

      {/* WhatsApp */}
      {orden && (() => {
        const tel = (orden.cliente_telefono || '').replace(/\D/g, '');
        const fpLabel = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', credito: 'Crédito' };
        const msg = `Hola ${orden.cliente_nombre || 'cliente'}, tu ${orden.marca || ''} ${orden.modelo || ''} (${orden.placa || ''}) está lista ✅\n\nTotal: $${Number(remision.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} — Pago: ${fpLabel[remision.forma_pago] || remision.forma_pago || '—'}\n\nRemisión: ${remision.pdf_path}\n\nAutoFix Querétaro 🔧`;
        const waUrl = tel
          ? `https://wa.me/52${tel}?text=${encodeURIComponent(msg)}`
          : null;
        return waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#16a34a] hover:bg-[#15803d] text-white py-3 rounded-lg text-sm font-semibold"
          >
            <span>📲</span> Enviar por WhatsApp al cliente
          </a>
        ) : (
          <p className="text-xs text-[#9ca3af]">El cliente no tiene teléfono registrado.</p>
        );
      })()}
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm text-[#6b7280]">
        Genera la remisión una vez registrado el pago. Se creará un PDF y podrás enviarlo por WhatsApp.
      </p>
      {remisionError && <p className="text-sm text-[#dc2626]">{remisionError}</p>}
      <button
        onClick={async () => {
          setGenerandoPdf(true); setRemisionError('');
          try {
            const r = await crearRemision(Number(id), formaPago);
            setRemision(r.data?.data);
          } catch {
            setRemisionError('Error al generar la remisión. Intenta de nuevo.');
          } finally { setGenerandoPdf(false); }
        }}
        disabled={generandoPdf}
        className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] disabled:opacity-50 text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
      >
        {generandoPdf ? '⟳ Generando PDF…' : '📄 Generar remisión'}
      </button>
    </div>
  )}
</div>
```

- [ ] **Paso 6: Commit**

```bash
cd ~/autofix
git add frontend/src/pages/OrdenCierrePage.jsx
git commit -m "feat: forma de pago, remisión PDF y WhatsApp en cierre de orden"
```

---

## Task 6: Deploy Plan B

- [ ] **Paso 1: Build frontend**

```bash
cd ~/autofix/frontend && npm run build 2>&1 | tail -8
```

Resultado esperado: `✓ built in X.XXs`

- [ ] **Paso 2: Sync frontend al servidor**

```bash
rsync -az ~/autofix/frontend/dist/ root@62.238.3.136:/root/autofix/frontend/dist/
```

- [ ] **Paso 3: Sync backend al servidor (incluye package.json con pdfkit)**

```bash
rsync -az ~/autofix/backend/src/ root@62.238.3.136:/root/autofix/backend/src/
rsync -az ~/autofix/backend/package.json ~/autofix/backend/package-lock.json root@62.238.3.136:/root/autofix/backend/
```

- [ ] **Paso 4: Instalar pdfkit en el servidor**

```bash
ssh root@62.238.3.136 "cd /root/autofix/backend && npm install --production"
```

- [ ] **Paso 5: Recargar backend en producción**

```bash
ssh root@62.238.3.136 "pm2 reload autofix-backend"
```

- [ ] **Paso 6: Verificar en producción**

1. Abrir `/ordenes/nueva` → confirmar que aparece el selector de 3 flujos
2. Crear orden con Flujo 3 → confirmar badge naranja en pipeline
3. Abrir orden en taller → confirmar sección de progreso y gastos
4. Ir a cierre de una orden → confirmar selector de forma de pago y botón "Generar remisión"
5. Generar remisión → confirmar que el PDF abre en el navegador
6. Confirmar que el botón de WhatsApp incluye el link del PDF y la forma de pago

- [ ] **Paso 7: Commit final Plan B**

```bash
cd ~/autofix
git add -A
git commit -m "feat: Plan B completo — 3 flujos, progreso, gastos, remisión PDF y WhatsApp"
```
