const CELDA_7_SOURCE_ENDPOINT_ID = 'd106bad673723722';
const TEST_CELDA_7_ENDPOINT_ID = 'test_all_celda7_endpoint_v3';
const CELDA_7_PROGRAM = 'OEE_SPOT';

const CELDA_7_TAG_BASES = [
  'PIEZAS_HORA.M3.D1.HORA',
  'PIEZAS_HORA.M4.D1.HORA',
  'PIEZAS_HORA.M4.D2.HORA',
  'PIEZAS_HORA.M4.D4.HORA',
  'PIEZAS_HORA.M4.D8.HORA'
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectedHourZeroTags() {
  return CELDA_7_TAG_BASES.map((tagBase) => `${tagBase}[0]`);
}

function expectedHourTwentyFourTags() {
  return CELDA_7_TAG_BASES.map((tagBase) => `${tagBase}[24]`);
}

function programVariables(endpoint) {
  return endpoint && endpoint.vartable && endpoint.vartable[CELDA_7_PROGRAM];
}

function missingTags(endpoint, tags) {
  const variables = programVariables(endpoint) || {};
  return tags.filter((tag) => !Object.prototype.hasOwnProperty.call(variables, tag));
}

function assertCelda7Endpoint(endpoint, sourceName = 'endpoint CELDA_7') {
  if (!endpoint || endpoint.type !== 'eth-ip endpoint') {
    throw new Error(`${sourceName}: no es un endpoint Ethernet/IP valido.`);
  }

  const missingHourZero = missingTags(endpoint, expectedHourZeroTags());
  const missingHourTwentyFour = missingTags(endpoint, expectedHourTwentyFourTags());

  if (missingHourZero.length || missingHourTwentyFour.length) {
    throw new Error(
      `${sourceName}: faltan tags requeridos. ` +
      `HORA[0]=${missingHourZero.join(',') || 'ok'}; ` +
      `HORA[24]=${missingHourTwentyFour.join(',') || 'ok'}.`
    );
  }

  return {
    hourZeroTags: expectedHourZeroTags().length,
    hourTwentyFourTags: expectedHourTwentyFourTags().length
  };
}

function buildCelda7Endpoint(sourceEndpoint, options = {}) {
  if (!sourceEndpoint || sourceEndpoint.type !== 'eth-ip endpoint') {
    throw new Error('No se encontro el endpoint fuente de CELDA_7.');
  }

  const endpoint = clone(sourceEndpoint);
  const vartable = endpoint.vartable || {};
  const variables = { ...(vartable[CELDA_7_PROGRAM] || {}) };

  for (const tag of expectedHourZeroTags()) {
    variables[tag] = variables[tag] || { type: 'INT' };
  }

  endpoint.id = options.id || sourceEndpoint.id;
  endpoint.z = options.z;
  endpoint.name = options.name || sourceEndpoint.name;
  endpoint.cycletime = String(options.cycletime || sourceEndpoint.cycletime || '500');
  endpoint.vartable = {
    ...vartable,
    [CELDA_7_PROGRAM]: variables
  };

  assertCelda7Endpoint(endpoint, endpoint.name);
  return endpoint;
}

module.exports = {
  CELDA_7_SOURCE_ENDPOINT_ID,
  TEST_CELDA_7_ENDPOINT_ID,
  CELDA_7_TAG_BASES,
  assertCelda7Endpoint,
  buildCelda7Endpoint,
  expectedHourTwentyFourTags,
  expectedHourZeroTags,
  missingTags
};
