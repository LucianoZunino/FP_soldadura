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

function hourLabel(hourRange) {
  return `${hourRange[0].slice(0, 2)}-${hourRange[1].slice(0, 2)}`;
}

function productionStatus(value, productionLine = '') {
  const amount = Number(value);
  const line = String(productionLine).toUpperCase();

  if (line.includes('SCHULER')) {
    if (amount >= 450) return 'veryHigh';
    if (amount >= 300) return 'high';
    if (amount >= 180) return 'medium';
    return 'low';
  }

  if (line.includes('VERSON')) {
    if (amount >= 300) return 'veryHigh';
    if (amount >= 200) return 'high';
    if (amount >= 120) return 'medium';
    return 'low';
  }

  if (!amount) return 'empty';
  if (value >= 20) return 'high';
  if (value >= 15) return 'medium';
  return 'low';
}

module.exports = {
  SHIFTS,
  hourLabel,
  productionStatus
};
