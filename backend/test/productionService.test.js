const assert = require('node:assert/strict');
const test = require('node:test');

const { buildMatrix } = require('../src/services/productionService');

test('expone el estandar por maquina y conserva 24 como valor general', () => {
  const baseRow = {
      id_turno: 1,
      hora_desde: '06:00:00',
      hora_hasta: '07:00:00',
      cantidad: 20,
      articulos_finales: 'SUBPROCESO',
      cantidad_articulos_finales: 0
  };
  const matrix = buildMatrix([
    { ...baseRow, id_celda: 1, celda: 'CELDA_1', id_pieza: 1, pieza: 'DASH OP10' },
    { ...baseRow, id_celda: 2, celda: 'CELDA_8', id_pieza: 2, pieza: 'FRONT FLOOR LH OP.10' },
    { ...baseRow, id_celda: 3, celda: 'MIG_1_APRON', id_pieza: 3, pieza: 'OP5 RH' },
    { ...baseRow, id_celda: 4, celda: 'MIG_4_APRON', id_pieza: 4, pieza: 'OP5LH' },
    { ...baseRow, id_celda: 5, celda: 'LINEA SCHULER', id_pieza: 5, pieza: 'PRENSA 3' },
    { ...baseRow, id_celda: 6, celda: 'LINEA VERSON', id_pieza: 6, pieza: 'PRENSA 3' },
    { ...baseRow, id_celda: 7, celda: 'SCHULER_3_3', id_pieza: 7, pieza: 'PRENSA 3' },
    { ...baseRow, id_celda: 8, celda: 'VERSON_2_3', id_pieza: 8, pieza: 'PRENSA 3' }
  ]);
  const standards = Object.fromEntries(matrix.map((row) => [row.celda, row.standardPiecesPerHour]));

  assert.deepEqual(standards, {
    'LINEA VERSON': 300,
    'LINEA SCHULER': 450,
    CELDA_1: 24,
    CELDA_8: 28,
    MIG_1_APRON: 30,
    MIG_4_APRON: 30,
    SCHULER_3_3: 450,
    VERSON_2_3: 300
  });
});

test('ubica LINEA VERSON y LINEA SCHULER antes que el resto de las maquinas', () => {
  const baseRow = {
    id_turno: 1,
    hora_desde: '06:00:00',
    hora_hasta: '07:00:00',
    cantidad: 20,
    articulos_finales: 'SUBPROCESO',
    cantidad_articulos_finales: 0
  };
  const matrix = buildMatrix([
    { ...baseRow, id_celda: 1, celda: 'CELDA_1', id_pieza: 1, pieza: 'DASH OP10' },
    { ...baseRow, id_celda: 2, celda: 'LINEA SCHULER', id_pieza: 2, pieza: 'PRENSA 3' },
    { ...baseRow, id_celda: 3, celda: 'MIG_GOR', id_pieza: 3, pieza: 'INFERIOR OP40' },
    { ...baseRow, id_celda: 4, celda: 'LINEA VERSON', id_pieza: 4, pieza: 'PRENSA 3' },
    { ...baseRow, id_celda: 5, celda: 'CELDA_2', id_pieza: 5, pieza: 'MARIPOSAS' }
  ]);

  assert.deepEqual(
    matrix.map((row) => row.celda),
    ['LINEA VERSON', 'LINEA SCHULER', 'CELDA_1', 'CELDA_2', 'MIG_GOR']
  );
});
