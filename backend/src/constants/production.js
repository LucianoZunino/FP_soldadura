const SHIFTS = [
  {
    id: 1,
    label: 'Turno 1',
    description: '06:00 - 14:00',
    totalIndex: 3,
    valueStartIndex: 4,
    hours: [
      ['06:00:00', '07:00:00'],
      ['07:00:00', '08:00:00'],
      ['08:00:00', '09:00:00'],
      ['09:00:00', '10:00:00'],
      ['10:00:00', '11:00:00'],
      ['11:00:00', '12:00:00'],
      ['12:00:00', '13:00:00'],
      ['13:00:00', '14:00:00']
    ]
  },
  {
    id: 2,
    label: 'Turno 2',
    description: '14:00 - 22:00',
    totalIndex: 12,
    valueStartIndex: 13,
    hours: [
      ['14:00:00', '15:00:00'],
      ['15:00:00', '16:00:00'],
      ['16:00:00', '17:00:00'],
      ['17:00:00', '18:00:00'],
      ['18:00:00', '19:00:00'],
      ['19:00:00', '20:00:00'],
      ['20:00:00', '21:00:00'],
      ['21:00:00', '22:00:00']
    ]
  },
  {
    id: 3,
    label: 'Turno 3',
    description: '22:00 - 06:00',
    totalIndex: 21,
    valueStartIndex: 22,
    hours: [
      ['22:00:00', '23:00:00'],
      ['23:00:00', '00:00:00'],
      ['00:00:00', '01:00:00'],
      ['01:00:00', '02:00:00'],
      ['02:00:00', '03:00:00'],
      ['03:00:00', '04:00:00'],
      ['04:00:00', '05:00:00'],
      ['05:00:00', '06:00:00']
    ]
  }
];

const STANDARD_PIECES_PER_HOUR = 24;

function standardPiecesPerHour(productionLine = '') {
  const line = String(productionLine).trim().toUpperCase();

  if (line.includes('SCHULER')) return 450;
  if (line.includes('VERSON')) return 300;
  if (line === 'CELDA_8') return 28;
  if (line.startsWith('MIG_1') || line.startsWith('MIG_4')) return 30;

  return STANDARD_PIECES_PER_HOUR;
}

function hourLabel(hourRange) {
  return `${hourRange[0].slice(0, 2)}-${hourRange[1].slice(0, 2)}`;
}

function productionStatus(value, expectedAmount = STANDARD_PIECES_PER_HOUR) {
  const amount = Math.max(Number(value) || 0, 0);
  const target = Math.max(Number(expectedAmount) || 0, 0);

  if (target === 0) return amount > 0 ? 'veryHigh' : 'low';

  const performance = amount / target;

  if (performance >= 1.2) return 'veryHigh';
  if (performance >= 1) return 'high';
  if (performance >= 0.8) return 'medium';
  return 'low';
}

module.exports = {
  SHIFTS,
  STANDARD_PIECES_PER_HOUR,
  hourLabel,
  productionStatus,
  standardPiecesPerHour
};
