const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const cotPublicaRouter = require('./routes/cotizacion_publica');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas públicas
app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/c', cotPublicaRouter);  // sin auth — ANTES de middleware global de auth

// Rutas protegidas
app.use('/api/clientes',      auth, require('./routes/clientes'));
app.use('/api/autos',         auth, require('./routes/autos'));
app.use('/api/servicios',     auth, require('./routes/servicios'));
app.use('/api/paquetes',      auth, require('./routes/paquetes'));
app.use('/api/cotizaciones',  auth, require('./routes/cotizaciones'));
app.use('/api/ordenes',       auth, require('./routes/ordenes'));
app.use('/api/financiero',    auth, require('./routes/financiero'));
app.use('/api/catalogo',     auth, require('./routes/catalogo'));
app.use('/api/actividades',  auth, require('./routes/actividades'));
app.use('/api/ordenes/:id/frenos', auth, require('./routes/diagnostico_frenos'));
app.use('/api/ordenes/:id/progresos', auth, require('./routes/progresos'));
app.use('/api/ordenes/:id/gastos',    auth, require('./routes/gastos'));
app.use('/api/ordenes/:id/checklist', auth, require('./routes/checklist'));
app.use('/api/ordenes/:id/remision',  auth, require('./routes/remisiones'));

// Servir frontend en producción
const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.use('/api', (_, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));
app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));

app.use(errorHandler);

app.listen(PORT, () => console.log(`AutoFix backend en http://localhost:${PORT}`));
