const { createPool } = require('../config/db');
const { SHIFTS, hourLabel, productionStatus } = require('../constants/production');
const { normalizeDate } = require('../utils/dates');

function formatTime(value) {
  if (typeof value === 'string') return value;
  return String(value).slice(0, 8);
}

function emptyHours() {
  return Object.fromEntries(
    SHIFTS.flatMap((shift) =>
      shift.hours.map((hour) => [
        `${shift.id}:${hour[0]}`,
        {
          idTurno: shift.id,
          label: hourLabel(hour),
          horaDesde: hour[0],
          horaHasta: hour[1],
          cantidad: 0,
          status: 'empty'
        }
      ])
    )
  );
}

function buildMatrix(rows) {
  const map = new Map();

  for (const row of rows) {
    const key = `${row.id_celda}:${row.id_pieza}`;

    if (!map.has(key)) {
      map.set(key, {
        idCelda: row.id_celda,
        celda: row.celda,
        idPieza: row.id_pieza,
        pieza: row.pieza,
        articulosFinales: row.articulos_finales || '',
        articulosFinalesDetalle: row.articulos_finales_detalle || '',
        cantidadArticulosFinales: Number(row.cantidad_articulos_finales || 0),
        hours: emptyHours(),
        totalsByShift: { 1: 0, 2: 0, 3: 0 },
        total: 0
      });
    }

    const item = map.get(key);
    const horaDesde = formatTime(row.hora_desde);
    const horaHasta = formatTime(row.hora_hasta);
    const amount = Number(row.cantidad || 0);
    const hourKey = `${row.id_turno}:${horaDesde}`;

    item.hours[hourKey] = {
      idTurno: row.id_turno,
      label: hourLabel([horaDesde, horaHasta]),
      horaDesde,
      horaHasta,
      cantidad: amount,
      status: productionStatus(amount, row.celda)
    };

    item.totalsByShift[row.id_turno] += amount;
    item.total += amount;
  }

  return Array.from(map.values()).sort((a, b) => {
    const byCell = a.celda.localeCompare(b.celda, 'es', { numeric: true });
    return byCell || a.pieza.localeCompare(b.pieza, 'es', { numeric: true });
  });
}

async function getProductionRows(fecha) {
  const pool = createPool();

  try {
    const [rows] = await pool.execute(
      `SELECT
          ph.fecha,
          ph.id_turno,
          ph.hora_desde,
          ph.hora_hasta,
          ph.cantidad,
          c.id_celda,
          c.nombre AS celda,
          p.id_pieza,
          p.descripcion AS pieza,
          COALESCE(operational_map.articulos_finales, article_map.articulos_finales, 'SUBPROCESO') AS articulos_finales,
          COALESCE(operational_map.articulos_finales_detalle, article_map.articulos_finales_detalle, '') AS articulos_finales_detalle,
          COALESCE(operational_map.cantidad_articulos_finales, article_map.cantidad_articulos_finales, 0) AS cantidad_articulos_finales
       FROM produccion_hora ph
       INNER JOIN celda c ON c.id_celda = ph.id_celda
       INNER JOIN pieza p ON p.id_pieza = ph.id_pieza
       LEFT JOIN (
         SELECT
           cpaf.id_celda,
           cpaf.id_pieza,
           GROUP_CONCAT(af.codigo ORDER BY af.codigo SEPARATOR ' | ') AS articulos_finales,
           GROUP_CONCAT(CONCAT(af.codigo, ' - ', af.descripcion) ORDER BY af.codigo SEPARATOR ' || ') AS articulos_finales_detalle,
           COUNT(*) AS cantidad_articulos_finales
         FROM celda_pieza_articulo_final cpaf
         INNER JOIN articulo_final af ON af.id_articulo_final = cpaf.id_articulo_final
         GROUP BY cpaf.id_celda, cpaf.id_pieza
       ) operational_map ON operational_map.id_celda = ph.id_celda AND operational_map.id_pieza = ph.id_pieza
       LEFT JOIN (
         SELECT
           paf.id_pieza,
           GROUP_CONCAT(af.codigo ORDER BY af.codigo SEPARATOR ' | ') AS articulos_finales,
           GROUP_CONCAT(CONCAT(af.codigo, ' - ', af.descripcion) ORDER BY af.codigo SEPARATOR ' || ') AS articulos_finales_detalle,
           COUNT(*) AS cantidad_articulos_finales
         FROM pieza_articulo_final paf
         INNER JOIN articulo_final af ON af.id_articulo_final = paf.id_articulo_final
         GROUP BY paf.id_pieza
       ) article_map ON article_map.id_pieza = p.id_pieza
       WHERE ph.fecha = ?
       ORDER BY c.nombre, p.descripcion, ph.id_turno, ph.hora_desde`,
      [fecha]
    );

    return rows;
  } finally {
    await pool.end();
  }
}

async function getDashboard(fechaInput) {
  const fecha = normalizeDate(fechaInput);
  const rows = await getProductionRows(fecha);
  const matrix = buildMatrix(rows);
  const totalsByShift = { 1: 0, 2: 0, 3: 0 };
  let totalProductosFinales = 0;

  for (const item of matrix) {
    if (item.cantidadArticulosFinales > 0) {
      totalProductosFinales += item.total;
    }

    for (const shift of SHIFTS) {
      totalsByShift[shift.id] += item.totalsByShift[shift.id];
    }
  }

  return {
    fecha,
    shifts: SHIFTS.map((shift) => ({
      id: shift.id,
      label: shift.label,
      description: shift.description,
      hours: shift.hours.map((hour) => ({
        label: hourLabel(hour),
        horaDesde: hour[0],
        horaHasta: hour[1]
      }))
    })),
    summary: {
      celdas: new Set(matrix.map((item) => item.idCelda)).size,
      piezas: new Set(matrix.map((item) => item.idPieza)).size,
      total: matrix.reduce((sum, item) => sum + item.total, 0),
      totalProductosFinales,
      totalsByShift
    },
    rows: matrix
  };
}

async function getShift(fechaInput, idTurnoInput) {
  const dashboard = await getDashboard(fechaInput);
  const idTurno = Number(idTurnoInput || 1);
  const shift = dashboard.shifts.find((item) => item.id === idTurno) || dashboard.shifts[0];

  return {
    ...dashboard,
    selectedShift: shift,
    rows: dashboard.rows.map((row) => ({
      ...row,
      hours: Object.fromEntries(
        Object.entries(row.hours).filter(([, hour]) => hour.idTurno === shift.id)
      ),
      total: row.totalsByShift[shift.id]
    }))
  };
}

async function getCatalogs() {
  const pool = createPool();

  try {
    const [celdas] = await pool.execute('SELECT id_celda AS id, nombre FROM celda ORDER BY nombre');
    const [piezas] = await pool.execute('SELECT id_pieza AS id, descripcion FROM pieza ORDER BY descripcion');
    const [articulosFinales] = await pool.execute(
      'SELECT id_articulo_final AS id, codigo, descripcion FROM articulo_final ORDER BY codigo'
    );

    return { celdas, piezas, articulosFinales };
  } finally {
    await pool.end();
  }
}

module.exports = {
  getDashboard,
  getShift,
  getCatalogs
};
