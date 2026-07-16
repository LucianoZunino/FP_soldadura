const { getEnv, requireEnv } = require('../config/env');
const { todayIsoDate } = require('../utils/dates');
const { getCsvSourceInfo, importCsv } = require('./csvImporter');

let inFlightSync = null;
let lastSync = null;
let lastManualImport = null;

function liveRefreshMs() {
  const seconds = Number.parseInt(getEnv('LIVE_REFRESH_SECONDS', '10'), 10);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;

  return safeSeconds * 1000;
}

async function runLiveCsvSync() {
  const csvPath = requireEnv('LIVE_CSV_PATH');
  const startedAt = new Date();
  const sourceInfo = await getCsvSourceInfo(csvPath);

  if (
    lastManualImport &&
    lastManualImport.fecha === todayIsoDate() &&
    sourceInfo.sourceMtimeMs <= lastManualImport.sourceMtimeMs
  ) {
    return {
      fecha: todayIsoDate(),
      csvPath,
      ...sourceInfo,
      live: true,
      skipped: true,
      reason: 'live-source-older-than-manual-import',
      manualImportSourceMtime: lastManualImport.sourceMtime,
      manualImportSourceMtimeMs: lastManualImport.sourceMtimeMs,
      syncedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime()
    };
  }

  const result = await importCsv({
    csvPath,
    fecha: todayIsoDate(),
    stableRead: true,
    sampleCount: 3,
    sampleDelayMs: 1000,
    skipFutureHours: true,
    clearFutureHours: true,
    preserveExistingPositiveOnZero: true
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

function registerManualImport(result) {
  if (!result || result.live || result.fecha !== todayIsoDate()) {
    return;
  }

  lastManualImport = {
    fecha: result.fecha,
    sourceMtime: result.sourceMtime,
    sourceMtimeMs: result.sourceMtimeMs
  };
}

module.exports = {
  registerManualImport,
  syncLiveCsv
};
