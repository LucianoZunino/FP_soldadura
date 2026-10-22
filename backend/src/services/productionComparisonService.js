const fs = require('fs/promises');
const { parse } = require('csv-parse/sync');
const { createPool } = require('../config/db');
const { SHIFTS } = require('../constants/production');
const {
  currentOperationalDate,
  currentTimeString,
  normalizeDate
} = require('../utils/dates');

function parseAmount(value) {
  const amount = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function recordKey(record) {
  return [record.celda, record.pieza, record.horaDesde]
    .map(normalizeName)
    .join('\u0000');
}

function parseCsvSnapshot(content) {
  const rows = parse(content, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true
  });
  const records = [];

  for (const row of rows) {
    if (!row[1] || !row[2]) continue;

    for (const shift of SHIFTS) {
      shift.hours.forEach(([horaDesde, horaHasta], index) => {
        records.push({
          celda: row[1],
          pieza: row[2],
          turno: shift.id,
          horaDesde,
          horaHasta,
          cantidad: parseAmount(row[shift.valueStartIndex + index])
        });
      });
    }
  }

  return records;
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}

function isClosedBlock(fecha, horaDesde, now = new Date()) {
  const date = normalizeDate(fecha);
  const currentDate = currentOperationalDate(now);

  if (date < currentDate) return true;
  if (date > currentDate) return false;

  const currentMinutes = timeToMinutes(currentTimeString(now));
  const operationalCurrentMinutes = currentMinutes < 360
    ? currentMinutes + (24 * 60)
    : currentMinutes;
  const startMinutes = timeToMinutes(horaDesde);
  const operationalStartMinutes = startMinutes < 360
    ? startMinutes + (24 * 60)
    : startMinutes;

  return operationalCurrentMinutes >= operationalStartMinutes + 60;
}

function compareProductionSnapshots(csvRecords, databaseRecords, options = {}) {
  const selectedCsvRecords = options.closedOnly
    ? csvRecords.filter((record) => isClosedBlock(options.fecha, record.horaDesde, options.now))
    : csvRecords;
  const selectedKeys = new Set(selectedCsvRecords.map(recordKey));
  const databaseByKey = new Map(databaseRecords.map((record) => [recordKey(record), record]));
  const differences = [];
  let exactMatches = 0;
  let missingDestinationRows = 0;
  let csvTotal = 0;
  let databaseTotal = 0;

  for (const csvRecord of selectedCsvRecords) {
    const key = recordKey(csvRecord);
    const databaseRecord = databaseByKey.get(key);
    const databaseAmount = Number(databaseRecord?.cantidad || 0);

    csvTotal += csvRecord.cantidad;
    databaseTotal += databaseAmount;
    if (!databaseRecord) missingDestinationRows += 1;

    if (csvRecord.cantidad === databaseAmount) {
      exactMatches += 1;
      continue;
    }

    differences.push({
      celda: csvRecord.celda,
      pieza: csvRecord.pieza,
      turno: csvRecord.turno,
      horaDesde: csvRecord.horaDesde,
      csv: csvRecord.cantidad,
      database: databaseAmount,
      delta: databaseAmount - csvRecord.cantidad,
      destinationRowPresent: Boolean(databaseRecord)
    });
  }

  for (const databaseRecord of databaseRecords) {
    const key = recordKey(databaseRecord);

    if (
      options.closedOnly &&
      !isClosedBlock(options.fecha, databaseRecord.horaDesde, options.now)
    ) {
      continue;
    }

    if (!selectedKeys.has(key) && Number(databaseRecord.cantidad) !== 0) {
      differences.push({
        celda: databaseRecord.celda,
        pieza: databaseRecord.pieza,
        turno: databaseRecord.turno,
        horaDesde: databaseRecord.horaDesde,
        csv: 0,
        database: Number(databaseRecord.cantidad),
        delta: Number(databaseRecord.cantidad),
        destinationRowPresent: true,
        extraDestinationRow: true
      });
    }
  }

  const byShift = differences.reduce((result, difference) => {
    const key = `T${difference.turno}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});

  return {
    comparedCells: selectedCsvRecords.length,
    exactMatches,
    differenceCount: differences.length,
    missingDestinationRows,
    csvTotal,
    databaseTotal,
    totalDelta: databaseTotal - csvTotal,
    differencesByShift: byShift,
    differences
  };
}

function quoteIdentifier(value, label) {
  const identifier = String(value || '');

  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`${label} contiene caracteres invalidos.`);
  }

  return `\`${identifier}\``;
}

async function loadProductionSnapshot(connection, schema, fecha) {
  const [rows] = await connection.execute(
    `SELECT c.nombre AS celda,
            p.descripcion AS pieza,
            ph.id_turno AS turno,
            TIME_FORMAT(ph.hora_desde, '%H:%i:%s') AS horaDesde,
            TIME_FORMAT(ph.hora_hasta, '%H:%i:%s') AS horaHasta,
            ph.cantidad
     FROM ${quoteIdentifier(schema, 'schema')}.produccion_hora ph
     JOIN ${quoteIdentifier(schema, 'schema')}.celda c ON c.id_celda = ph.id_celda
     JOIN ${quoteIdentifier(schema, 'schema')}.pieza p ON p.id_pieza = ph.id_pieza
     WHERE ph.fecha_modificada = ?`,
    [normalizeDate(fecha)]
  );

  return rows.map((row) => ({ ...row, cantidad: Number(row.cantidad || 0) }));
}

async function compareCsvWithDatabase(options) {
  const fecha = normalizeDate(options.fecha);
  const csvContent = await fs.readFile(options.csvPath, 'utf8');
  const csvRecords = parseCsvSnapshot(csvContent);
  const pool = options.pool || createPool();
  const ownsPool = !options.pool;

  try {
    const connection = await pool.getConnection();

    try {
      const databaseRecords = await loadProductionSnapshot(connection, options.schema, fecha);
      return {
        fecha,
        schema: options.schema,
        csvPath: options.csvPath,
        closedOnly: Boolean(options.closedOnly),
        ...compareProductionSnapshots(csvRecords, databaseRecords, {
          fecha,
          closedOnly: options.closedOnly,
          now: options.now
        })
      };
    } finally {
      connection.release();
    }
  } finally {
    if (ownsPool) await pool.end();
  }
}

module.exports = {
  compareCsvWithDatabase,
  compareProductionSnapshots,
  isClosedBlock,
  loadProductionSnapshot,
  parseCsvSnapshot,
  recordKey
};
