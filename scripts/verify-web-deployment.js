function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

async function readJson(baseUrl, endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${endpoint} respondio HTTP ${response.status}: ${text}`);
  }

  return JSON.parse(text);
}

function verifyResponses({ health, sync, lknHealth, expectedRelease }) {
  const failures = [];

  if (!health.ok) failures.push('health-not-ok');
  if (expectedRelease && health.release !== expectedRelease) failures.push('release-mismatch');
  if (sync.source !== 'lkn') failures.push('source-not-lkn');
  if (!sync.lkn?.enabled) failures.push('lkn-disabled');
  if (!sync.lkn?.started) failures.push('lkn-not-started');
  if (sync.lkn?.lastError) failures.push('lkn-last-error');
  if (lknHealth.level === 'critical') failures.push('lkn-health-critical');

  return {
    ok: failures.length === 0,
    failures,
    release: health.release,
    operationalDate: health.operationalDate,
    source: sync.source,
    scheduler: {
      enabled: sync.lkn?.enabled,
      started: sync.lkn?.started,
      lastError: sync.lkn?.lastError,
      lastResult: sync.lkn?.lastResult
    },
    lknHealth
  };
}

async function main() {
  const baseUrl = String(argument('base-url') || '').replace(/\/+$/, '');
  const expectedRelease = argument('release');

  if (!baseUrl) throw new Error('Falta --base-url=URL.');

  const [health, sync, lknHealth] = await Promise.all([
    readJson(baseUrl, '/api/health'),
    readJson(baseUrl, '/api/live-sync/status'),
    readJson(baseUrl, '/api/lkn-health')
  ]);
  const result = verifyResponses({ health, sync, lknHealth, expectedRelease });

  console.log(JSON.stringify({ baseUrl, ...result }, null, 2));
  if (!result.ok) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { verifyResponses };
