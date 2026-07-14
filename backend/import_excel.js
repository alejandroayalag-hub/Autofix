// Script de importación de bitácora Excel → SQLite AutoFix
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Database = require('better-sqlite3');
const xlsx = require('xlsx');

const dbPath = path.resolve(process.env.DB_PATH || './autofix.db');
const db = new Database(dbPath);

const EXCEL_FILE = '/home/alejandroayalag/Downloads/archivo maestro Autofix.xlsx';
const SHEET_NAME = 'Vitacora de servicios ';

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return d.toISOString().slice(0, 10);
}

function trim(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

const wb = xlsx.readFile(EXCEL_FILE);
const ws = wb.Sheets[SHEET_NAME];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

// Preparar statements
const findCliente = db.prepare('SELECT id FROM clientes WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))');
const insertCliente = db.prepare(
  'INSERT INTO clientes (nombre) VALUES (?) RETURNING id'
);
const insertServicio = db.prepare(`
  INSERT INTO servicios
    (placa, marca, modelo, anio, vin, motor, cliente_id, cliente_nombre,
     odometro, fecha, tipo_servicio, cotizacion, costo, precio, utilidad, notas)
  VALUES
    (@placa, @marca, @modelo, @anio, @vin, @motor, @cliente_id, @cliente_nombre,
     @odometro, @fecha, @tipo_servicio, @cotizacion, @costo, @precio, @utilidad, @notas)
`);

let importados = 0;
let omitidos = 0;

const run = db.transaction(() => {
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    const cons = row[0];
    // Skip rows without a consecutive integer or with no useful data
    if (!cons || typeof cons !== 'number' || !Number.isInteger(cons)) continue;

    const clienteNombre = trim(row[8]);
    const tipoServicio  = trim(row[11]);
    const placa         = trim(row[1]);

    // Skip rows with no meaningful data
    if (!clienteNombre && !tipoServicio && !placa) continue;
    // Skip blank total rows (only have costo/precio/utilidad = 0)
    if (!clienteNombre && !tipoServicio && !placa) continue;

    const marca    = trim(row[2]);
    const modelo   = trim(row[3]);
    const anio     = (row[4] && Number.isInteger(row[4])) ? row[4] : null;
    const vin      = trim(row[5]);
    const motor    = trim(row[6]);
    const odometro = (row[9] && typeof row[9] === 'number') ? Math.round(row[9]) : null;
    const fecha    = excelDateToISO(row[10]) || '2025-01-01';
    const cotRef   = trim(row[12]);
    const costo    = (row[13] != null && typeof row[13] === 'number' && row[13] > 0) ? row[13] : null;
    const precio   = (row[14] != null && typeof row[14] === 'number' && row[14] > 0) ? row[14] : null;
    const utilidad = (precio != null && costo != null) ? precio - costo : null;
    const notasPago = trim(row[16]);
    const notas = [cotRef, notasPago].filter(Boolean).join(' | ') || null;

    // Find or create cliente
    let clienteId = null;
    if (clienteNombre) {
      const existing = findCliente.get(clienteNombre);
      if (existing) {
        clienteId = existing.id;
      } else {
        const nuevo = insertCliente.get(clienteNombre);
        clienteId = nuevo.id;
        console.log(`  + Cliente creado: ${clienteNombre} (id=${clienteId})`);
      }
    }

    insertServicio.run({
      placa: placa || 'S/P', marca, modelo, anio, vin, motor,
      cliente_id: clienteId,
      cliente_nombre: clienteNombre,
      odometro, fecha,
      tipo_servicio: tipoServicio,
      cotizacion: null,
      costo, precio, utilidad, notas,
    });

    console.log(`  ✓ [${cons}] ${placa || '—'} ${marca || ''} ${modelo || ''} | ${clienteNombre || '—'} | ${tipoServicio || '—'}`);
    importados++;
  }
});

console.log('Importando bitácora Excel → AutoFix...\n');
run();
console.log(`\nListo: ${importados} servicios importados, ${omitidos} omitidos.`);
db.close();
