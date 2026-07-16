const fs = require('fs/promises');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createPool } = require('../config/db');
const { requireEnv } = require('../config/env');
const { SHIFTS } = require('../constants/production');
const { isFutureHourForDate, normalizeDate, previousIsoDate } = require('../utils/dates');

const INSERT_BATCH_SIZE = 500;

async function readCsvContent(csvPath) {
  try {
    return await fs.readFile(csvPath, 'utf8');
  } catch (error) {
    if (error && ['ENOENT', 'UNKNOWN', 'EACCES', 'EPERM'].includes(error.code)) {
      throw new Error(
        `No se puede acceder al CSV configurado en CSV_PATH: ${csvPath}. ` +
        'Verifica que la ruta exista, que el archivo este disponible y que este usuario tenga permisos sobre la carpeta compartida.'
      );
    }

    throw error;
  }
}

async function readCsvStats(csvPath) {
  try {
    return await fs.stat(csvPath);
  } catch (error) {
    if (error && ['ENOENT', 'UNKNOWN', 'EACCES', 'EPERM'].includes(error.code)) {
      throw new Error(
        `No se puede acceder al CSV configurado en CSV_PATH: ${csvPath}. ` +
        'Verifica que la ruta exista, que el archivo este disponible y que este usuario tenga permisos sobre la carpeta compartida.'
      );
    }

    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readStableCsvContent(csvPath) {
  let previousStat = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentStat = await readCsvStats(csvPath);

    if (
      previousStat &&
      previousStat.size === currentStat.size &&
      previousStat.mtimeMs === currentStat.mtimeMs
    ) {
      return readCsvContent(csvPath);
    }

    previousStat = currentStat;
    await sleep(300);
  }

  return readCsvContent(csvPath);
}

function parseAmount(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsvContent(content) {
  return parse(content, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true
  });
}

function mergeCsvSamples(samples) {
  const byRowKey = new Map();

  for (const rows of samples) {
    for (const row of rows) {
      const celda = row[1];
      const pieza = row[2];

      if (!celda || !pieza) {
        continue;
      }

      const key = `${celda}\u0000${pieza}`;

      if (!byRowKey.has(key)) {
        byRowKey.set(key, [...row]);
        continue;
      }

      const current = byRowKey.get(key);
      const maxLength = Math.max(current.length, row.length);
      current[0] = row[0];
      current[1] = row[1];
      current[2] = row[2];

      for (let index = 3; index < maxLength; index += 1) {
        const currentAmount = parseAmount(current[index]);
        const latestAmount = parseAmount(row[index]);

        current[index] = String(
          latestAmount === 0 && currentAmount > 0
            ? currentAmount
            : latestAmount
        );
      }
    }
  }

  return Array.from(byRowKey.values());
}

async function readCsvRows(csvPath, options = {}) {
  const sampleCount = Math.max(1, Number.parseInt(options.sampleCount || 1, 10));
  const sampleDelayMs = Math.max(0, Number.parseInt(options.sampleDelayMs || 1000, 10));
  const samples = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const content = options.stableRead
      ? await readStableCsvContent(csvPath)
      : await readCsvContent(csvPath);

    samples.push(parseCsvContent(content));

    if (sampleIndex < sampleCount - 1 && sampleDelayMs > 0) {
      await sleep(sampleDelayMs);
    }
  }

  return sampleCount > 1 ? mergeCsvSamples(samples) : samples[0];
}

function resolveImportDate(csvPath, requestedDate) {
  const filename = path.basename(csvPath).toLocaleLowerCase('es');

  if (/(^|[_\-\s])ayer([_.\-\s]|$)/.test(filename)) {
    return previousIsoDate();
  }

  return normalizeDate(requestedDate);
}

async function getCsvSourceInfo(csvPath) {
  const stats = await readCsvStats(csvPath);

  return {
    csvPath,
    sourceMtime: new Date(stats.mtimeMs).toISOString(),
    sourceMtimeMs: stats.mtimeMs,
    sourceSizeBytes: stats.size
  };
}

async function getOrCreateCelda(connection, nombre) {
  const [result] = await connection.execute(
    `INSERT INTO celda (nombre)
     VALUES (?)
     ON DUPLICATE KEY UPDATE id_celda = LAST_INSERT_ID(id_celda)`,
    [nombre]
  );

  return result.insertId;
}

async function getOrCreatePieza(connection, descripcion) {
  const [result] = await connection.execute(
    `INSERT INTO pieza (descripcion)
     VALUES (?)
     ON DUPLICATE KEY UPDATE id_pieza = LAST_INSERT_ID(id_pieza)`,
    [descripcion]
  );

  return result.insertId;
}

async function upsertProduction(connection, record) {
  await connection.execute(
    `INSERT INTO produccion_hora (
        fecha,
        id_turno,
        hora_desde,
        hora_hasta,
        id_celda,
        id_pieza,
        cantidad
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        hora_hasta = VALUES(hora_hasta),
        cantidad = VALUES(cantidad)`,
    [
      record.fecha,
      record.idTurno,
      record.horaDesde,
      record.horaHasta,
      record.idCelda,
      record.idPieza,
      record.cantidad
    ]
  );
}

function chunks(items, size) {
  const result = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

async function ensureCeldas(connection, nombres) {
  if (!nombres.length) {
    return new Map();
  }

  for (const batch of chunks(nombres, INSERT_BATCH_SIZE)) {
    const placeholders = batch.map(() => '(?)').join(',');
    await connection.execute(
      `INSERT INTO celda (nombre)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
      batch
    );
  }

  const result = new Map();

  for (const batch of chunks(nombres, INSERT_BATCH_SIZE)) {
    const placeholders = batch.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id_celda, nombre
       FROM celda
       WHERE nombre IN (${placeholders})`,
      batch
    );

    for (const row of rows) {
      result.set(row.nombre, row.id_celda);
    }
  }

  return result;
}

async function ensurePiezas(connection, descripciones) {
  if (!descripciones.length) {
    return new Map();
  }

  for (const batch of chunks(descripciones, INSERT_BATCH_SIZE)) {
    const placeholders = batch.map(() => '(?)').join(',');
    await connection.execute(
      `INSERT INTO pieza (descripcion)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
      batch
    );
  }

  const result = new Map();

  for (const batch of chunks(descripciones, INSERT_BATCH_SIZE)) {
    const placeholders = batch.map(() => '?').join(',');
    const [rows] = await connection.execute(
      `SELECT id_pieza, descripcion
       FROM pieza
       WHERE descripcion IN (${placeholders})`,
      batch
    );

    for (const row of rows) {
      result.set(row.descripcion, row.id_pieza);
    }
  }

  return result;
}

async function upsertProductionBatch(connection, records, options = {}) {
  if (!records.length) {
    return;
  }

  const updateAmountSql = options.preserveExistingHigher
    ? 'cantidad = GREATEST(produccion_hora.cantidad, VALUES(cantidad))'
    : options.preserveExistingPositiveOnZero
    ? `cantidad = CASE
        WHEN VALUES(cantidad) = 0 AND produccion_hora.cantidad > 0 THEN produccion_hora.cantidad
        ELSE VALUES(cantidad)
      END`
    : 'cantidad = VALUES(cantidad)';

  for (const batch of chunks(records, INSERT_BATCH_SIZE)) {
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = batch.flatMap((record) => [
      record.fecha,
      record.idTurno,
      record.horaDesde,
      record.horaHasta,
      record.idCelda,
      record.idPieza,
      record.cantidad
    ]);

    await connection.execute(
      `INSERT INTO produccion_hora (
          fecha,
          id_turno,
          hora_desde,
          hora_hasta,
          id_celda,
          id_pieza,
          cantidad
       )
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
          hora_hasta = VALUES(hora_hasta),
          ${updateAmountSql}`,
      values
    );
  }
}

async function clearFutureProduction(connection, fecha) {
  const futureHours = SHIFTS.flatMap((shift) =>
    shift.hours
      .filter(([horaDesde]) => isFutureHourForDate(fecha, horaDesde))
      .map(([horaDesde]) => ({
        idTurno: shift.id,
        horaDesde
      }))
  );

  if (!futureHours.length) {
    return 0;
  }

  const conditions = futureHours.map(() => '(id_turno = ? AND hora_desde = ?)').join(' OR ');
  const values = futureHours.flatMap((hour) => [hour.idTurno, hour.horaDesde]);
  const [result] = await connection.execute(
    `UPDATE produccion_hora
     SET cantidad = 0,
         fecha_actualizacion = CURRENT_TIMESTAMP
     WHERE fecha = ?
       AND (${conditions})
       AND cantidad <> 0`,
    [fecha, ...values]
  );

  return result.affectedRows || 0;
}

async function importCsv(options = {}) {
  const csvPath = options.csvPath || requireEnv('CSV_PATH');
  const fecha = resolveImportDate(csvPath, options.fecha);
  const sourceInfo = await getCsvSourceInfo(csvPath);
  const rows = await readCsvRows(csvPath, options);
  const importableRows = rows.filter((row) => row[1] && row[2]);

  const pool = createPool();
  const connection = await pool.getConnection();
  const summary = {
    fecha,
    csvPath,
    ...sourceInfo,
    rowsRead: rows.length,
    rowsImported: 0,
    cellsImported: 0
  };

  try {
    await connection.beginTransaction();

    const celdaMap = await ensureCeldas(
      connection,
      [...new Set(importableRows.map((row) => row[1]))]
    );
    const piezaMap = await ensurePiezas(
      connection,
      [...new Set(importableRows.map((row) => row[2]))]
    );
    const productionRecords = [];
    let futureCellsSkipped = 0;

    for (const row of importableRows) {
      for (const shift of SHIFTS) {
        for (let index = 0; index < shift.hours.length; index += 1) {
          const [horaDesde, horaHasta] = shift.hours[index];

          if (options.skipFutureHours && isFutureHourForDate(fecha, horaDesde)) {
            futureCellsSkipped += 1;
            continue;
          }

          productionRecords.push({
            fecha,
            idTurno: shift.id,
            horaDesde,
            horaHasta,
            idCelda: celdaMap.get(row[1]),
            idPieza: piezaMap.get(row[2]),
            cantidad: parseAmount(row[shift.valueStartIndex + index])
          });
        }
      }

      summary.rowsImported += 1;
    }

    await upsertProductionBatch(connection, productionRecords, {
      preserveExistingPositiveOnZero: options.preserveExistingPositiveOnZero
    });
    summary.cellsImported = productionRecords.length;
    summary.futureCellsSkipped = futureCellsSkipped;

    if (options.clearFutureHours) {
      summary.futureCellsCleared = await clearFutureProduction(connection, fecha);
    }

    await connection.commit();

    return summary;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

module.exports = {
  importCsv,
  getCsvSourceInfo,
  resolveImportDate
};
