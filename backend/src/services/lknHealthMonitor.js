const { createPool } = require('../config/db');
const { getEnv } = require('../config/env');
const { currentOperationalDate } = require('../utils/dates');
const { getLknAutoSyncStatus } = require('./lknAutoSync');

const DEFAULT_CHECK_SECONDS = 60;
const DEFAULT_MAX_SOURCE_LAG_SECONDS = 900;
const DEFAULT_MIN_MACHINES = 55;

let intervalId = null;
let inFlight = null;
let lastHealth = null;
let lastLogSignature = null;

function numericEnv(name, fallback) {
  const value = Number.parseInt(getEnv(name, String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeIdentifier(value, label) {
  const identifier = String(value || '');

  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`${label} contiene caracteres invalidos.`);
  }

  return `\`${identifier}\``;
}

function monitorEnabled() {
  return getEnv('LKN_HEALTH_MONITOR_ENABLED', 'true').toLowerCase() === 'true';
}

function monitorOptions(overrides = {}) {
  return {
    maxSourceLagSeconds: overrides.maxSourceLagSeconds || numericEnv(
      'LKN_HEALTH_MAX_SOURCE_LAG_SECONDS',
      DEFAULT_MAX_SOURCE_LAG_SECONDS
    ),
    minMachines: overrides.minMachines || numericEnv(
      'LKN_HEALTH_MIN_MACHINES',
      DEFAULT_MIN_MACHINES
    )
  };
}

function evaluateLknHealth({ scheduler, metrics, ...overrides }) {
  const options = monitorOptions(overrides);
  const failures = [];
  const warnings = [];

  if (!scheduler.enabled) failures.push('scheduler-disabled');
  if (!scheduler.started) failures.push('scheduler-not-started');
  if (scheduler.lastError) failures.push('scheduler-error');
  if (scheduler.lastResult?.reason === 'empty-source') failures.push('empty-source');
  if (!metrics.sourceRows) failures.push('source-without-rows');

  if (!scheduler.lastResult && !scheduler.lastError) warnings.push('scheduler-without-result');
  if (
    metrics.sourceLagSeconds !== null &&
    metrics.sourceLagSeconds > options.maxSourceLagSeconds
  ) {
    warnings.push('source-stale');
  }
  if (metrics.machines < options.minMachines) warnings.push('machine-coverage-low');

  return {
    ok: failures.length === 0,
    level: failures.length ? 'critical' : warnings.length ? 'warning' : 'ok',
    checkedAt: new Date().toISOString(),
    operationalDate: metrics.operationalDate,
    failures,
    warnings,
    thresholds: options,
    source: metrics,
    scheduler
  };
}

async function getSourceMetrics(options = {}) {
  const sourceSchema = options.sourceSchema || getEnv('LKN_DB_NAME', 'lkn_soft');
  const sourceTable = options.sourceTable || 'produccion_horaria';
  const operationalDate = options.operationalDate || currentOperationalDate();
  const pool = options.pool || createPool();
  const ownsPool = !options.pool;

  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS sourceRows,
              COUNT(DISTINCT maquina) AS machines,
              MAX(actualizado_en) AS lastSourceUpdate,
              CASE
                WHEN MAX(actualizado_en) IS NULL THEN NULL
                ELSE GREATEST(
                  TIMESTAMPDIFF(SECOND, MAX(actualizado_en), CURRENT_TIMESTAMP),
                  0
                )
              END AS sourceLagSeconds
       FROM ${safeIdentifier(sourceSchema, 'LKN_DB_NAME')}.${safeIdentifier(sourceTable, 'sourceTable')}
       WHERE fecha_operativa = ?`,
      [operationalDate]
    );
    const row = rows[0] || {};

    return {
      operationalDate,
      sourceSchema,
      sourceTable,
      sourceRows: Number(row.sourceRows || 0),
      machines: Number(row.machines || 0),
      lastSourceUpdate: row.lastSourceUpdate || null,
      sourceLagSeconds: row.sourceLagSeconds === null
        ? null
        : Number(row.sourceLagSeconds)
    };
  } finally {
    if (ownsPool) await pool.end();
  }
}

async function getLknHealth(options = {}) {
  const metrics = options.metrics || await getSourceMetrics(options);
  const scheduler = options.scheduler || getLknAutoSyncStatus();

  return evaluateLknHealth({ scheduler, metrics, ...options });
}

function healthSignature(health) {
  return JSON.stringify({
    level: health.level,
    failures: health.failures,
    warnings: health.warnings
  });
}

async function runLknHealthCheck(options = {}) {
  if (inFlight) return inFlight;

  inFlight = getLknHealth(options);

  try {
    const health = await inFlight;
    const signature = healthSignature(health);

    lastHealth = health;

    if (signature !== lastLogSignature) {
      const writer = health.level === 'critical'
        ? console.error
        : health.level === 'warning'
          ? console.warn
          : console.log;
      writer(`[lkn-health] ${JSON.stringify(health)}`);
      lastLogSignature = signature;
    }

    return health;
  } finally {
    inFlight = null;
  }
}

function startLknHealthMonitor() {
  if (intervalId || !monitorEnabled()) return false;

  runLknHealthCheck().catch((error) => {
    console.error(`[lkn-health] ${error.message}`);
  });

  intervalId = setInterval(() => {
    runLknHealthCheck().catch((error) => {
      console.error(`[lkn-health] ${error.message}`);
    });
  }, numericEnv('LKN_HEALTH_CHECK_SECONDS', DEFAULT_CHECK_SECONDS) * 1000);

  return true;
}

function stopLknHealthMonitor() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

function getLastLknHealth() {
  return lastHealth;
}

module.exports = {
  evaluateLknHealth,
  getLastLknHealth,
  getLknHealth,
  getSourceMetrics,
  runLknHealthCheck,
  startLknHealthMonitor,
  stopLknHealthMonitor
};
