const express = require('express');
const cors = require('cors');
const { getEnv } = require('./config/env');
const { importCsv } = require('./services/csvImporter');
const { importArticleRelations } = require('./services/articleRelationImporter');
const {
  getLknMachineMappings,
  importLknProduction,
  seedLknMachineMappings,
  upsertLknMachineMapping
} = require('./services/lknImporter');
const { getLknAutoSyncStatus, runLknAutoSync, startLknAutoSync } = require('./services/lknAutoSync');
const { getCatalogs, getDashboard, getShift } = require('./services/productionService');
const { normalizeDate, todayIsoDate } = require('./utils/dates');

const app = express();
const port = Number(getEnv('PORT', 3001));

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, date: todayIsoDate() });
});

app.post('/api/import', async (req, res, next) => {
  try {
    const requestedDate = normalizeDate(req.body?.fecha || req.query.fecha);
    const csvPath = req.body?.csvPath;

    if (!csvPath && requestedDate === todayIsoDate()) {
      res.json(await runLknAutoSync({ fecha: requestedDate }));
      return;
    }

    const result = await importCsv({
      fecha: requestedDate,
      csvPath
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/import-articulos', async (req, res, next) => {
  try {
    const result = await importArticleRelations({
      xlsxPath: req.body?.xlsxPath || req.query.xlsxPath
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/import-lkn', async (req, res, next) => {
  try {
    res.json(await importLknProduction({
      fecha: req.body?.fecha || req.query.fecha,
      replaceDate: req.body?.replaceDate !== false,
      skipFutureHours: req.body?.skipFutureHours !== false
    }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/lkn-mappings/seed', async (req, res, next) => {
  try {
    res.json(await seedLknMachineMappings({
      fecha: req.body?.fecha || req.query.fecha,
      fechaDesde: req.body?.fechaDesde || req.query.fechaDesde
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/lkn-mappings', async (req, res, next) => {
  try {
    res.json(await getLknMachineMappings({
      maquina: req.query.maquina
    }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/lkn-mappings', async (req, res, next) => {
  try {
    res.json(await upsertLknMachineMapping(req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.get('/api/lkn-sync/status', (req, res) => {
  res.json(getLknAutoSyncStatus());
});

app.post('/api/lkn-sync/run', async (req, res, next) => {
  try {
    res.json(await runLknAutoSync({
      fecha: req.body?.fecha || req.query.fecha,
      replaceDate: req.body?.replaceDate !== false,
      skipFutureHours: req.body?.skipFutureHours !== false
    }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/live-sync', async (req, res, next) => {
  try {
    res.json(await runLknAutoSync({
      fecha: req.body?.fecha || req.query.fecha,
      replaceDate: req.body?.replaceDate !== false,
      skipFutureHours: req.body?.skipFutureHours !== false
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    res.json(await getDashboard(req.query.fecha));
  } catch (error) {
    next(error);
  }
});

app.get('/api/turno', async (req, res, next) => {
  try {
    res.json(await getShift(req.query.fecha, req.query.turno));
  } catch (error) {
    next(error);
  }
});

app.get('/api/catalogos', async (req, res, next) => {
  try {
    res.json(await getCatalogs());
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    error: error.message || 'Unexpected server error'
  });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  if (startLknAutoSync()) {
    console.log(`LKN auto-sync enabled every ${getLknAutoSyncStatus().intervalSeconds}s`);
  }
});
