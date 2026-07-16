const { createPool } = require('../config/db');
const { getEnv } = require('../config/env');
const { isFutureHourForDate, normalizeDate, todayIsoDate } = require('../utils/dates');

const TURNOS = {
  'MAÑANA': 1,
  MANANA: 1,
  TARDE: 2,
  NOCHE: 3
};

function canonical(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function formatTime(value) {
  if (typeof value === 'string') return value;
  return String(value).slice(0, 8);
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function resolveMachineTarget(maquina) {
  const name = String(maquina || '').toUpperCase();

  if (name === 'SCHULER_3') {
    return { celda: 'LINEA SCHULER', pieza: 'PRENSA 3' };
  }

  if (name === 'VERSON_2_3') {
    return { celda: 'LINEA VERSON', pieza: 'PRENSA 3' };
  }

  if (name.startsWith('TUCKER_')) {
    return {
      celda: 'CELDA_TUCKER',
      pieza: name.replace(/^TUCKER_/, '').replace(/_/g, ' ')
    };
  }

  if (name.startsWith('MIG_2_GOR_')) {
    return {
      celda: 'MIG_GOR',
      pieza: name.replace(/^MIG_2_GOR_/, '').replace(/_/g, ' ')
    };
  }

  if (name.startsWith('MIG_1_APRON_')) {
    return {
      celda: 'MIG_1_APRON',
      pieza: name.replace(/^MIG_1_APRON_/, '').replace(/_/g, ' ')
    };
  }

  if (name.startsWith('MIG_4_APRON_')) {
    return {
      celda: 'MIG_4_APRON',
      pieza: name.replace(/^MIG_4_APRON_/, '').replace(/_/g, ' ')
    };
  }

  const celdaMatch = name.match(/^(CELDA_\d+)_(.+)$/);

  if (celdaMatch) {
    return {
      celda: celdaMatch[1],
      pieza: celdaMatch[2].replace(/_/g, ' ')
    };
  }

  return null;
}

async function getCatalogMaps(connection) {
  const [celdas] = await connection.execute('SELECT id_celda, nombre FROM celda');
  const [piezas] = await connection.execute('SELECT id_pieza, descripcion FROM pieza');

  return {
    celdas: new Map(celdas.map((row) => [canonical(row.nombre), row])),
    piezas: new Map(piezas.map((row) => [canonical(row.descripcion), row]))
  };
}

async function getMachineMappings(connection, fecha) {
  const [rows] = await connection.execute(
    `SELECT
        mpm.maquina_origen,
        mpm.id_celda,
        mpm.id_pieza,
        mpm.fecha_desde,
        mpm.fecha_hasta,
        mpm.prioridad,
        c.nombre AS celda,
        p.descripcion AS pieza
     FROM maquina_pieza_mapeo mpm
     INNER JOIN celda c ON c.id_celda = mpm.id_celda
     INNER JOIN pieza p ON p.id_pieza = mpm.id_pieza
     WHERE mpm.activo = 1
       AND mpm.fecha_desde <= ?
       AND (mpm.fecha_hasta IS NULL OR mpm.fecha_hasta >= ?)
     ORDER BY mpm.maquina_origen, mpm.prioridad DESC, mpm.fecha_desde DESC, mpm.id_mapeo DESC`,
    [fecha, fecha]
  );
  const mappings = new Map();

  for (const row of rows) {
    const key = canonical(row.maquina_origen);

    if (!mappings.has(key)) {
      mappings.set(key, row);
    }
  }

  return mappings;
}

function resolveMappedRecord(row, catalogMaps, machineMappings = new Map()) {
  const explicitMapping = machineMappings.get(canonical(row.maquina));

  if (explicitMapping) {
    return {
      fecha: normalizeDate(row.fecha_operativa instanceof Date
        ? row.fecha_operativa.toISOString().slice(0, 10)
        : String(row.fecha_operativa).slice(0, 10)),
      idTurno: TURNOS[String(row.turno || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()],
      horaDesde: formatTime(row.hora_desde),
      horaHasta: formatTime(row.hora_hasta),
      idCelda: explicitMapping.id_celda,
      idPieza: explicitMapping.id_pieza,
      cantidad: Number(row.cantidad || 0),
      maquina: row.maquina,
      mappingSource: 'explicit'
    };
  }

  const target = resolveMachineTarget(row.maquina);

  if (!target) {
    return { error: 'unmapped-machine', maquina: row.maquina };
  }

  const celda = catalogMaps.celdas.get(canonical(target.celda));
  const pieza = catalogMaps.piezas.get(canonical(target.pieza));

  if (!celda || !pieza) {
    return {
      error: 'missing-target',
      maquina: row.maquina,
      celda: target.celda,
      pieza: target.pieza,
      missingCelda: !celda,
      missingPieza: !pieza
    };
  }

  return {
    fecha: normalizeDate(row.fecha_operativa instanceof Date
      ? row.fecha_operativa.toISOString().slice(0, 10)
      : String(row.fecha_operativa).slice(0, 10)),
    idTurno: TURNOS[String(row.turno || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()],
    horaDesde: formatTime(row.hora_desde),
    horaHasta: formatTime(row.hora_hasta),
    idCelda: celda.id_celda,
    idPieza: pieza.id_pieza,
    cantidad: Number(row.cantidad || 0),
    maquina: row.maquina,
    mappingSource: 'fallback-parse'
  };
}

async function seedLknMachineMappings(options = {}) {
  const fecha = normalizeDate(options.fecha || todayIsoDate());
  const fechaDesde = normalizeDate(options.fechaDesde || fecha);
  const sourceSchema = getEnv('LKN_DB_NAME', 'lkn_soft');
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    const catalogMaps = await getCatalogMaps(connection);
    const [machines] = await connection.execute(
      `SELECT DISTINCT maquina
       FROM ${quoteIdentifier(sourceSchema)}.produccion_horaria
       WHERE fecha_operativa = ?
       ORDER BY maquina`,
      [fecha]
    );
    const inserted = [];
    const skipped = [];

    for (const row of machines) {
      const target = resolveMachineTarget(row.maquina);

      if (!target) {
        skipped.push({ maquina: row.maquina, reason: 'unmapped-machine' });
        continue;
      }

      const celda = catalogMaps.celdas.get(canonical(target.celda));
      const pieza = catalogMaps.piezas.get(canonical(target.pieza));

      if (!celda || !pieza) {
        skipped.push({
          maquina: row.maquina,
          celda: target.celda,
          pieza: target.pieza,
          missingCelda: !celda,
          missingPieza: !pieza,
          reason: 'missing-target'
        });
        continue;
      }

      await connection.execute(
        `INSERT INTO maquina_pieza_mapeo (
            maquina_origen,
            id_celda,
            id_pieza,
            fecha_desde,
            activo,
            prioridad,
            fuente,
            notas
         )
         VALUES (?, ?, ?, ?, 1, 100, 'auto-parse', ?)
         ON DUPLICATE KEY UPDATE
            activo = VALUES(activo),
            prioridad = VALUES(prioridad),
            fuente = VALUES(fuente),
            notas = VALUES(notas)`,
        [
          row.maquina,
          celda.id_celda,
          pieza.id_pieza,
          fechaDesde,
          `Generado desde lkn_soft.produccion_horaria para ${fecha}`
        ]
      );
      inserted.push({
        maquina: row.maquina,
        celda: celda.nombre,
        pieza: pieza.descripcion,
        fechaDesde
      });
    }

    return {
      fecha,
      fechaDesde,
      sourceSchema,
      machinesRead: machines.length,
      mappingsUpserted: inserted.length,
      skipped
    };
  } finally {
    connection.release();
    await pool.end();
  }
}

async function upsertLknMachineMapping(options = {}) {
  const maquina = String(options.maquina || '').trim();
  const fechaDesde = normalizeDate(options.fechaDesde || todayIsoDate());

  if (!maquina) {
    throw new Error('maquina is required');
  }

  if (!options.celda || !options.pieza) {
    throw new Error('celda and pieza are required');
  }

  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    const catalogMaps = await getCatalogMaps(connection);
    const celda = catalogMaps.celdas.get(canonical(options.celda));
    const pieza = catalogMaps.piezas.get(canonical(options.pieza));

    if (!celda || !pieza) {
      throw new Error(`Mapping target not found: celda=${options.celda}, pieza=${options.pieza}`);
    }

    await connection.beginTransaction();

    if (options.closePrevious !== false) {
      await connection.execute(
        `UPDATE maquina_pieza_mapeo
         SET fecha_hasta = DATE_SUB(?, INTERVAL 1 DAY),
             activo = 0
         WHERE maquina_origen = ?
           AND activo = 1
           AND fecha_desde < ?
           AND (fecha_hasta IS NULL OR fecha_hasta >= ?)`,
        [fechaDesde, maquina, fechaDesde, fechaDesde]
      );
    }

    await connection.execute(
      `INSERT INTO maquina_pieza_mapeo (
          maquina_origen,
          id_celda,
          id_pieza,
          fecha_desde,
          fecha_hasta,
          activo,
          prioridad,
          fuente,
          notas
       )
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          fecha_hasta = VALUES(fecha_hasta),
          activo = VALUES(activo),
          prioridad = VALUES(prioridad),
          fuente = VALUES(fuente),
          notas = VALUES(notas)`,
      [
        maquina,
        celda.id_celda,
        pieza.id_pieza,
        fechaDesde,
        options.fechaHasta || null,
        Number.parseInt(options.prioridad || 100, 10),
        options.fuente || 'manual',
        options.notas || null
      ]
    );

    await connection.commit();

    return {
      maquina,
      celda: celda.nombre,
      pieza: pieza.descripcion,
      fechaDesde,
      fechaHasta: options.fechaHasta || null,
      closePrevious: options.closePrevious !== false
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {
      // Ignore rollback errors and surface the original failure.
    }
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

async function getLknMachineMappings(options = {}) {
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    const values = [];
    let whereSql = '';

    if (options.maquina) {
      whereSql = 'WHERE mpm.maquina_origen = ?';
      values.push(options.maquina);
    }

    const [rows] = await connection.execute(
      `SELECT
          mpm.id_mapeo,
          mpm.maquina_origen,
          c.nombre AS celda,
          p.descripcion AS pieza,
          mpm.fecha_desde,
          mpm.fecha_hasta,
          mpm.activo,
          mpm.prioridad,
          mpm.fuente,
          mpm.notas
       FROM maquina_pieza_mapeo mpm
       INNER JOIN celda c ON c.id_celda = mpm.id_celda
       INNER JOIN pieza p ON p.id_pieza = mpm.id_pieza
       ${whereSql}
       ORDER BY mpm.maquina_origen, mpm.fecha_desde DESC, mpm.prioridad DESC`,
      values
    );

    return rows;
  } finally {
    connection.release();
    await pool.end();
  }
}

async function importLknProduction(options = {}) {
  const fecha = normalizeDate(options.fecha || todayIsoDate());
  const sourceSchema = getEnv('LKN_DB_NAME', 'lkn_soft');
  const replaceDate = options.replaceDate !== false;
  const skipFutureHours = options.skipFutureHours !== false;
  const pool = createPool();
  const connection = await pool.getConnection();

  try {
    const catalogMaps = await getCatalogMaps(connection);
    const machineMappings = await getMachineMappings(connection, fecha);
    const [sourceRows] = await connection.execute(
      `SELECT fecha_operativa, maquina, hora_desde, hora_hasta, turno, cantidad, actualizado_en
       FROM ${quoteIdentifier(sourceSchema)}.produccion_horaria
       WHERE fecha_operativa = ?
       ORDER BY maquina, hora_desde`,
      [fecha]
    );

    const mappedRecords = [];
    const failures = [];
    let futureRowsSkipped = 0;
    let explicitMappingsUsed = 0;
    let fallbackMappingsUsed = 0;

    for (const row of sourceRows) {
      const mapped = resolveMappedRecord(row, catalogMaps, machineMappings);

      if (mapped.error) {
        failures.push(mapped);
        continue;
      }

      if (!mapped.idTurno) {
        failures.push({ error: 'invalid-shift', maquina: row.maquina, turno: row.turno });
        continue;
      }

      if (skipFutureHours && isFutureHourForDate(fecha, mapped.horaDesde)) {
        futureRowsSkipped += 1;
        continue;
      }

      mappedRecords.push(mapped);

      if (mapped.mappingSource === 'explicit') {
        explicitMappingsUsed += 1;
      } else {
        fallbackMappingsUsed += 1;
      }
    }

    if (failures.length) {
      return {
        fecha,
        sourceSchema,
        sourceRows: sourceRows.length,
        rowsImported: 0,
        futureRowsSkipped,
        failures,
        skipped: true,
        reason: 'mapping-failures'
      };
    }

    await connection.beginTransaction();

    if (replaceDate) {
      await connection.execute('DELETE FROM produccion_hora WHERE fecha = ?', [fecha]);
    }

    if (mappedRecords.length) {
      const placeholders = mappedRecords.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
      const values = mappedRecords.flatMap((record) => [
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
            cantidad = VALUES(cantidad)`,
        values
      );
    }

    await connection.commit();

    return {
      fecha,
      sourceSchema,
      sourceRows: sourceRows.length,
      rowsImported: mappedRecords.length,
      machinesImported: new Set(mappedRecords.map((record) => record.maquina)).size,
      explicitMappingsUsed,
      fallbackMappingsUsed,
      futureRowsSkipped,
      replaceDate,
      skipped: false
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {
      // Ignore rollback errors and surface the original failure.
    }
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

module.exports = {
  getLknMachineMappings,
  importLknProduction,
  resolveMachineTarget,
  seedLknMachineMappings,
  upsertLknMachineMapping
};
