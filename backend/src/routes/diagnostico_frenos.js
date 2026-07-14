const router = require('express').Router({ mergeParams: true });
const db = require('../db/database');

const CAMPOS_MEDICION = [
  'di_balata_mm','di_disco_mm','di_balata_est','di_disco_est',
  'dd_balata_mm','dd_disco_mm','dd_balata_est','dd_disco_est',
  'ti_balata_mm','ti_disco_mm','ti_balata_est','ti_disco_est',
  'td_balata_mm','td_disco_mm','td_balata_est','td_disco_est',
  'liq_nivel','liq_estado','notas',
];

// GET /api/ordenes/:id/frenos
router.get('/', (req, res) => {
  const diag = db.prepare('SELECT * FROM diagnostico_frenos WHERE orden_id = ?').get(req.params.id);
  res.json(diag || null);
});

// POST /api/ordenes/:id/frenos  — crea o actualiza (upsert)
router.post('/', (req, res) => {
  const existing = db.prepare('SELECT id FROM diagnostico_frenos WHERE orden_id = ?').get(req.params.id);

  const pick = (campo) => {
    const v = req.body[campo];
    if (v === undefined || v === '') return null;
    return v;
  };
  const pickF = (campo) => {
    const v = req.body[campo];
    if (v === undefined || v === '' || v === null) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };
  const pickS = (campo, def = 'ok') => req.body[campo] || def;

  if (existing) {
    db.prepare(`
      UPDATE diagnostico_frenos SET
        di_balata_mm=?, di_disco_mm=?, di_balata_est=?, di_disco_est=?,
        dd_balata_mm=?, dd_disco_mm=?, dd_balata_est=?, dd_disco_est=?,
        ti_balata_mm=?, ti_disco_mm=?, ti_balata_est=?, ti_disco_est=?,
        td_balata_mm=?, td_disco_mm=?, td_balata_est=?, td_disco_est=?,
        liq_nivel=?, liq_estado=?, notas=?,
        updated_at=datetime('now')
      WHERE orden_id=?
    `).run(
      pickF('di_balata_mm'), pickF('di_disco_mm'), pickS('di_balata_est'), pickS('di_disco_est'),
      pickF('dd_balata_mm'), pickF('dd_disco_mm'), pickS('dd_balata_est'), pickS('dd_disco_est'),
      pickF('ti_balata_mm'), pickF('ti_disco_mm'), pickS('ti_balata_est'), pickS('ti_disco_est'),
      pickF('td_balata_mm'), pickF('td_disco_mm'), pickS('td_balata_est'), pickS('td_disco_est'),
      pickS('liq_nivel'), pickS('liq_estado'), pick('notas'),
      req.params.id
    );
  } else {
    db.prepare(`
      INSERT INTO diagnostico_frenos
        (orden_id,
         di_balata_mm, di_disco_mm, di_balata_est, di_disco_est,
         dd_balata_mm, dd_disco_mm, dd_balata_est, dd_disco_est,
         ti_balata_mm, ti_disco_mm, ti_balata_est, ti_disco_est,
         td_balata_mm, td_disco_mm, td_balata_est, td_disco_est,
         liq_nivel, liq_estado, notas)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      req.params.id,
      pickF('di_balata_mm'), pickF('di_disco_mm'), pickS('di_balata_est'), pickS('di_disco_est'),
      pickF('dd_balata_mm'), pickF('dd_disco_mm'), pickS('dd_balata_est'), pickS('dd_disco_est'),
      pickF('ti_balata_mm'), pickF('ti_disco_mm'), pickS('ti_balata_est'), pickS('ti_disco_est'),
      pickF('td_balata_mm'), pickF('td_disco_mm'), pickS('td_balata_est'), pickS('td_disco_est'),
      pickS('liq_nivel'), pickS('liq_estado'), pick('notas')
    );
  }

  const result = db.prepare('SELECT * FROM diagnostico_frenos WHERE orden_id = ?').get(req.params.id);
  res.json(result);
});

module.exports = router;
