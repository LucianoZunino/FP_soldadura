const test = require('node:test');
const assert = require('node:assert/strict');

const {
  currentOperationalDate,
  hourProgressForDate,
  isFutureHourForDate
} = require('../src/utils/dates');

test('la madrugada pertenece al dia operativo anterior', () => {
  const previousTimeZone = process.env.APP_TIME_ZONE;
  process.env.APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

  try {
    assert.equal(
      currentOperationalDate(new Date('2026-09-02T03:30:00.000Z')),
      '2026-09-01'
    );
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.APP_TIME_ZONE;
    } else {
      process.env.APP_TIME_ZONE = previousTimeZone;
    }
  }
});

test('a partir de las 06:00 comienza el nuevo dia operativo', () => {
  const previousTimeZone = process.env.APP_TIME_ZONE;
  process.env.APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

  try {
    assert.equal(
      currentOperationalDate(new Date('2026-09-02T09:00:00.000Z')),
      '2026-09-02'
    );
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.APP_TIME_ZONE;
    } else {
      process.env.APP_TIME_ZONE = previousTimeZone;
    }
  }
});

test('antes de medianoche considera futuras las horas 00-06 del mismo dia operativo', () => {
  assert.equal(
    isFutureHourForDate('2026-09-02', '00:00:00', new Date('2026-09-02T22:00:00.000Z')),
    true
  );
});

test('durante la madrugada habilita solo los buckets ya iniciados del dia operativo anterior', () => {
  const now = new Date('2026-09-03T04:30:00.000Z');

  assert.equal(isFutureHourForDate('2026-09-02', '00:00:00', now), false);
  assert.equal(isFutureHourForDate('2026-09-02', '01:00:00', now), false);
  assert.equal(isFutureHourForDate('2026-09-02', '02:00:00', now), true);
});

test('calcula el avance proporcional de la hora activa', () => {
  const now = new Date('2026-09-02T12:30:00.000Z');

  assert.equal(hourProgressForDate('2026-09-02', '08:00:00', now), 1);
  assert.equal(hourProgressForDate('2026-09-02', '09:00:00', now), 0.5);
  assert.equal(hourProgressForDate('2026-09-02', '10:00:00', now), 0);
});

test('calcula el avance de 00-01 dentro del dia operativo anterior', () => {
  const now = new Date('2026-09-03T03:30:00.000Z');

  assert.equal(hourProgressForDate('2026-09-02', '23:00:00', now), 1);
  assert.equal(hourProgressForDate('2026-09-02', '00:00:00', now), 0.5);
  assert.equal(hourProgressForDate('2026-09-02', '01:00:00', now), 0);
});

test('considera futuras todas las horas de una fecha operativa posterior', () => {
  const now = new Date('2026-09-02T12:30:00.000Z');

  assert.equal(isFutureHourForDate('2026-09-03', '06:00:00', now), true);
  assert.equal(hourProgressForDate('2026-09-03', '06:00:00', now), 0);
});
