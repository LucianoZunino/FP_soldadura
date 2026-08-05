const { getEnv, requireEnv } = require('../config/env');
const { todayIsoDate } = require('../utils/dates');
const { getCsvSourceInfo, importCsv } = require('./csvImporter');

let intervalId = null;
let inFlightSync = null;
let lastSync = null;
let lastManualImport = null;
let lastError = null;
let started = false;

function liveRefreshMs() {
  const seconds = Number.parseInt(getEnv('LIVE_REFRESH_SECONDS', '10'), 10);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 10;

  return safeSeconds * 1000;
}

function isEnabled() {
  return getEnv('LIVE_CSV_AUTO_SYNC_ENABLED', 'false').toLowerCase() === 'true';
}

async function runLiveCsvSync(options = {}) {
  const csvPath = options.csvPath || requireEnv('LIVE_CSV_PATH');
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

async function syncLiveCsv(options = {}) {
  const now = Date.now();
  const minIntervalMs = liveRefreshMs();

  if (inFlightSync) {
    const result = await inFlightSync;

    return {
      ...result,
      reusedInFlight: true
    };
  }

  if (!options.force && lastSync && now - lastSync.completedAtMs < minIntervalMs) {
    return {
      ...lastSync.result,
      skipped: true,
      reason: 'recent-sync',
      nextSyncAvailableAt: new Date(lastSync.completedAtMs + minIntervalMs).toISOString()
    };
  }

  inFlightSync = runLiveCsvSync(options);

  try {
    const result = await inFlightSync;
    lastSync = {
      completedAtMs: Date.now(),
      result
    };
    lastError = null;

    return result;
  } catch (error) {
    lastError = {
      message: error.message,
      failedAt: new Date().toISOString()
    };
    throw error;
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

function startLiveCsvAutoSync() {
  if (started || !isEnabled()) {
    return false;
  }

  started = true;

  syncLiveCsv({ force: true }).catch((error) => {
    console.error(`[live-csv-sync] ${error.message}`);
  });

  intervalId = setInterval(() => {
    syncLiveCsv({ force: true }).catch((error) => {
      console.error(`[live-csv-sync] ${error.message}`);
    });
  }, liveRefreshMs());

  return true;
}

function getLiveCsvSyncStatus() {
  return {
    enabled: isEnabled(),
    started,
    intervalSeconds: liveRefreshMs() / 1000,
    inFlight: Boolean(inFlightSync),
    lastResult: lastSync?.result || null,
    lastError
  };
}

function stopLiveCsvAutoSync() {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = null;
  started = false;
}

module.exports = {
  getLiveCsvSyncStatus,
  registerManualImport,
  startLiveCsvAutoSync,
  stopLiveCsvAutoSync,
  syncLiveCsv
};
