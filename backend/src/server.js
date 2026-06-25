const express = require('express');
const cors = require('cors');
const { getEnv } = require('./config/env');
const { importCsv } = require('./services/csvImporter');
const { importArticleRelations } = require('./services/articleRelationImporter');
const { getCatalogs, getDashboard, getShift } = require('./services/productionService');
const { todayIsoDate } = require('./utils/dates');

const app = express();
const port = Number(getEnv('PORT', 3001));

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, date: todayIsoDate() });
});

app.post('/api/import', async (req, res, next) => {
  try {
    const result = await importCsv({
      fecha: req.body?.fecha || req.query.fecha,
      csvPath: req.body?.csvPath
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
});
