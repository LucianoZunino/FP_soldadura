const fs = require('fs/promises');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createPool } = require('../config/db');
const { requireEnv } = require('../config/env');
const { SHIFTS } = require('../constants/production');
const { normalizeDate, previousIsoDate } = require('../utils/dates');

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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readStableCsvContent(csvPath) {
  let previousStat = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentStat = await fs.stat(csvPath);

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

function resolveImportDate(csvPath, requestedDate) {
  const filename = path.basename(csvPath).toLocaleLowerCase('es');

  if (/(^|[_\-\s])ayer([_.\-\s]|$)/.test(filename)) {
    return previousIsoDate();
  }

  return normalizeDate(requestedDate);
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

async function importCsv(options = {}) {
  const csvPath = options.csvPath || requireEnv('CSV_PATH');
  const fecha = resolveImportDate(csvPath, options.fecha);
  const content = options.stableRead
    ? await readStableCsvContent(csvPath)
    : await readCsvContent(csvPath);
  const rows = parse(content, {
    bom: true,
    relaxColumnCount: true,
    skipEmptyLines: true,
    trim: true
  });

  const pool = createPool();
  const connection = await pool.getConnection();
  const summary = {
    fecha,
    csvPath,
    rowsRead: rows.length,
    rowsImported: 0,
    cellsImported: 0
  };

  try {
    await connection.beginTransaction();

    for (const row of rows) {
      const celda = row[1];
      const pieza = row[2];

      if (!celda || !pieza) {
        continue;
      }

      const idCelda = await getOrCreateCelda(connection, celda);
      const idPieza = await getOrCreatePieza(connection, pieza);

      for (const shift of SHIFTS) {
        for (let index = 0; index < shift.hours.length; index += 1) {
          const [horaDesde, horaHasta] = shift.hours[index];

          await upsertProduction(connection, {
            fecha,
            idTurno: shift.id,
            horaDesde,
            horaHasta,
            idCelda,
            idPieza,
            cantidad: parseAmount(row[shift.valueStartIndex + index])
          });

          summary.cellsImported += 1;
        }
      }

      summary.rowsImported += 1;
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
  resolveImportDate
};
