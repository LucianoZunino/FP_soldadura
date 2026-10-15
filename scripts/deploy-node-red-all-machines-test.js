const crypto = require('crypto');

const NODE_RED_BASE_URL = String(process.env.NODE_RED_BASE_URL || '').replace(/\/+$/, '');
const SOURCE_FLOW_ID = 'tab_prod_soldadura_24h';
const TEST_FLOW_LABEL = 'TEST - SOLDADURA CORRECCION HORARIA';
const LEGACY_TEST_FLOW_LABEL = 'TEST - TUCKER CORRECCION HORARIA';
const ZERO_RESET_GRACE_MINUTES = 10;
const CELDA_7_BRANCH_PATTERN = /\bCELDA_7\b/;

async function readJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${url} fallo con HTTP ${response.status}: ${text}`);
  }

  const parsed = JSON.parse(text);
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
}

function buildTestFunction(sourceCode, sourceName) {
  let result = sourceCode;

  if (!result.includes('inicioBloqueMs > Date.now()')) {
    const hourPattern = /^([ \t]*)const horaInicio = indiceAHoraInicio\(indice\);\r?\n\1const turno = turnoPorHora\(horaInicio\);/m;
    const hourMatch = result.match(hourPattern);

    if (!hourMatch) {
      throw new Error(`${sourceName}: no se encontro el punto seguro para el filtro temporal.`);
    }

    const indent = hourMatch[1];
    const hourReplacement = [
      `${indent}const horaInicio = indiceAHoraInicio(indice);`,
      `${indent}const inicioBloqueMs = new Date(`,
      `${indent}    fechaHoraDesde(fechaOperativa, horaInicio).replace(" ", "T")`,
      `${indent}).getTime();`,
      '',
      `${indent}// Solo persiste el bloque actual y los ya transcurridos.`,
      `${indent}if (!Number.isFinite(inicioBloqueMs) || inicioBloqueMs > Date.now()) {`,
      `${indent}    continue;`,
      `${indent}}`,
      '',
      `${indent}const turno = turnoPorHora(horaInicio);`
    ].join('\n');

    result = result.replace(hourPattern, hourReplacement);
  }

  if (!result.includes(`INTERVAL ${ZERO_RESET_GRACE_MINUTES} MINUTE`)) {
    const zeroPattern = /^([ \t]*)cantidad = CASE\r?\n[ \t]*WHEN VALUES\(cantidad\) = 0 AND cantidad > 0 THEN cantidad\r?\n[ \t]*ELSE VALUES\(cantidad\)\r?\n[ \t]*END,/m;
    const zeroMatch = result.match(zeroPattern);

    if (!zeroMatch) {
      throw new Error(`${sourceName}: no se encontro la preservacion incorrecta de positivos.`);
    }

    const zeroIndent = zeroMatch[1];
    const guardedZeroUpdate = [
      `${zeroIndent}cantidad = CASE`,
      `${zeroIndent}    WHEN VALUES(cantidad) = 0`,
      `${zeroIndent}         AND cantidad > 0`,
      `${zeroIndent}         AND CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00') >`,
      `${zeroIndent}             DATE_ADD(VALUES(fecha_hora_hasta), INTERVAL ${ZERO_RESET_GRACE_MINUTES} MINUTE)`,
      `${zeroIndent}    THEN cantidad`,
      `${zeroIndent}    ELSE VALUES(cantidad)`,
      `${zeroIndent}END,`
    ].join('\n');

    result = result.replace(zeroPattern, guardedZeroUpdate);
  }

  result = result
    .replace(/\bproduccion_horaria\b/g, 'produccion_horaria_test')
    .replace(/\bdashboard_equipos_live\b/g, 'dashboard_equipos_live_test')
    .replace(/prod_horaria_v\d+\|/g, 'prod_horaria_test_v2|')
    .replaceAll('Producci\u00f3n soldadura preparada correctamente.', 'Produccion TEST preparada correctamente.')
    .replaceAll('Produccion soldadura preparada correctamente.', 'Produccion TEST preparada correctamente.');

  if (CELDA_7_BRANCH_PATTERN.test(sourceName)) {
    const indicesPattern = /const indicesOperativos\s*=\s*\[([^\]]+)]\s*;/;
    const indicesMatch = result.match(indicesPattern);

    if (!indicesMatch) {
      throw new Error(`${sourceName}: no se encontro indicesOperativos para corregir CELDA_7.`);
    }

    const indices = indicesMatch[1].split(',').map((value) => Number(value.trim()));

    const has24 = indices.filter((value) => value === 24).length === 1;
    const has0 = indices.filter((value) => value === 0).length === 1;

    if (has24 === has0) {
      throw new Error(`${sourceName}: indicesOperativos no tiene el formato esperado para CELDA_7.`);
    }

    if (has24) {
      const correctedIndices = indices.map((value) => value === 24 ? 0 : value);
      result = result.replace(
        indicesPattern,
        `const indicesOperativos = [${correctedIndices.join(',')}];`
      );
    }
  }

  const finalIndicesMatch = result.match(/const indicesOperativos\s*=\s*\[([^\]]+)]\s*;/);
  const finalIndices = finalIndicesMatch
    ? finalIndicesMatch[1].split(',').map((value) => Number(value.trim()))
    : [];
  const midnightIndices = [0, 24].filter((value) => finalIndices.includes(value));

  if (midnightIndices.length !== 1) {
    throw new Error(`${sourceName}: no se pudo determinar un unico indice de medianoche.`);
  }

  const midnightIndex = midnightIndices[0];

  const forbiddenPatterns = [
    /INSERT INTO produccion_horaria\s/i,
    /INSERT INTO dashboard_equipos_live\s/i,
    /WHEN VALUES\(cantidad\) = 0 AND cantidad > 0 THEN cantidad/i
  ];

  if (forbiddenPatterns.some((pattern) => pattern.test(result))) {
    throw new Error(`${sourceName}: la funcion TEST conserva una referencia productiva.`);
  }

  if (
    !result.includes("CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-03:00')") ||
    !result.includes(`INTERVAL ${ZERO_RESET_GRACE_MINUTES} MINUTE`)
  ) {
    throw new Error(`${sourceName}: falta la proteccion temporal para ceros tardios.`);
  }

  if (CELDA_7_BRANCH_PATTERN.test(sourceName) && !result.includes('const indicesOperativos = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3,4,5];')) {
    throw new Error(`${sourceName}: CELDA_7 no quedo configurada con indice [0] para 00-01.`);
  }

  new Function('msg', 'context', 'node', result);
  return { functionCode: result, midnightIndex };
}

function incomingNodes(nodes, targetId) {
  return nodes.filter(
    (node) => Array.isArray(node.wires) && node.wires.flat(2).includes(targetId)
  );
}

function resolveBranch(nodes, transform) {
  const limiters = incomingNodes(nodes, transform.id).filter((node) => node.type === 'function');

  if (limiters.length !== 1) {
    throw new Error(`${transform.name}: se esperaban 1 limitador y se encontraron ${limiters.length}.`);
  }

  const limiter = limiters[0];
  const inputs = incomingNodes(nodes, limiter.id).filter((node) => node.type === 'eth-ip in');

  if (inputs.length !== 1) {
    throw new Error(`${transform.name}: se esperaba 1 entrada ETH-IP y se encontraron ${inputs.length}.`);
  }

  return { input: inputs[0], limiter, transform };
}

function requireNode(nodes, name) {
  const node = nodes.find((candidate) => candidate.name === name);

  if (!node) {
    throw new Error(`No se encontro el nodo fuente: ${name}`);
  }

  return node;
}

function testId(prefix, sourceId) {
  return `test_${prefix}_${sourceId}`;
}

function buildStatusAuditFunction(sourceNames) {
  const functionCode = `function sqlString(value) {
    if (value === null || value === undefined || value === "") return "NULL";
    return "'" + String(value).replace(/\\\\/g, "\\\\\\\\").replace(/'/g, "''") + "'";
}

const status = msg.status || {};
const source = status.source || {};
const sourceNames = ${JSON.stringify(sourceNames, null, 2)};

if (!source.id) return null;

const sourceName = sourceNames[source.id] || source.name || source.id;
const statusSignature = [status.text || "", status.fill || "", status.shape || ""].join("|");
const contextKey = "plc-status|" + source.id;

if (context.get(contextKey) === statusSignature) return null;
context.set(contextKey, statusSignature);

msg.topic = \`
CREATE TABLE IF NOT EXISTS lkn_soft.plc_estado_diagnostico_test (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    registrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nodo_id VARCHAR(80) NOT NULL,
    nodo_nombre VARCHAR(180) NOT NULL,
    estado_texto VARCHAR(255) NULL,
    color VARCHAR(30) NULL,
    forma VARCHAR(30) NULL,
    PRIMARY KEY (id),
    KEY idx_plc_estado_fecha (registrado_en),
    KEY idx_plc_estado_nodo (nodo_id, registrado_en)
);
INSERT INTO lkn_soft.plc_estado_diagnostico_test
    (nodo_id, nodo_nombre, estado_texto, color, forma)
VALUES
    (\${sqlString(source.id)}, \${sqlString(sourceName)}, \${sqlString(status.text)},
     \${sqlString(status.fill)}, \${sqlString(status.shape)});
\`;
msg.payload = { ok: true, source: sourceName, status };
return msg;`;

  new Function('msg', 'context', 'node', functionCode);
  return functionCode;
}

function buildTestFlow(sourceFlow, targetFlowId) {
  const sourceTransforms = sourceFlow.nodes.filter(
    (node) => node.type === 'function' && /INSERT INTO produccion_horaria\s/i.test(String(node.func || ''))
  );

  if (sourceTransforms.length !== 15) {
    throw new Error(`Se esperaban 15 ramas productivas y se encontraron ${sourceTransforms.length}.`);
  }

  const branches = sourceTransforms.map((transform) => resolveBranch(sourceFlow.nodes, transform));
  const sourceQueue = requireNode(sourceFlow.nodes, 'PROD SOLD - COLA MYSQL UNICA 1 MSG / 3S');
  const sourceMysql = requireNode(sourceFlow.nodes, 'MYSQL - PROD SOLD COLA UNICA');
  const queueId = 'test_all_shared_queue_v2';
  const mysqlId = 'test_all_mysql_v2';
  const errorId = 'test_all_error_v2';
  const successId = 'test_all_success_v2';
  const nodes = [
    {
      id: 'test_all_comment_v2',
      type: 'comment',
      z: targetFlowId,
      name: 'TEST AISLADO: 15 ramas sin escrituras productivas',
      info: [
        'Valida ceros durante el bloque activo, protege positivos ante reinicios tardios y descarta horarios futuros.',
        'Destinos: lkn_soft.produccion_horaria_test y dashboard_equipos_live_test.'
      ].join(' '),
      x: 390,
      y: 60,
      wires: []
    }
  ];

  const branchSummary = [];
  const monitoredInputIds = [];
  const monitoredInputNames = {};

  branches.forEach((branch, index) => {
    const inputId = testId('input', branch.input.id);
    const limiterId = testId('limiter', branch.limiter.id);
    const transformId = testId('transform', branch.transform.id);
    const y = 120 + index * 80;
    const { functionCode, midnightIndex } = buildTestFunction(
      branch.transform.func,
      branch.transform.name
    );

    monitoredInputIds.push(inputId);
    monitoredInputNames[inputId] = branch.input.name;

    nodes.push(
      {
        ...branch.input,
        id: inputId,
        z: targetFlowId,
        name: `TEST - ${branch.input.name}`,
        x: 260,
        y,
        wires: [[limiterId]]
      },
      {
        ...branch.limiter,
        id: limiterId,
        z: targetFlowId,
        name: `TEST - ${branch.limiter.name}`,
        x: 620,
        y,
        wires: [[transformId]]
      },
      {
        ...branch.transform,
        id: transformId,
        z: targetFlowId,
        name: `TEST - ${branch.transform.name}`,
        func: functionCode,
        x: 1040,
        y,
        wires: [[queueId], [errorId]]
      }
    );

    branchSummary.push({
      input: branch.input.name,
      transform: branch.transform.name,
      endpoint: branch.input.endpoint,
      midnightIndex,
      functionSha256: crypto.createHash('sha256').update(functionCode).digest('hex')
    });
  });

  nodes.push(
    {
      id: 'test_all_plc_status_v1',
      type: 'status',
      z: targetFlowId,
      name: 'TEST - ESTADO REAL ETH-IP',
      scope: monitoredInputIds,
      x: 280,
      y: 1360,
      wires: [['test_all_plc_status_audit_v1']]
    },
    {
      id: 'test_all_plc_status_audit_v1',
      type: 'function',
      z: targetFlowId,
      name: 'TEST - AUDITAR ESTADO PLC',
      func: buildStatusAuditFunction(monitoredInputNames),
      outputs: 1,
      timeout: 0,
      noerr: 0,
      initialize: '',
      finalize: '',
      libs: [],
      x: 650,
      y: 1360,
      wires: [[queueId]]
    },
    {
      ...sourceQueue,
      id: queueId,
      z: targetFlowId,
      name: 'TEST - COLA MYSQL 20 MSG/S',
      pauseType: 'rate',
      rate: '20',
      nbRateUnits: '1',
      rateUnits: 'second',
      drop: false,
      x: 1480,
      y: 680,
      wires: [[mysqlId]]
    },
    {
      ...sourceMysql,
      id: mysqlId,
      z: targetFlowId,
      name: 'MYSQL TEST SOLDADURA AISLADO',
      x: 1780,
      y: 680,
      wires: [[successId]]
    },
    {
      id: errorId,
      type: 'debug',
      z: targetFlowId,
      name: 'ERROR TEST SOLDADURA',
      active: true,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'payload',
      targetType: 'msg',
      statusVal: '',
      statusType: 'auto',
      x: 1480,
      y: 760,
      wires: []
    },
    {
      id: successId,
      type: 'debug',
      z: targetFlowId,
      name: 'RESULTADO SQL TEST SOLDADURA',
      active: false,
      tosidebar: true,
      console: false,
      tostatus: false,
      complete: 'payload',
      targetType: 'msg',
      statusVal: '',
      statusType: 'auto',
      x: 2080,
      y: 680,
      wires: []
    }
  );

  return {
    flow: {
      id: targetFlowId,
      label: TEST_FLOW_LABEL,
      disabled: false,
      info: [
        'Prueba aislada de las 15 ramas. No escribe tablas productivas.',
        `Acepta ceros hasta ${ZERO_RESET_GRACE_MINUTES} minutos despues del cierre del bloque, protege el historico, descarta bloques futuros y usa una cola MySQL TEST independiente.`,
        'CELDA_7 usa HORA[0] para el bloque 00-01; las demas ramas conservan su indice productivo.'
      ].join(' '),
      env: [],
      nodes,
      configs: [],
      subflows: []
    },
    branchSummary
  };
}

async function main() {
  if (!NODE_RED_BASE_URL) {
    throw new Error('NODE_RED_BASE_URL es obligatoria.');
  }

  const shouldDeploy = process.argv.includes('--deploy');
  const allFlows = await readJson(`${NODE_RED_BASE_URL}/flows`);
  const existing = allFlows.find(
    (node) => node.label === TEST_FLOW_LABEL || node.label === LEGACY_TEST_FLOW_LABEL
  );
  const targetFlowId = existing ? existing.id : 'tab_test_soldadura_all_v2';
  const sourceFlow = await readJson(`${NODE_RED_BASE_URL}/flow/${SOURCE_FLOW_ID}`);
  const { flow, branchSummary } = buildTestFlow(sourceFlow, targetFlowId);
  const summary = {
    mode: shouldDeploy ? 'deploy' : 'dry-run',
    operation: existing ? 'update' : 'create',
    sourceFlow: SOURCE_FLOW_ID,
    testFlow: targetFlowId,
    testTables: ['produccion_horaria_test', 'dashboard_equipos_live_test'],
    branchCount: branchSummary.length,
    nodeCount: flow.nodes.length,
    queueRate: '20 msg/s',
    zeroResetGraceMinutes: ZERO_RESET_GRACE_MINUTES,
    branches: branchSummary
  };

  if (!shouldDeploy) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const endpoint = existing
    ? `${NODE_RED_BASE_URL}/flow/${targetFlowId}`
    : `${NODE_RED_BASE_URL}/flow`;
  const response = await fetch(endpoint, {
    method: existing ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-Deployment-Type': 'flows'
    },
    body: JSON.stringify(flow)
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`${existing ? 'PUT' : 'POST'} /flow fallo con HTTP ${response.status}: ${responseText}`);
  }

  console.log(JSON.stringify({
    ...summary,
    status: response.status,
    response: responseText || null
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
