const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

function appTimeZone() {
  return process.env.APP_TIME_ZONE || DEFAULT_TIME_ZONE;
}

function zonedParts(value = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  return Object.fromEntries(
    formatter.formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

function todayIsoDate(value = new Date()) {
  const parts = zonedParts(value);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeDate(value) {
  const date = value || todayIsoDate();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  }

  return date;
}

function previousIsoDate(value = todayIsoDate()) {
  const date = normalizeDate(value);
  const [year, month, day] = date.split('-').map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));

  return previous.toISOString().slice(0, 10);
}

function currentTimeString(value = new Date()) {
  const parts = zonedParts(value);

  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number);

  return (hours * 60) + (minutes || 0);
}

function isFutureHourForDate(fecha, horaDesde, now = new Date()) {
  if (normalizeDate(fecha) !== todayIsoDate(now)) {
    return false;
  }

  return timeToMinutes(horaDesde) > timeToMinutes(currentTimeString(now));
}

module.exports = {
  currentTimeString,
  isFutureHourForDate,
  normalizeDate,
  previousIsoDate,
  todayIsoDate
};
