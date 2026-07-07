function todayIsoDate() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
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

module.exports = {
  normalizeDate,
  previousIsoDate,
  todayIsoDate
};
