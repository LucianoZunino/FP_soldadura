const xlsx = require('xlsx');
const { createPool } = require('../config/db');
const { getEnv, requireEnv } = require('../config/env');

const CONFIRMED_OPERATIONAL_MATCHES = [
  { celda: 'CELDA_1', pieza: 'DASH OP20', articulo: 'MB3B-2101610-ED', criterio: 'alta-confianza-panel-dash-op20' },
  { celda: 'CELDA_2', pieza: 'COLW SIDE LH', articulo: 'MB3B-2102039-CA', criterio: 'media-confianza-tapa-side-member-lh' },
  { celda: 'CELDA_2', pieza: 'COLW SIDE RH', articulo: 'MB3B-2102038-CA', criterio: 'media-confianza-tapa-side-member-rh' },
  { celda: 'CELDA_2', pieza: 'MARIPOSAS', articulo: 'SC-4229', criterio: 'alta-confianza-mariposa-op40' },
  { celda: 'CELDA_2', pieza: 'SLED RUNNER RH', articulo: 'MB3B-21112B60-AA', criterio: 'alta-confianza-sled-runner-rh-op30' },
  { celda: 'CELDA_2', pieza: 'OMEGA OP10', articulo: 'MB3B-4110680-AB', criterio: 'alta-confianza-panel-omega-op10' },
  { celda: 'CELDA_3', pieza: 'CAJA DE AGUA OP10', articulo: 'MB3B-21021A40-DB', criterio: 'alta-confianza-caja-de-agua-op10' },
  { celda: 'CELDA_3', pieza: 'PILAR C RH OP30', articulo: 'N1WB-E28252-DB', criterio: 'alta-confianza-pilar-c-rh-op30' },
  { celda: 'CELDA_4', pieza: 'GOR INF OP20', articulo: 'SC-2033', criterio: 'media-confianza-gor-inferior-op20' },
  { celda: 'CELDA_4', pieza: 'S_MEMBER LH OP10', articulo: 'MB3B-2610111-EA', criterio: 'alta-confianza-side-member-lh-op10' },
  { celda: 'CELDA_4', pieza: 'PILAR B LH OP20', articulo: 'N1WB-E24373-CA', criterio: 'alta-confianza-pilar-b-lh-op20' },
  { celda: 'CELDA_4', pieza: 'GOR INF OP30', articulo: 'SC-2033', criterio: 'alta-confianza-gor-inferior-op30' },
  { celda: 'CELDA_5', pieza: 'TUNNEL OP10', articulo: 'MB3B-21111K48-CC', criterio: 'alta-confianza-tunel-op10' },
  { celda: 'CELDA_5', pieza: 'PILAR C LH OP30', articulo: 'N1WB-E28253-DB', criterio: 'alta-confianza-pilar-c-lh-op30' },
  { celda: 'CELDA_6', pieza: 'R_PANEL RH OP20', articulo: 'N1WB-E10128-DB', criterio: 'alta-confianza-rocker-panel-rh-op20' },
  { celda: 'CELDA_6', pieza: 'GOR SUP RH OP10', articulo: 'SC-2016', criterio: 'alta-confianza-gor-superior-rh-op10' },
  { celda: 'CELDA_6', pieza: 'PILAR A RH OP20', articulo: 'N1WB-E02690-BB', criterio: 'alta-confianza-pilar-a-rh-op20' },
  { celda: 'CELDA_7', pieza: 'R_PANEL LH OP20', articulo: 'N1WB-E10129-DB', criterio: 'alta-confianza-rocker-panel-lh-op20' },
  { celda: 'CELDA_7', pieza: 'GOR SUP LH OP10', articulo: 'SC-2017', criterio: 'alta-confianza-gor-superior-lh-op10' },
  { celda: 'CELDA_7', pieza: 'PILAR A LH OP20', articulo: 'N1WB-E02691-BB', criterio: 'alta-confianza-pilar-a-lh-op20' },
  { celda: 'CELDA_7', pieza: 'APRON OP80', articulo: 'SC-2059', criterio: 'alta-confianza-apron-lh-op80' },
  { celda: 'CELDA_8', pieza: 'FRONT FLOOR RH OP.30', articulo: 'MB3B-2110692-AD', criterio: 'alta-confianza-front-floor-rh-op30' },
  { celda: 'CELDA_8', pieza: 'FRONT FLOOR LH OP.30', articulo: 'MB3B-2110693-AC', criterio: 'alta-confianza-front-floor-lh-op30' },
  { celda: 'CELDA_9', pieza: 'TRAV OP20', articulo: 'MB3B-2610746-CB', criterio: 'alta-confianza-travesano-op20' },
  { celda: 'CELDA_9', pieza: 'S_MEMBER RH OP10', articulo: 'MB3B-2610110-EA', criterio: 'alta-confianza-side-member-rh-op10' },
  { celda: 'CELDA_9', pieza: 'PILAR B RH OP20', articulo: 'N1WB-E24372-CA', criterio: 'alta-confianza-pilar-b-rh-op20' },
  { celda: 'CELDA_TUCKER', pieza: 'CAJA DE AGUA', articulo: 'SC-2120', criterio: 'alta-confianza-caja-de-agua-tucker' },
  { celda: 'MIG_GOR', pieza: 'SUPERIOR OP10', articulo: 'CA-2000', criterio: 'alta-confianza-gor-superior-mig' }
];

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\r?\n/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/PANEL\s+/g, '')
    .replace(/TAPA\s+/g, '')
    .replace(/SIDE MEMBER/g, 'S MEMBER')
    .replace(/ROCKER PANEL/g, 'R PANEL')
    .replace(/TRAVESAÑO/g, 'TRAV')
    .replace(/TRAVESANO/g, 'TRAV')
    .replace(/MARIPOSAS/g, 'MARIPOSA')
    .replace(/TUNNEL/g, 'TUNEL')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCeldaName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^CELDA_/, '')
    .replace(/^MIG_1_APRON$/, 'MIG 1')
    .replace(/^MIG_4_APRON$/, 'MIG 4')
    .replace(/^MIG_GOR$/, 'MIG 2')
    .replace(/^CELDA_TUCKER$/, 'TUCKER')
    .replace(/^LINEA SCHULER$/, 'SCHULER')
    .replace(/^LINEA VERSON$/, 'VERSON');
}

function extractOperationToken(value) {
  const text = String(value || '').toUpperCase();
  const match = text.match(/\bOP[\s._-]*(\d{1,3})\b/);

  return match ? match[1] : null;
}

function similarityScore(left, right) {
  if (!left || !right) return 0;

  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const longest = Math.max(left.length, right.length);
    const shortest = Math.min(left.length, right.length);
    return shortest / longest;
  }

  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;

  if (shared === 0) return 0;

  return (2 * shared) / (leftTokens.size + rightTokens.size);
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDecimal(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readWorkbookRows(xlsxPath) {
  const workbook = xlsx.readFile(xlsxPath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas');
  }

  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: ''
  });
}

function parseArticleMappings(rows) {
  if (rows.length === 0) {
    return [];
  }

  const mappings = [];
  let currentArticle = null;
  let currentCelda = '';

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const celda = String(row[0] || '').trim();
    const articuloCodigo = String(row[1] || '').trim();
    const articuloDescripcion = String(row[2] || '').trim();
    const medio = String(row[3] || '').trim();
    const modulacion = parseInteger(row[4]);
    const stockFerrosider = parseInteger(row[5]);
    const stockFord = parseInteger(row[6]);
    const porcentajeCobertura = parseDecimal(row[7]);
    const componenteCodigo = String(row[8] || '').trim();

    if (celda) {
      currentCelda = celda;
    }

    if (articuloCodigo) {
      currentArticle = {
        codigo: articuloCodigo,
        descripcion: articuloDescripcion || articuloCodigo,
        celdaOrigen: currentCelda || null,
        medio: medio || null,
        modulacion,
        stockFerrosider,
        stockFord,
        porcentajeCobertura,
        componentes: []
      };

      mappings.push(currentArticle);
    }

    if (currentArticle && componenteCodigo) {
      currentArticle.componentes.push(componenteCodigo);
    }
  }

  return mappings;
}

async function getOrCreatePiezaByCode(connection, codigo) {
  const descripcion = String(codigo || '').trim();
  const [result] = await connection.execute(
    `INSERT INTO pieza (descripcion)
     VALUES (?)
     ON DUPLICATE KEY UPDATE id_pieza = LAST_INSERT_ID(id_pieza)`,
    [descripcion]
  );

  return result.insertId;
}

async function insertArticle(connection, article) {
  const [result] = await connection.execute(
    `INSERT INTO articulo_final (
        codigo,
        descripcion,
        celda_origen,
        medio,
        modulacion,
        stock_ferrosider,
        stock_ford,
        porcentaje_cobertura
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      article.codigo,
      article.descripcion,
      article.celdaOrigen,
      article.medio,
      article.modulacion,
      article.stockFerrosider,
      article.stockFord,
      article.porcentajeCobertura
    ]
  );

  return result.insertId;
}

async function linkArticleToPiece(connection, idArticuloFinal, idPieza, ordenComponente) {
  await connection.execute(
    `INSERT INTO pieza_articulo_final (id_pieza, id_articulo_final, orden_componente)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE orden_componente = VALUES(orden_componente)`,
    [idPieza, idArticuloFinal, ordenComponente]
  );
}

async function getArticleIdMap(connection) {
  const [rows] = await connection.query(
    'SELECT id_articulo_final, codigo, descripcion, celda_origen FROM articulo_final'
  );

  return new Map(
    rows.map((row) => [
      row.codigo,
      {
        id: row.id_articulo_final,
        codigo: row.codigo,
        descripcion: row.descripcion,
        celdaOrigen: row.celda_origen
      }
    ])
  );
}

async function getOperationalRows(connection) {
  const [rows] = await connection.query(`
    SELECT DISTINCT
      c.id_celda,
      c.nombre AS celda,
      p.id_pieza,
      p.descripcion AS pieza
    FROM produccion_hora ph
    INNER JOIN celda c ON c.id_celda = ph.id_celda
    INNER JOIN pieza p ON p.id_pieza = ph.id_pieza
    ORDER BY c.nombre, p.descripcion
  `);

  return rows;
}

async function linkOperationalPiece(connection, row) {
  await connection.execute(
    `INSERT INTO celda_pieza_articulo_final (
        id_celda,
        id_pieza,
        id_articulo_final,
        fuente,
        confianza,
        criterio
     )
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        fuente = VALUES(fuente),
        confianza = VALUES(confianza),
        criterio = VALUES(criterio)`,
    [
      row.idCelda,
      row.idPieza,
      row.idArticuloFinal,
      row.fuente,
      row.confianza,
      row.criterio
    ]
  );
}

function buildOperationalArticleCandidates(mappings) {
  return mappings.map((article) => ({
    codigo: article.codigo,
    descripcion: article.descripcion,
    celdaOrigen: article.celdaOrigen,
    normalizedDescripcion: normalizeText(article.descripcion),
    normalizedCelda: normalizeCeldaName(article.celdaOrigen)
  }));
}

function resolveOperationalMatch(row, articleCandidates) {
  const normalizedPiece = normalizeText(row.pieza);
  const normalizedCelda = normalizeCeldaName(row.celda);
  const pieceOperation = extractOperationToken(row.pieza);
  const candidates = articleCandidates
    .map((candidate) => {
      const articleOperation = extractOperationToken(candidate.descripcion);

      if (pieceOperation && articleOperation && pieceOperation !== articleOperation) {
        return {
          ...candidate,
          totalScore: 0,
          descriptionScore: 0,
          cellBonus: 0
        };
      }

      if (pieceOperation && !articleOperation) {
        return {
          ...candidate,
          totalScore: 0,
          descriptionScore: 0,
          cellBonus: 0
        };
      }

      const descriptionScore = similarityScore(normalizedPiece, candidate.normalizedDescripcion);
      const cellBonus =
        normalizedCelda && candidate.normalizedCelda && normalizedCelda === candidate.normalizedCelda
          ? 0.25
          : 0;

      return {
        ...candidate,
        totalScore: descriptionScore + cellBonus,
        descriptionScore,
        cellBonus
      };
    })
    .sort((left, right) => right.totalScore - left.totalScore || right.descriptionScore - left.descriptionScore);

  const best = candidates[0];
  const second = candidates[1];

  if (!best) {
    return null;
  }

  const gap = best.totalScore - (second?.totalScore || 0);
  const minScore = pieceOperation ? 0.7 : 0.85;
  const isAccepted = best.totalScore >= minScore && gap >= 0.12;

  if (!isAccepted) {
    return null;
  }

  return {
    articuloCodigo: best.codigo,
    fuente: 'descripcion_normalizada',
    confianza: Number(best.totalScore.toFixed(4)),
    criterio: `score=${best.totalScore.toFixed(4)} gap=${gap.toFixed(4)}`
  };
}

async function importOperationalRelations(connection, mappings) {
  const articleIdMap = await getArticleIdMap(connection);
  const operationalRows = await getOperationalRows(connection);
  const confirmedMap = new Map(
    CONFIRMED_OPERATIONAL_MATCHES.map((item) => [`${item.celda}::${item.pieza}`, item])
  );
  const summary = {
    operationalRowsRead: operationalRows.length,
    operationalMatchesImported: 0,
    operationalMatchesAuto: 0,
    operationalMatchesOverride: 0
  };

  await connection.execute('DELETE FROM celda_pieza_articulo_final');

  for (const row of operationalRows) {
    const confirmed = confirmedMap.get(`${row.celda}::${row.pieza}`);

    if (!confirmed) {
      continue;
    }

    const article = articleIdMap.get(confirmed.articulo);

    if (!article) {
      continue;
    }

    await linkOperationalPiece(connection, {
      idCelda: row.id_celda,
      idPieza: row.id_pieza,
      idArticuloFinal: article.id,
      fuente: confirmed.criterio.startsWith('media-')
        ? 'media_confianza_confirmada'
        : 'alta_confianza_confirmada',
      confianza: 1,
      criterio: confirmed.criterio
    });

    summary.operationalMatchesImported += 1;
    summary.operationalMatchesOverride += 1;
  }

  return summary;
}

async function importArticleRelations(options = {}) {
  const xlsxPath = options.xlsxPath || getEnv('ARTICLES_XLSX_PATH') || requireEnv('ARTICLES_XLSX_PATH');
  const rows = readWorkbookRows(xlsxPath);
  const mappings = parseArticleMappings(rows);
  const pool = createPool();
  const connection = await pool.getConnection();
  const summary = {
    xlsxPath,
    articlesRead: mappings.length,
    articleLinksRead: 0,
    piecesCreatedOrReused: 0,
    articlesImported: 0,
    linksImported: 0,
    componentsWithMultipleArticles: 0,
    operationalRowsRead: 0,
    operationalMatchesImported: 0,
    operationalMatchesAuto: 0,
    operationalMatchesOverride: 0
  };

  try {
    const componentUsage = new Map();

    for (const article of mappings) {
      summary.articleLinksRead += article.componentes.length;

      for (const component of article.componentes) {
        const key = normalizeCode(component);
        componentUsage.set(key, (componentUsage.get(key) || 0) + 1);
      }
    }

    summary.componentsWithMultipleArticles = Array.from(componentUsage.values())
      .filter((count) => count > 1)
      .length;

    await connection.beginTransaction();
    await connection.execute('DELETE FROM celda_pieza_articulo_final');
    await connection.execute('DELETE FROM pieza_articulo_final');
    await connection.execute('DELETE FROM articulo_final');

    for (const article of mappings) {
      const idArticuloFinal = await insertArticle(connection, article);
      summary.articlesImported += 1;

      for (let index = 0; index < article.componentes.length; index += 1) {
        const componente = article.componentes[index];
        const idPieza = await getOrCreatePiezaByCode(connection, componente);

        summary.piecesCreatedOrReused += 1;
        await linkArticleToPiece(connection, idArticuloFinal, idPieza, index + 1);
        summary.linksImported += 1;
      }
    }

    const operationalSummary = await importOperationalRelations(connection, mappings);
    Object.assign(summary, operationalSummary);

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
  importArticleRelations
};
