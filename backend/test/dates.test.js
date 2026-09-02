const test = require('node:test');
const assert = require('node:assert/strict');

const { currentOperationalDate, isFutureHourForDate } = require('../src/utils/dates');

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
