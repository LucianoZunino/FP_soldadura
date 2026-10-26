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

test('evalua la hora activa contra el estandar proporcional transcurrido', () => {
  const baseRow = {
    id_celda: 1,
    celda: 'CELDA_1',
    id_turno: 1,
    hora_desde: '09:00:00',
    hora_hasta: '10:00:00',
    articulos_finales: 'SUBPROCESO',
    cantidad_articulos_finales: 0
  };
  const matrix = buildMatrix([
    { ...baseRow, id_pieza: 1, pieza: 'MUY ALTA', cantidad: 15 },
    { ...baseRow, id_pieza: 2, pieza: 'EN OBJETIVO', cantidad: 12 },
    { ...baseRow, id_pieza: 3, pieza: 'ATENCION', cantidad: 10 },
    { ...baseRow, id_pieza: 4, pieza: 'BAJA', cantidad: 9 }
  ], {
    fecha: '2026-09-02',
    hideFutureHours: true,
    now: new Date('2026-09-02T12:30:00.000Z')
  });
  const hours = Object.fromEntries(
    matrix.map((row) => [row.pieza, row.hours['1:09:00:00']])
  );

  assert.equal(hours['MUY ALTA'].expectedQuantity, 12);
  assert.equal(hours['MUY ALTA'].status, 'veryHigh');
  assert.equal(hours['EN OBJETIVO'].status, 'high');
  assert.equal(hours.ATENCION.status, 'medium');
  assert.equal(hours.BAJA.status, 'low');
});

test('usa el estandar completo en horas cerradas y deja futuras en gris', () => {
  const baseRow = {
    id_celda: 1,
    celda: 'CELDA_1',
    id_turno: 1,
    hora_hasta: '10:00:00',
    articulos_finales: 'SUBPROCESO',
    cantidad_articulos_finales: 0
  };
  const matrix = buildMatrix([
    { ...baseRow, id_pieza: 1, pieza: 'CERRADA', hora_desde: '08:00:00', cantidad: 24 },
    { ...baseRow, id_pieza: 2, pieza: 'FUTURA', hora_desde: '10:00:00', hora_hasta: '11:00:00', cantidad: 24 }
  ], {
    fecha: '2026-09-02',
    hideFutureHours: true,
    now: new Date('2026-09-02T12:30:00.000Z')
  });
  const rows = Object.fromEntries(matrix.map((row) => [row.pieza, row]));

  assert.equal(rows.CERRADA.hours['1:08:00:00'].expectedQuantity, 24);
  assert.equal(rows.CERRADA.hours['1:08:00:00'].status, 'high');
  assert.equal(rows.FUTURA.hours['1:10:00:00'].expectedQuantity, 0);
  assert.equal(rows.FUTURA.hours['1:10:00:00'].cantidad, 0);
  assert.equal(rows.FUTURA.hours['1:10:00:00'].status, 'empty');
});
