const assert = require('node:assert/strict');
const test = require('node:test');

const { buildMatrix } = require('../src/services/productionService');

test('expone el estandar fijo de 24 piezas por hora para cada fila', () => {
  const matrix = buildMatrix([
    {
      id_celda: 1,
      celda: 'CELDA_1',
      id_pieza: 1,
      pieza: 'DASH OP10',
      id_turno: 1,
      hora_desde: '06:00:00',
      hora_hasta: '07:00:00',
      cantidad: 20,
      articulos_finales: 'SUBPROCESO',
      cantidad_articulos_finales: 0
    }
  ]);

  assert.equal(matrix.length, 1);
  assert.equal(matrix[0].standardPiecesPerHour, 24);
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
