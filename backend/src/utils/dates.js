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

module.exports = {
  normalizeDate,
  todayIsoDate
};
