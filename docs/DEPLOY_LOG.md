# DEPLOY_LOG - FP_Soldadura

## 2026-07-02

- Cambio aplicado:
  - Se deja listo el modo de sincronizacion automatica del Dashboard contra el CSV vivo `LIVE_CSV_PATH`.
- Impacto:
  - El Dashboard principal puede reflejar la produccion del dia actual sin presionar manualmente `Importar CSV`.
  - La sincronizacion evita concurrencia y limita la frecuencia mediante `LIVE_REFRESH_SECONDS`.
- Validacion:
  - `node --check` OK en `csvImporter.js`, `liveCsvSync.js` y `server.js`.
  - `npm run build` OK en frontend.
  - `POST /api/live-sync` OK contra `\\192.168.3.223\Mantenimiento\CSV\produccion_sold_bk_1.csv`: 89 filas leidas, 62 filas importadas, 1488 celdas horarias actualizadas para 2026-07-02.
  - Segunda llamada inmediata OK con `skipped: true` y razon `recent-sync`.
- Archivos tocados:
  - backend/src/services/csvImporter.js
  - backend/src/services/liveCsvSync.js
  - backend/src/server.js
  - frontend/src/main.jsx
  - README.md
  - docs/CONTEXTO_PROYECTO.md
  - docs/CHANGELOG.md
  - docs/DEPLOY_LOG.md

## 2026-06-25

- Se establece la bitacora de despliegues del proyecto.
- A partir de esta fecha, cualquier cambio funcional que pase a uso operativo deberia registrarse aca con:
  - fecha,
  - descripcion breve del cambio,
  - impacto funcional,
  - archivos tocados,
  - validacion realizada.

## Plantilla sugerida

```md
## YYYY-MM-DD

- Cambio aplicado:
- Impacto:
- Validacion:
- Archivos tocados:
  - ruta/archivo_1
  - ruta/archivo_2
```

## Criterio de uso

- Este archivo no reemplaza al `docs/CHANGELOG.md`.
- `docs/CHANGELOG.md` cuenta que cambio.
- `docs/DEPLOY_LOG.md` cuenta que se aplico, cuando y con que validacion.
