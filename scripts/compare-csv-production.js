const path = require('path');
const {
  compareCsvWithDatabase
} = require('../backend/src/services/productionComparisonService');
const { getEnv } = require('../backend/src/config/env');

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}

async function main() {
  const fecha = argument('date');
  const csvPath = argument('csv') || getEnv('LIVE_CSV_PATH') || getEnv('CSV_PATH');
  const schema = argument('schema') || getEnv('DB_NAME');

  if (!fecha) throw new Error('Falta --date=YYYY-MM-DD.');
  if (!csvPath) throw new Error('Falta --csv=RUTA o una ruta CSV configurada.');
  if (!schema) throw new Error('Falta --schema=NOMBRE o DB_NAME.');

  const result = await compareCsvWithDatabase({
    fecha,
    csvPath,
    schema,
    closedOnly: process.argv.includes('--closed-only')
  });
  const summary = {
    ...result,
    csvPath: path.basename(result.csvPath),
    differences: result.differences.slice(0, 100),
    differencesTruncated: result.differences.length > 100
  };

  console.log(JSON.stringify(summary, null, 2));

  if (process.argv.includes('--fail-on-difference') && result.differenceCount > 0) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
