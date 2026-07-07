const { getEnv, requireEnv } = require('../config/env');
const { todayIsoDate } = require('../utils/dates');
const { importCsv } = require('./csvImporter');

let inFlightSync = null;
let lastSync = null;

function liveRefreshMs() {
  const seconds = Number.parseInt(getEnv('LIVE_REFRESH_SECONDS', '10'), 10);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;

  return safeSeconds * 1000;
}

async function runLiveCsvSync() {
  const csvPath = requireEnv('LIVE_CSV_PATH');
  const startedAt = new Date();
  const result = await importCsv({
    csvPath,
    fecha: todayIsoDate(),
    stableRead: true
  });

  return {
    ...result,
    live: true,
    skipped: false,
    syncedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime()
  };
}

async function syncLiveCsv() {
  const now = Date.now();
  const minIntervalMs = liveRefreshMs();

  if (inFlightSync) {
    const result = await inFlightSync;

    return {
      ...result,
      reusedInFlight: true
    };
  }

  if (lastSync && now - lastSync.completedAtMs < minIntervalMs) {
    return {
      ...lastSync.result,
      skipped: true,
      reason: 'recent-sync',
      nextSyncAvailableAt: new Date(lastSync.completedAtMs + minIntervalMs).toISOString()
    };
  }

  inFlightSync = runLiveCsvSync();

  try {
    const result = await inFlightSync;
    lastSync = {
      completedAtMs: Date.now(),
      result
    };

    return result;
  } finally {
    inFlightSync = null;
  }
}

module.exports = {
  syncLiveCsv
};
