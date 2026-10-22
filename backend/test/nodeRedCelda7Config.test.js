const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CELDA_7_SOURCE_ENDPOINT_ID,
  CELDA_7_TAG_BASES,
  TEST_CELDA_7_ENDPOINT_ID,
  assertCelda7Endpoint,
  buildCelda7Endpoint,
  expectedHourZeroTags
} = require('../../scripts/node-red-celda7-config');
const {
  buildFullDeployment
} = require('../../scripts/deploy-node-red-all-machines-production');

function sourceEndpoint() {
  const variables = {};

  for (const tagBase of CELDA_7_TAG_BASES) {
    variables[`${tagBase}[24]`] = { type: 'INT' };
  }

  return {
    id: 'source',
    type: 'eth-ip endpoint',
    name: 'CELDA 7',
    address: '172.16.110.1',
    cycletime: '500',
    vartable: { OEE_SPOT: variables }
  };
}

test('detecta los cinco HORA[0] ausentes en el endpoint original', () => {
  assert.throws(
    () => assertCelda7Endpoint(sourceEndpoint()),
    /faltan tags requeridos.*HORA\[0\]/
  );
});

test('clona el endpoint y agrega HORA[0] sin modificar el original', () => {
  const source = sourceEndpoint();
  const result = buildCelda7Endpoint(source, {
    id: 'test-endpoint',
    z: 'test-flow',
    cycletime: '1000'
  });

  assert.equal(result.id, 'test-endpoint');
  assert.equal(result.z, 'test-flow');
  assert.equal(result.cycletime, '1000');
  assert.deepEqual(assertCelda7Endpoint(result), {
    hourZeroTags: 5,
    hourTwentyFourTags: 5
  });

  for (const tag of expectedHourZeroTags()) {
    assert.deepEqual(result.vartable.OEE_SPOT[tag], { type: 'INT' });
    assert.equal(source.vartable.OEE_SPOT[tag], undefined);
  }
});

test('normaliza el endpoint global y conecta Test al mismo origen que Produccion', () => {
  const source = { ...sourceEndpoint(), id: CELDA_7_SOURCE_ENDPOINT_ID };
  const productionNode = { id: 'production-node', type: 'function', name: 'production' };
  const allFlows = [
    source,
    { ...source, z: 'tab_prod_soldadura_24h' },
    { ...source, id: TEST_CELDA_7_ENDPOINT_ID, z: 'test-flow' },
    { id: 'test_input_7cd9238c55bcdef3', endpoint: TEST_CELDA_7_ENDPOINT_ID },
    { ...productionNode, name: 'old-production' }
  ];

  const result = buildFullDeployment(
    allFlows,
    { nodes: [productionNode] },
    source
  );
  const endpoints = result.flows.filter(
    (node) => node.id === CELDA_7_SOURCE_ENDPOINT_ID
  );
  const testInput = result.flows.find(
    (node) => node.id === 'test_input_7cd9238c55bcdef3'
  );

  assert.equal(endpoints.length, 1);
  assert.equal(endpoints[0].z, undefined);
  assert.deepEqual(assertCelda7Endpoint(endpoints[0]), {
    hourZeroTags: 5,
    hourTwentyFourTags: 5
  });
  assert.equal(
    result.flows.some((node) => node.id === TEST_CELDA_7_ENDPOINT_ID),
    false
  );
  assert.equal(testInput.endpoint, CELDA_7_SOURCE_ENDPOINT_ID);
  assert.deepEqual(
    result.flows.find((node) => node.id === productionNode.id),
    productionNode
  );
});
