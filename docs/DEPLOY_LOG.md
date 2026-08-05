# DEPLOY_LOG - FP_Soldadura

## 2026-08-04

- Cambio preparado en modo Test:
  - Se agrega `fecha_modificada` a `produccion_hora` para separar fecha origen LKN de fecha operativa de dashboard.
  - El importador LKN corrige el cruce de Turno 3: `00-06` se consulta en el dia anterior mediante `fecha_modificada`.
  - `GET /api/dashboard` y `GET /api/turno` leen por `fecha_modificada`.
  - El scheduler LKN usa fecha operativa actual; entre `00:00` y `05:59` sincroniza el dia anterior.
- Validacion ejecutada sobre `ferrosider_produccion_soldadura_test`:
  - `npm --prefix backend run db:init` OK.
  - `POST/importacion LKN` equivalente para `2026-07-28`: 2736 filas origen leidas, 1392 filas importadas, 59 maquinas importadas.
  - `POST/importacion LKN` equivalente para `2026-07-29`: 2640 filas origen leidas, 1320 filas importadas, 55 maquinas importadas.
  - Consulta SQL validada: para `fecha_modificada=2026-07-28`, las horas `00-06` del Turno 3 quedaron con `fecha_origen=2026-07-29`.
  - Dashboard `2026-07-28` devuelve Turno 3 completo incluyendo `22-00` de `2026-07-28` y `00-06` de `2026-07-29`.
- Pendiente antes de produccion:
  - Confirmar despliegue en modo Produccion.
  - Ejecutar `npm --prefix backend run db:init` contra `ferrosider_produccion_soldadura`.
  - Reimportar al menos los dias impactados desde LKN con `replaceDate=true`.
  - Verificar `GET /api/live-sync/status` con `source=lkn` y sin errores.
- Configuracion esperada de produccion:
  - `SYNC_SOURCE=lkn`
  - `LKN_DB_NAME=lkn_soft`
  - `LKN_AUTO_SYNC_ENABLED=true`
  - `LKN_SYNC_SECONDS=15`
  - `LIVE_CSV_AUTO_SYNC_ENABLED=false`
  - `LIVE_CSV_PATH` comentado o ausente, salvo contraste manual.
- Archivos tocados:
  - `.env.example`
  - `backend/database/init.sql`
  - `backend/src/database/initDb.js`
  - `backend/src/server.js`
  - `backend/src/services/csvImporter.js`
  - `backend/src/services/lknAutoSync.js`
  - `backend/src/services/lknImporter.js`
  - `backend/src/services/productionService.js`
  - `backend/src/utils/dates.js`
  - `docs/CHANGELOG.md`
  - `docs/CONTEXTO_PROYECTO.md`
  - `docs/DEPLOY_LOG.md`
  - `docs/FP_Soldadura_Flujo_operativo_datos.puml`

## 2026-07-27

- Cambio listo para produccion:
  - Se vuelve la fuente viva a CSV por diferencias detectadas contra la intranet vieja al usar `lkn_soft.produccion_horaria`.
  - El backend queda con default seguro `SYNC_SOURCE=csv` si la variable no existe.
  - `POST /api/live-sync` y `POST /api/import` para el dia actual usan la fuente configurada; con la configuracion recomendada quedan consumiendo CSV vivo.
  - LKN queda dado de baja como fuente viva: `LKN_AUTO_SYNC_ENABLED=false`.
- Estado actual:
  - Esta preparacion queda superada por la correccion de `fecha_modificada` del 2026-08-04; la fuente viva vuelve a ser LKN.
- Configuracion esperada de produccion:
  - `SYNC_SOURCE=csv`
  - `LIVE_CSV_PATH=\\192.168.3.223\Mantenimiento\CSV\produccion_sold_bk_1.csv`
  - `LIVE_CSV_AUTO_SYNC_ENABLED=true`
  - `LIVE_REFRESH_SECONDS=10`
  - `LKN_AUTO_SYNC_ENABLED=false`
- Validacion:
  - Validacion local en Test contra `ferrosider_produccion_soldadura_test` usando CSV vivo.
  - El CSV vivo coincide con la captura de la intranet vieja en los bloques que diferian con LKN.
  - Las diferencias restantes observadas correspondian a la hora viva `14-15`, que siguio avanzando luego de tomada la captura.
- Archivos tocados:
  - `.env.example`
  - `README.md`
  - `backend/src/server.js`
  - `backend/src/services/liveCsvSync.js`
  - `docs/CHANGELOG.md`
  - `docs/CONTEXTO_PROYECTO.md`
  - `docs/DEPLOY_LOG.md`

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
