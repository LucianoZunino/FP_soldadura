# DEPLOY_LOG - FP_Soldadura

## 2026-07-16

- Operacion aplicada sobre DB:
  - Se genero backup local de `produccion_hora` en `backups/produccion_hora_before_clean_2026-07-16T12-29-37-241Z.json`.
  - Se eliminaron 10560 filas de `produccion_hora`.
  - Se recargo el dia actual `2026-07-16` desde `LIVE_CSV_PATH` usando el importador corregido.
  - Resultado inicial: 620 filas solo de `2026-07-16`, sin historicos y sin horas futuras.
  - Al consultar produccion, el backend/proceso viejo volvio a reinyectar horas futuras (`10-11`, `11-12`, `12-13`), por lo que la limpieza no queda persistente hasta desplegar el backend corregido o detener el sync viejo.

- Operacion aplicada sobre DB productiva despues de actualizar produccion:
  - Se genero backup local de `ferrosider_produccion_soldadura.produccion_hora` en `backups/PROD_produccion_hora_before_clean_2026-07-16T13-43-24-158Z.json`.
  - Se eliminaron 1226 filas de `ferrosider_produccion_soldadura.produccion_hora`.
  - Se recargo produccion llamando a `POST http://192.168.4.250/soldadura/api/live-sync`.
  - Resultado: 451 filas solo de `2026-07-16`, sin historicos y sin horas futuras; dashboard productivo devuelve `total=2704`, `totalProductosFinales=1530`.
  - Observacion critica: produccion esta leyendo `LIVE_CSV_PATH=/var/www/html/csv/csv/produccion_sold_bk_1.csv`, con `sourceMtime=2024-09-03T15:54:21.081Z`, no el share vivo `\\192.168.3.223\Mantenimiento\CSV\produccion_sold_bk_1.csv`.

- Operacion aplicada sobre DB de test:
  - Se agrego `POST /api/import-lkn` para importar desde `lkn_soft.produccion_horaria`.
  - Se cargo `ferrosider_produccion_soldadura_test.produccion_hora` para `2026-07-16` desde LKN con `replaceDate=true`.
  - Resultado validado por endpoint: 1488 filas origen, 62 maquinas mapeadas, 806 filas importadas y 682 franjas futuras omitidas.
  - Dashboard local/test devuelve aproximadamente `total=8651` y `totalProductosFinales=2595`; puede variar porque `lkn_soft.produccion_horaria` sigue actualizandose en vivo.

- Cambio listo para produccion:
  - `POST /api/live-sync` y `POST /api/import` para el dia actual usan LKN en lugar del CSV vivo.
  - El scheduler backend LKN queda controlado por `LKN_AUTO_SYNC_ENABLED=true` y `LKN_SYNC_SECONDS=15`.
  - `CSV_PATH` queda como importacion historica/manual, no como fuente viva del dashboard.
  - Requiere ejecutar migracion/DDL de `maquina_pieza_mapeo` e inicializar mapeos con `POST /api/lkn-mappings/seed` antes o inmediatamente despues del despliegue.

- Cambio listo para aplicar:
  - Se bloquea la visualizacion, suma e importacion viva de franjas horarias futuras para el dia actual.
  - El backend usa por defecto la zona horaria operativa `America/Argentina/Buenos_Aires`.
  - La sincronizacion viva conserva el mayor valor observado por celda/pieza/hora para evitar saltos hacia abajo por snapshots alternados del CSV.
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
