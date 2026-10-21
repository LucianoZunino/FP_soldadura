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
