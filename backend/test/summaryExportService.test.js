const assert = require('node:assert/strict');
const test = require('node:test');
const XLSX = require('xlsx');

const {
  SUMMARY_HEADERS,
  buildGeneralSummaryRows,
  buildGeneralSummaryWorkbook
} = require('../src/services/summaryExportService');

const dashboard = {
  fecha: '2026-10-15',
  rows: [
    {
      celda: 'CELDA_7',
      pieza: 'APRON OP80',
      totalsByShift: { 1: 121, 2: 0, 3: 4 },
      total: 125
    },
    {
      celda: 'MIG_GOR',
      pieza: 'BUJE OP5 LH',
      totalsByShift: { 1: 0, 2: 0, 3: 0 },
      total: 0
    }
  ]
};

test('arma el resumen general con las columnas y ceros esperados', () => {
  assert.deepEqual(buildGeneralSummaryRows(dashboard), [
    {
      PIEZA_NUMERO: 'CELDA_7',
      DESCRIPCION: 'APRON OP80',
      PROD_T1: 121,
      PROD_T2: 0,
      PROD_T3: 4,
      produccion_actual: 125
    },
    {
      PIEZA_NUMERO: 'MIG_GOR',
      DESCRIPCION: 'BUJE OP5 LH',
      PROD_T1: 0,
      PROD_T2: 0,
      PROD_T3: 0,
      produccion_actual: 0
    }
  ]);
});

test('genera un XLSX legible con el contrato del resumen general', () => {
  const { buffer } = buildGeneralSummaryWorkbook(dashboard);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets['Resumen general'];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  assert.deepEqual(rows[0], SUMMARY_HEADERS);
  assert.deepEqual(rows[1], ['CELDA_7', 'APRON OP80', 121, 0, 4, 125]);
  assert.deepEqual(rows[2], ['MIG_GOR', 'BUJE OP5 LH', 0, 0, 0, 0]);
});
