const { getEnv } = require('../config/env');
const { todayIsoDate } = require('../utils/dates');
const { importLknProduction } = require('./lknImporter');

let intervalId = null;
let inFlight = null;
let lastResult = null;
let lastError = null;
let started = false;

function isEnabled() {
  return getEnv('LKN_AUTO_SYNC_ENABLED', 'false').toLowerCase() === 'true';
}

function intervalMs() {
  const seconds = Number.parseInt(getEnv('LKN_SYNC_SECONDS', '15'), 10);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 15;

  return safeSeconds * 1000;
}

async function runLknAutoSync(options = {}) {
  if (inFlight) {
    const result = await inFlight;

    return {
      ...result,
      reusedInFlight: true
    };
  }

  inFlight = importLknProduction({
    fecha: options.fecha || todayIsoDate(),
    replaceDate: options.replaceDate !== false,
    skipFutureHours: options.skipFutureHours !== false
  });

  try {
    const result = await inFlight;
    lastResult = {
      ...result,
      syncedAt: new Date().toISOString()
    };
    lastError = null;

    return lastResult;
  } catch (error) {
    lastError = {
      message: error.message,
      failedAt: new Date().toISOString()
    };
    throw error;
  } finally {
    inFlight = null;
  }
}

function startLknAutoSync() {
  if (started || !isEnabled()) {
    return false;
  }

  started = true;

  runLknAutoSync().catch((error) => {
    console.error(`[lkn-auto-sync] ${error.message}`);
  });

  intervalId = setInterval(() => {
    runLknAutoSync().catch((error) => {
      console.error(`[lkn-auto-sync] ${error.message}`);
    });
  }, intervalMs());

  return true;
}

function getLknAutoSyncStatus() {
  return {
    enabled: isEnabled(),
    started,
    intervalSeconds: intervalMs() / 1000,
    inFlight: Boolean(inFlight),
    lastResult,
    lastError
  };
}

function stopLknAutoSync() {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = null;
  started = false;
}

module.exports = {
  getLknAutoSyncStatus,
  runLknAutoSync,
  startLknAutoSync,
  stopLknAutoSync
};
