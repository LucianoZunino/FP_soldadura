const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  CELDA_7_SOURCE_ENDPOINT_ID,
  TEST_CELDA_7_ENDPOINT_ID,
  assertCelda7Endpoint,
  buildCelda7Endpoint
} = require('./node-red-celda7-config');

const NODE_RED_BASE_URL = String(process.env.NODE_RED_BASE_URL || '').replace(/\/+$/, '');
const PRODUCTION_FLOW_ID = 'tab_prod_soldadura_24h';
const TEST_FLOW_ID = '94735d01267fe806';
const EXPECTED_PRODUCTION_SHA256 = 'a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac';
const PROMOTED_PRODUCTION_SHA256 = 'a5f4eb404466f39bf79aaa9b74fb0c80c5516758d449f979cd509217221f1a35';
const CELDA_7_ENDPOINT_FIX_SHA256 = '138ad92613faf515c09276663272512700379b3390a0993eb8a25c225aafd95f';
const PRODUCTION_CONTEXT_PREFIX = 'prod_horaria_v4|';

async function readJson(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`GET ${url} fallo con HTTP ${response.status}: ${text}`);
  }

  const parsed = JSON.parse(text);
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function localTimestamp() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).format(new Date()).replace(', ', 'T').replace(/:/g, '-');
}

function midnightIndex(functionCode, sourceName) {
  const match = functionCode.match(/const indicesOperativos\s*=\s*\[([^\]]+)]\s*;/);

  if (!match) {
    throw new Error(`${sourceName}: no se encontro indicesOperativos.`);
  }

  const indices = match[1].split(',').map((value) => Number(value.trim()));
  const midnightIndices = [0, 24].filter((value) => indices.includes(value));

  if (midnightIndices.length !== 1) {
    throw new Error(`${sourceName}: se esperaba un unico indice de medianoche.`);
  }

  return midnightIndices[0];
}

function promoteFunction(testCode, sourceName) {
  const result = testCode
    .replace(/\bproduccion_horaria_test\b/g, 'produccion_horaria')
    .replace(/\bdashboard_equipos_live_test\b/g, 'dashboard_equipos_live')
    .replaceAll('prod_horaria_test_v2|', PRODUCTION_CONTEXT_PREFIX)
    .replaceAll('Produccion TEST preparada correctamente.', 'Produccion soldadura preparada correctamente.');

  const requiredPatterns = [
    /INSERT INTO produccion_horaria\s/i,
    /INSERT INTO dashboard_equipos_live\s/i,
    /inicioBloqueMs > Date\.now\(\)/,
    /CONVERT_TZ\(UTC_TIMESTAMP\(\), '\+00:00', '-03:00'\)/,
    /INTERVAL 10 MINUTE/
  ];
  const forbiddenPatterns = [
    /\bproduccion_horaria_test\b/,
    /\bdashboard_equipos_live_test\b/,
    /WHEN VALUES\(cantidad\) = 0 AND cantidad > 0 THEN cantidad/i
  ];

  if (requiredPatterns.some((pattern) => !pattern.test(result))) {
    throw new Error(`${sourceName}: faltan reglas productivas validadas.`);
  }

  if (forbiddenPatterns.some((pattern) => pattern.test(result))) {
    throw new Error(`${sourceName}: la promocion conserva referencias o reglas Test invalidas.`);
  }

  const index = midnightIndex(result, sourceName);

  if (/\bCELDA_7\b/.test(sourceName) && index !== 0) {
    throw new Error(`${sourceName}: CELDA_7 debe usar HORA[0] para 00-01.`);
  }

  new Function('msg', 'context', 'node', result);
  return { functionCode: result, midnightIndex: index };
}

function buildProductionFlow(productionFlow, testFlow) {
  const productionTransforms = productionFlow.nodes.filter(
    (node) => node.type === 'function' && /INSERT INTO produccion_horaria\s/i.test(String(node.func || ''))
  );
  const testTransforms = new Map(
    testFlow.nodes
      .filter((node) => node.type === 'function' && /INSERT INTO produccion_horaria_test\s/i.test(String(node.func || '')))
      .map((node) => [node.name, node])
  );

  if (productionTransforms.length !== 15 || testTransforms.size !== 15) {
    throw new Error(
      `Se esperaban 15 ramas en cada flujo y se encontraron Produccion=${productionTransforms.length}, Test=${testTransforms.size}.`
    );
  }

  const replacements = new Map();
  const branches = [];

  for (const productionNode of productionTransforms) {
    const testNode = testTransforms.get(`TEST - ${productionNode.name}`);

    if (!testNode) {
      throw new Error(`No se encontro la funcion Test correspondiente a ${productionNode.name}.`);
    }

    const promoted = promoteFunction(testNode.func, productionNode.name);
    replacements.set(productionNode.id, promoted.functionCode);
    branches.push({
      id: productionNode.id,
      name: productionNode.name,
      midnightIndex: promoted.midnightIndex,
      functionSha256: crypto.createHash('sha256').update(promoted.functionCode).digest('hex')
    });
  }

  const nodes = productionFlow.nodes.map((node) => {
    if (!replacements.has(node.id)) return node;
    return { ...node, func: replacements.get(node.id) };
  });
  const { configs: _configs, ...flowWithoutScopedConfigs } = productionFlow;

  return {
    flow: { ...flowWithoutScopedConfigs, nodes },
    branches
  };
}

function buildFullDeployment(allFlows, productionFlow, sourceCelda7Endpoint) {
  const celda7Endpoint = buildCelda7Endpoint(sourceCelda7Endpoint, {
    id: CELDA_7_SOURCE_ENDPOINT_ID,
    name: sourceCelda7Endpoint.name,
    cycletime: sourceCelda7Endpoint.cycletime
  });
  delete celda7Endpoint.z;

  const productionNodes = new Map(
    productionFlow.nodes.map((node) => [node.id, node])
  );
  let endpointInserted = false;
  const flows = [];

  for (const node of allFlows) {
    if (node.id === TEST_CELDA_7_ENDPOINT_ID) continue;

    if (node.id === CELDA_7_SOURCE_ENDPOINT_ID) {
      if (!endpointInserted) {
        flows.push(celda7Endpoint);
        endpointInserted = true;
      }
      continue;
    }

    if (productionNodes.has(node.id)) {
      flows.push(productionNodes.get(node.id));
      continue;
    }

    if (node.id === 'test_input_7cd9238c55bcdef3') {
      flows.push({ ...node, endpoint: CELDA_7_SOURCE_ENDPOINT_ID });
      continue;
    }

    flows.push(node);
  }

  if (!endpointInserted) flows.push(celda7Endpoint);

  return { flows, celda7Endpoint };
}

async function putFlow(flow) {
  const response = await fetch(`${NODE_RED_BASE_URL}/flow/${PRODUCTION_FLOW_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-Deployment-Type': 'flows'
    },
    body: JSON.stringify(flow)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`PUT /flow/${PRODUCTION_FLOW_ID} fallo con HTTP ${response.status}: ${text}`);
  }

  return { status: response.status, response: text || null };
}

async function putAllFlows(flows) {
  const response = await fetch(`${NODE_RED_BASE_URL}/flows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Node-RED-Deployment-Type': 'flows'
    },
    body: JSON.stringify(flows)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`POST /flows fallo con HTTP ${response.status}: ${text}`);
  }

  return { status: response.status, response: text || null };
}

async function rollback(backupPath) {
  if (!process.argv.includes('--confirm-production')) {
    throw new Error('El rollback requiere --confirm-production.');
  }

  const backup = JSON.parse(fs.readFileSync(path.resolve(backupPath), 'utf8'));

  if (Array.isArray(backup)) {
    const response = await putAllFlows(backup);
    console.log(JSON.stringify({
      mode: 'rollback',
      backup: path.resolve(backupPath),
      restoredFullFlowsSha256: sha256(backup),
      ...response
    }, null, 2));
    return;
  }

  if (backup.id !== PRODUCTION_FLOW_ID) {
    throw new Error(`El respaldo no corresponde al flujo ${PRODUCTION_FLOW_ID}.`);
  }

  const response = await putFlow(backup);
  const restored = await readJson(`${NODE_RED_BASE_URL}/flow/${PRODUCTION_FLOW_ID}`);

  console.log(JSON.stringify({
    mode: 'rollback',
    backup: path.resolve(backupPath),
    restoredSha256: sha256(restored),
    ...response
  }, null, 2));
}

async function main() {
  if (!NODE_RED_BASE_URL) {
    throw new Error('NODE_RED_BASE_URL es obligatoria.');
  }

  const rollbackIndex = process.argv.indexOf('--rollback');

  if (rollbackIndex >= 0) {
    const backupPath = process.argv[rollbackIndex + 1];
    if (!backupPath) throw new Error('Falta la ruta despues de --rollback.');
    await rollback(backupPath);
    return;
  }

  const shouldDeploy = process.argv.includes('--deploy');
  const confirmed = process.argv.includes('--confirm-production');
  const productionFlow = await readJson(`${NODE_RED_BASE_URL}/flow/${PRODUCTION_FLOW_ID}`);
  const testFlow = await readJson(`${NODE_RED_BASE_URL}/flow/${TEST_FLOW_ID}`);
  const allFlows = await readJson(`${NODE_RED_BASE_URL}/flows`);
  const celda7Endpoints = allFlows.filter(
    (node) => node.id === CELDA_7_SOURCE_ENDPOINT_ID
  );
  const sourceCelda7Endpoint = celda7Endpoints.find((node) => !node.z) || celda7Endpoints[0];

  if (!sourceCelda7Endpoint) {
    throw new Error(`No se encontro el endpoint CELDA_7 ${CELDA_7_SOURCE_ENDPOINT_ID}.`);
  }

  const currentSha256 = sha256(productionFlow);

  if (![EXPECTED_PRODUCTION_SHA256, PROMOTED_PRODUCTION_SHA256, CELDA_7_ENDPOINT_FIX_SHA256].includes(currentSha256)) {
    throw new Error(
      `La huella productiva no es conocida. Anterior=${EXPECTED_PRODUCTION_SHA256}, promovida=${PROMOTED_PRODUCTION_SHA256}, actual=${currentSha256}.`
    );
  }

  const { flow, branches } = buildProductionFlow(productionFlow, testFlow);
  const { flows: targetFlows, celda7Endpoint } = buildFullDeployment(
    allFlows,
    flow,
    sourceCelda7Endpoint
  );
  const celda7EndpointValidation = assertCelda7Endpoint(
    celda7Endpoint,
    'endpoint productivo CELDA_7 propuesto'
  );
  const targetSha256 = sha256(flow);
  const testCelda7Input = allFlows.find(
    (node) => node.id === 'test_input_7cd9238c55bcdef3'
  );
  const endpointNeedsUpdate = celda7Endpoints.length !== 1 || (() => {
    try {
      assertCelda7Endpoint(celda7Endpoints[0]);
      return false;
    } catch (_) {
      return true;
    }
  })();
  const testEndpointNeedsCleanup = allFlows.some(
    (node) => node.id === TEST_CELDA_7_ENDPOINT_ID
  ) || !testCelda7Input || testCelda7Input.endpoint !== CELDA_7_SOURCE_ENDPOINT_ID;
  const operation = currentSha256 === targetSha256 &&
    !endpointNeedsUpdate &&
    !testEndpointNeedsCleanup
    ? 'no-op'
    : 'update';
  const summary = {
    mode: shouldDeploy ? 'deploy' : 'dry-run',
    operation,
    productionFlow: PRODUCTION_FLOW_ID,
    sourceTestFlow: TEST_FLOW_ID,
    currentSha256,
    targetSha256,
    branchCount: branches.length,
    productionContextPrefix: PRODUCTION_CONTEXT_PREFIX,
    celda7Endpoint: {
      id: CELDA_7_SOURCE_ENDPOINT_ID,
      duplicateEndpointsRemoved: Math.max(celda7Endpoints.length - 1, 0),
      testEndpointRemoved: testEndpointNeedsCleanup,
      ...celda7EndpointValidation
    },
    branches
  };

  if (!shouldDeploy) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (operation === 'no-op') {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!confirmed) {
    throw new Error('El despliegue requiere --deploy --confirm-production.');
  }

  const backupPath = path.resolve(
    'backups',
    'node-red',
    `${localTimestamp()}-production-flow-before-celda7-endpoint-fix.json`
  );
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, `${JSON.stringify(allFlows, null, 2)}\n`);

  const response = await putAllFlows(targetFlows);
  const deployed = await readJson(`${NODE_RED_BASE_URL}/flow/${PRODUCTION_FLOW_ID}`);
  const deployedSha256 = sha256(deployed);
  const deployedAllFlows = await readJson(`${NODE_RED_BASE_URL}/flows`);
  const deployedEndpoints = deployedAllFlows.filter(
    (node) => node.id === CELDA_7_SOURCE_ENDPOINT_ID
  );
  const deployedTestInput = deployedAllFlows.find(
    (node) => node.id === 'test_input_7cd9238c55bcdef3'
  );

  try {
    if (deployedSha256 !== targetSha256) {
      throw new Error(`huella esperada=${targetSha256}, actual=${deployedSha256}`);
    }
    if (deployedEndpoints.length !== 1) {
      throw new Error(`se encontraron ${deployedEndpoints.length} endpoints CELDA_7`);
    }
    assertCelda7Endpoint(deployedEndpoints[0], 'endpoint productivo desplegado CELDA_7');
    if (!deployedTestInput || deployedTestInput.endpoint !== CELDA_7_SOURCE_ENDPOINT_ID) {
      throw new Error('Test no quedo compartiendo el endpoint productivo corregido');
    }
    if (deployedAllFlows.some((node) => node.id === TEST_CELDA_7_ENDPOINT_ID)) {
      throw new Error('el endpoint aislado Test no fue retirado');
    }
  } catch (error) {
    await putAllFlows(allFlows);
    throw new Error(
      `La verificacion post-deploy fallo y se ejecuto rollback: ${error.message}.`
    );
  }

  console.log(JSON.stringify({
    ...summary,
    backupPath,
    backupSha256: crypto.createHash('sha256').update(fs.readFileSync(backupPath)).digest('hex'),
    deployedSha256,
    ...response
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  buildFullDeployment,
  buildProductionFlow,
  promoteFunction
};
