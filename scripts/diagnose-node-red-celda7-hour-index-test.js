const SOURCE_ENDPOINT_ID = 'd106bad673723722';
const TEST_FLOW_ID = 'tab_test_celda7_hour_index_diag';
const TEST_FLOW_LABEL = 'TEST - DIAGNOSTICO CELDA7 HORA 0 VS 24';
const NODE_RED_BASE_URL = String(process.env.NODE_RED_BASE_URL || '').replace(/\/+$/, '');
const MAX_CAPTURES = 100;

const TAG_BASES = [
  'PIEZAS_HORA.M3.D1.HORA',
  'PIEZAS_HORA.M4.D1.HORA',
  'PIEZAS_HORA.M4.D2.HORA',
  'PIEZAS_HORA.M4.D4.HORA',
  'PIEZAS_HORA.M4.D8.HORA'
];

async function readJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${url} fallo con HTTP ${response.status}: ${text}`);
  }

  const parsed = JSON.parse(text);
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
}

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-Deployment-Type': 'flows'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${url} fallo con HTTP ${response.status}: ${text}`);
  }

  return text;
}

function buildCaptureFunction() {
  const pointsJson = JSON.stringify(TAG_BASES, null, 2);

  return `function getByPath(obj, parts) {
    let current = obj;
    for (const part of parts) {
        if (!current || typeof current !== "object") return undefined;
        current = current[part];
    }
    return current;
}

function findValue(obj, variable) {
    const candidates = [
        variable,
        "OEE_SPOT." + variable,
        "Program:OEE_SPOT." + variable
    ];

    for (const key of candidates) {
        if (obj && obj[key] !== undefined) return obj[key];
    }

    if (obj && obj.OEE_SPOT) {
        for (const key of candidates) {
            if (obj.OEE_SPOT[key] !== undefined) return obj.OEE_SPOT[key];
        }
        const nested = getByPath(obj.OEE_SPOT, variable.split("."));
        if (nested !== undefined) return nested;
    }

    const directNested = getByPath(obj, variable.split("."));
    if (directNested !== undefined) return directNested;

    const stack = [obj];
    while (stack.length) {
        const current = stack.pop();
        if (!current || typeof current !== "object") continue;
        for (const [key, value] of Object.entries(current)) {
            if (candidates.some(candidate => key === candidate || key.endsWith(candidate))) {
                return value;
            }
            if (value && typeof value === "object") stack.push(value);
        }
    }

    return undefined;
}

function numberOrNull(value) {
    if (value && typeof value === "object" && value.value !== undefined) value = value.value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function sqlValue(value) {
    return value === null ? "NULL" : String(value);
}

const now = Date.now();
const lastCapture = context.get("lastCapture") || 0;
const captureCount = context.get("captureCount") || 0;

if (captureCount >= ${MAX_CAPTURES} || now - lastCapture < 1000) return null;

const payload = msg.payload || {};
const tagBases = ${pointsJson};
const rows = tagBases.map(tagBase => {
    const value0 = numberOrNull(findValue(payload, tagBase + "[0]"));
    const value24 = numberOrNull(findValue(payload, tagBase + "[24]"));
    return { tagBase, value0, value24 };
});

if (rows.every(row => row.value0 === null && row.value24 === null)) return null;

context.set("lastCapture", now);
context.set("captureCount", captureCount + 1);

const values = rows.map(row => "(" +
    "'" + row.tagBase.replace(/'/g, "''") + "'," +
    sqlValue(row.value0) + "," +
    sqlValue(row.value24) + "," +
    String(captureCount + 1) +
")").join(",");

msg.topic = \`
CREATE TABLE IF NOT EXISTS lkn_soft.celda7_indice_diagnostico_test (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    capturado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tag_base VARCHAR(120) NOT NULL,
    valor_indice_0 INT NULL,
    valor_indice_24 INT NULL,
    lectura_numero INT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_celda7_diag_capturado (capturado_en)
);
INSERT INTO lkn_soft.celda7_indice_diagnostico_test
    (tag_base, valor_indice_0, valor_indice_24, lectura_numero)
VALUES
\${values};
\`;

msg.payload = { ok: true, capture: captureCount + 1, rows };
return msg;`;
}

function buildFlow(sourceEndpoint, mysqlNode) {
  const endpointId = 'test_diag_celda7_endpoint_v1';
  const inputId = 'test_diag_celda7_input_v1';
  const functionId = 'test_diag_celda7_capture_v1';
  const mysqlId = 'test_diag_celda7_mysql_v1';
  const debugId = 'test_diag_celda7_debug_v1';
  const variables = {};

  for (const tagBase of TAG_BASES) {
    variables[`${tagBase}[0]`] = { type: 'INT' };
    variables[`${tagBase}[24]`] = { type: 'INT' };
  }

  return {
    id: TEST_FLOW_ID,
    label: TEST_FLOW_LABEL,
    disabled: false,
    info: 'Diagnostico temporal y aislado de indices 0/24 para CELDA_7. Escribe solo celda7_indice_diagnostico_test.',
    env: [],
    nodes: [
      {
        id: inputId,
        type: 'eth-ip in',
        z: TEST_FLOW_ID,
        endpoint: endpointId,
        mode: 'all',
        variable: '',
        program: '',
        name: 'TEST DIAG - CELDA_7 HORA 0 Y 24',
        x: 260,
        y: 140,
        wires: [[functionId]]
      },
      {
        id: functionId,
        type: 'function',
        z: TEST_FLOW_ID,
        name: `TEST DIAG - CAPTURAR ${MAX_CAPTURES} LECTURAS`,
        func: buildCaptureFunction(),
        outputs: 1,
        timeout: 0,
        noerr: 0,
        initialize: '',
        finalize: '',
        libs: [],
        x: 610,
        y: 140,
        wires: [[mysqlId]]
      },
      {
        ...mysqlNode,
        id: mysqlId,
        z: TEST_FLOW_ID,
        name: 'MYSQL TEST - DIAGNOSTICO CELDA7',
        x: 940,
        y: 140,
        wires: [[debugId]]
      },
      {
        id: debugId,
        type: 'debug',
        z: TEST_FLOW_ID,
        name: 'TEST DIAG - RESULTADO SQL',
        active: false,
        tosidebar: true,
        console: false,
        tostatus: false,
        complete: 'payload',
        targetType: 'msg',
        statusVal: '',
        statusType: 'auto',
        x: 1240,
        y: 140,
        wires: []
      }
    ],
    configs: [
      {
        ...sourceEndpoint,
        id: endpointId,
        name: 'TEST DIAG - CELDA 7 INDICES 0/24',
        cycletime: '1000',
        vartable: { OEE_SPOT: variables }
      }
    ],
    subflows: []
  };
}

async function main() {
  if (!NODE_RED_BASE_URL) {
    throw new Error('NODE_RED_BASE_URL es obligatoria.');
  }

  const shouldDeploy = process.argv.includes('--deploy');
  const shouldRemove = process.argv.includes('--remove');
  const allFlows = await readJson(`${NODE_RED_BASE_URL}/flows`);
  const existing = allFlows.find(
    node => node.id === TEST_FLOW_ID || node.label === TEST_FLOW_LABEL
  );

  if (shouldRemove) {
    if (!existing) {
      console.log(JSON.stringify({ operation: 'remove', removed: false, reason: 'not-found' }, null, 2));
      return;
    }

    const response = await sendJson(`${NODE_RED_BASE_URL}/flow/${existing.id}`, 'DELETE');
    console.log(JSON.stringify({ operation: 'remove', removed: true, flowId: existing.id, response }, null, 2));
    return;
  }

  const sourceEndpoint = allFlows.find(node => node.id === SOURCE_ENDPOINT_ID);
  const testFlow = await readJson(`${NODE_RED_BASE_URL}/flow/94735d01267fe806`);
  const mysqlNode = testFlow.nodes.find(node => node.id === 'test_all_mysql_v2');

  if (!sourceEndpoint || !mysqlNode) {
    throw new Error('No se encontraron el endpoint CELDA_7 o el nodo MySQL TEST requeridos.');
  }

  const flow = buildFlow(sourceEndpoint, mysqlNode);
  const summary = {
    mode: shouldDeploy ? 'deploy' : 'dry-run',
    operation: existing ? 'update' : 'create',
    flowId: existing ? existing.id : TEST_FLOW_ID,
    sourceAddress: sourceEndpoint.address,
    tags: TAG_BASES.length * 2,
    captures: MAX_CAPTURES,
    destination: 'lkn_soft.celda7_indice_diagnostico_test'
  };

  if (!shouldDeploy) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const method = existing ? 'PUT' : 'POST';
  const endpoint = existing
    ? `${NODE_RED_BASE_URL}/flow/${existing.id}`
    : `${NODE_RED_BASE_URL}/flow`;
  const response = await sendJson(endpoint, method, flow);
  console.log(JSON.stringify({ ...summary, response }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
