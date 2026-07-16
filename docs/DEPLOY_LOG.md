# DEPLOY_LOG - FP_Soldadura

## 2026-07-16

- Operacion aplicada sobre DB:
  - Se genero backup local de `produccion_hora` en `backups/produccion_hora_before_clean_2026-07-16T12-29-37-241Z.json`.
  - Se eliminaron 10560 filas de `produccion_hora`.
  - Se recargo el dia actual `2026-07-16` desde `LIVE_CSV_PATH` usando el importador corregido.
  - Resultado inicial: 620 filas solo de `2026-07-16`, sin historicos y sin horas futuras.
  - Al consultar produccion, el backend/proceso viejo volvio a reinyectar horas futuras (`10-11`, `11-12`, `12-13`), por lo que la limpieza no queda persistente hasta desplegar el backend corregido o detener el sync viejo.

- Cambio listo para aplicar:
  - Se bloquea la visualizacion, suma e importacion viva de franjas horarias futuras para el dia actual.
  - El backend usa por defecto la zona horaria operativa `America/Argentina/Buenos_Aires`.
- Impacto:
  - Produccion no deberia mostrar datos de mediodia o tarde si la hora operativa actual todavia es anterior.
  - `POST /api/live-sync` limpia valores futuros existentes en `produccion_hora` para el dia actual.
- Validacion:
  - `node --check` OK en `dates.js`, `productionService.js`, `csvImporter.js` y `liveCsvSync.js`.
  - `npm --prefix frontend run build` OK.
  - Consulta local contra DB real para `2026-07-16`: `CELDA_1 / DASH OP10` conserva `08-09=18`, `09-10=12` y oculta `10-11`, `11-12`, `12-13`, `13-14`, `14-15` como `0` a las 09:16 Argentina.
- Archivos tocados:
  - backend/src/utils/dates.js
  - backend/src/services/productionService.js
  - backend/src/services/csvImporter.js
  - backend/src/services/liveCsvSync.js
  - docs/CHANGELOG.md
  - docs/CONTEXTO_PROYECTO.md
  - docs/DEPLOY_LOG.md

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
