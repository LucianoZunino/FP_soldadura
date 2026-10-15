const XLSX = require('xlsx');
const { getDashboard } = require('./productionService');

const SUMMARY_HEADERS = [
  'PIEZA_NUMERO',
  'DESCRIPCION',
  'PROD_T1',
  'PROD_T2',
  'PROD_T3',
  'produccion_actual'
];

function buildGeneralSummaryRows(dashboard) {
  return dashboard.rows.map((row) => ({
    PIEZA_NUMERO: row.celda,
    DESCRIPCION: row.pieza,
    PROD_T1: Number(row.totalsByShift?.[1] || 0),
    PROD_T2: Number(row.totalsByShift?.[2] || 0),
    PROD_T3: Number(row.totalsByShift?.[3] || 0),
    produccion_actual: Number(row.total || 0)
  }));
}

function buildGeneralSummaryWorkbook(dashboard) {
  const rows = buildGeneralSummaryRows(dashboard);
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: SUMMARY_HEADERS,
    skipHeader: false
  });

  worksheet['!autofilter'] = { ref: `A1:F${Math.max(rows.length + 1, 1)}` };
  worksheet['!cols'] = [
    { wch: 24 },
    { wch: 34 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Title: `Resumen general de produccion ${dashboard.fecha}`,
    Subject: 'Produccion por celda, pieza y turno',
    Author: 'FP_Soldadura'
  };
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen general');

  return {
    rows,
    buffer: XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
      compression: true
    })
  };
}

async function createGeneralSummaryExport(fechaInput) {
  const dashboard = await getDashboard(fechaInput);
  const result = buildGeneralSummaryWorkbook(dashboard);

  return {
    fecha: dashboard.fecha,
    filename: `resumen_general_${dashboard.fecha}.xlsx`,
    rowCount: result.rows.length,
    buffer: result.buffer
  };
}

module.exports = {
  SUMMARY_HEADERS,
  buildGeneralSummaryRows,
  buildGeneralSummaryWorkbook,
  createGeneralSummaryExport
};
