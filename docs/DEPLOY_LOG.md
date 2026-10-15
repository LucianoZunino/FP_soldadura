# DEPLOY_LOG - FP_Soldadura

## 2026-10-15 - Produccion

- Flujo Node-RED productivo actualizado: `tab_prod_soldadura_24h`, 112 nodos y 15 ramas de transformacion.
- SHA-256 anterior: `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- SHA-256 desplegado: `a5f4eb404466f39bf79aaa9b74fb0c80c5516758d449f979cd509217221f1a35`.
- Reglas promovidas:
  - descarte de buckets futuros;
  - cero correctivo durante el bloque y hasta 10 minutos despues;
  - proteccion de positivos cerrados ante ceros tardios;
  - `HORA[0]` para `00-01` solamente en CELDA_7.
- Respaldo previo: `backups/node-red/2026-10-15T11-15-05-production-flow-before-hourly-corrections.json`.
- SHA-256 del respaldo: `3a7a372374358625e934fbcab2c95d3d8c47495023c39cc2d1d41fd54caf6867`.
- Validacion posterior:
  - despliegue HTTP 200 y huella final esperada;
  - dry-run posterior idempotente con `operation=no-op`;
  - las 15 funciones contienen las reglas promovidas y escriben solo tablas productivas;
  - staging LKN con 1.488 filas y 62 maquinas para el dia operativo;
  - 310 bloques cerrados comparados sin diferencias contra CSV vivo;
  - `/api/live-sync/status` productivo informa `source=lkn`, scheduler iniciado y sin `lastError`.
- La proteccion backend ante fuente LKN vacia esta validada en codigo pero requiere pull/reinicio del servidor web; no se declara desplegada con el cambio de Node-RED.
- Pendiente: validar el primer `00-01` productivo de CELDA_7 y decidir backfill de los dias sin staging solo si existe fuente confiable.

## 2026-10-15 - Validacion Test

- Resumen general validado contra `ferrosider_produccion_soldadura_test` para `2026-10-15`:
  - 62 combinaciones celda/pieza visibles y exportadas;
  - endpoint HTTP 200 con MIME XLSX y nombre de archivo por fecha;
  - encabezados exactos `PIEZA_NUMERO`, `DESCRIPCION`, `PROD_T1`, `PROD_T2`, `PROD_T3`, `produccion_actual`;
  - workbook reabierto correctamente y valores numericos coincidentes con el Dashboard;
  - 11 pruebas backend y build frontend aprobados.
- Validacion de lectura contra la DB productiva para la misma fecha: 62 combinaciones exportables, mismos encabezados y workbook XLSX valido; no se escribieron datos productivos.
- Este cambio de backend/frontend queda versionado para ambos entornos; requiere pull, build y reinicio del servidor web para estar activo en Produccion.
- Modo: Test. No se modifico la pestana productiva ni sus tablas.
- Flujo Test actualizado: `94735d01267fe806`, 15 ramas y 52 nodos.
  - CELDA_7 usa `HORA[0]` para `00-01`.
  - Las otras ramas conservan el indice de medianoche de su fuente productiva.
  - Las 15 funciones mantienen la ventana de 10 minutos para ceros, el filtro de horas futuras y destinos exclusivamente Test.
- Respaldo previo: `backups/node-red/2026-10-15T10-41-16-test-flow-before-celda7-index0.json`.
  - SHA-256: `5E7D454D190E4C33F999714FDDABBC7A6398ADB10FC3DE6F24A56BF78F3AF546`.
- La pestaña productiva conserva 112 nodos y el SHA-256 `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- Validacion posterior:
  - Los 15 PLC quedaron `online`, incluidos Tucker y MIG_1.
  - Test siguio escribiendo 62 maquinas en `lkn_soft.produccion_horaria_test`.
  - Los 248 bloques cerrados del dia coincidieron exactamente entre CSV vivo, Produccion y Test. Las diferencias restantes estaban en el bloque activo `10-11`.
  - Las 15 funciones Test no contienen inserciones a `produccion_horaria` ni `dashboard_equipos_live` productivas.
- Backend preparado para omitir el reemplazo si LKN devuelve cero filas. Las 9 pruebas automaticas pasan; el cambio no fue desplegado en Produccion.
  - Sincronizacion integrada sobre `ferrosider_produccion_soldadura_test`: 1.488 filas fuente, 310 bloques iniciados importados, 62 maquinas y 1.178 bloques futuros omitidos.
  - Prueba de fuente vacia con `2099-01-01`: `skipped=true`, `reason=empty-source` y `preservedExistingData=true`.
- Pendiente antes de Produccion:
  - Contrastar el proximo bloque real `00-01` de CELDA_7 entre Test, diagnostico `[0]/[24]` y CSV cerrado.
  - Promover por separado la correccion del flujo y la proteccion del importador solo con autorizacion de modo Produccion.

## 2026-10-01

- Instrumentacion aplicada solo en Test; Produccion conserva el SHA-256 `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- Flujo temporal CELDA_7: `113a3702b93d7672`, etiqueta `TEST - DIAGNOSTICO CELDA7 HORA 0 VS 24`.
  - Usa una conexion separada al PLC de CELDA_7 con solo diez tags; la direccion queda reservada al entorno.
  - Compara `[0]` y `[24]` y escribe unicamente en `lkn_soft.celda7_indice_diagnostico_test`.
  - Debe permanecer activo hasta capturar el bloque `00-01`; se retira con `node scripts\\diagnose-node-red-celda7-hour-index-test.js --remove`.
- Flujo general Test `94735d01267fe806` actualizado a 52 nodos:
  - Monitorea estados reales de las 15 entradas `eth-ip`.
  - Persiste solo transiciones de estado en `lkn_soft.plc_estado_diagnostico_test`.
  - Tras limpiar eventos iniciales repetidos quedaron 13 ramas online; Tucker y MIG_1 no reportaron estado.
- Respaldo previo: `backups/node-red/2026-10-01T08-57-39-test-flow-before-plc-status-monitor.json`, SHA-256 `A06FE754744C171CAE5D8960EA22991A1C3E5A842B7943120A85DC2BFD14D06B`.

## 2026-09-30

- Flujo Node-RED TEST actualizado: `94735d01267fe806`, etiqueta `TEST - SOLDADURA CORRECCION HORARIA`.
- Alcance: 15 ramas, 62 maquinas, tablas `produccion_horaria_test` y `dashboard_equipos_live_test`; Produccion no fue modificada.
- Regla desplegada: un cero puede reemplazar un positivo durante el bloque activo y durante una tolerancia de 10 minutos. Luego de esa ventana, un cero se considera reinicio tardio y no borra el historico.
- Respaldo previo: `backups/node-red/2026-09-30T11-06-02-test-all-machines-before-zero-window.json`, SHA-256 `6D0820B2454C6E8DA2B59129830BE67370A46CCFC6E0A0B44120153C2877B5C8`.
- Validacion:
  - Las 15 funciones contienen la proteccion temporal, el filtro de horarios futuros y cero referencias a tablas productivas.
  - Una transaccion reversible comprobo que un cero actual reemplaza `123` por `0` y que un cero tardio conserva `123`.
  - El flujo continuo escribiendo despues del despliegue, con 62 maquinas y una demora observada de un segundo.
  - La pestaña productiva conserva el SHA-256 `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- Pendiente antes de Produccion:
  - Validacion completada el 2026-10-01: 1.482 de 1.488 bloques coinciden funcionalmente con el CSV y no hubo positivos validos borrados por ceros tardios.
  - Revisar por que CELDA_7 entrega cero en `HORA[24]` mientras el CSV informa produccion en `00-01`.
  - Completar y marcar como `SIN_LECTURA` los bloques sin mensaje del PLC, observados en Tucker y MIG_1 durante el Turno 3.

## 2026-09-24

- Prueba aislada aplicada en Node-RED, sin modificar la pestaña productiva `LKN PRODUCCION SOLDADURA 24H`:
  - Flujo TEST: `94735d01267fe806`, etiqueta `TEST - SOLDADURA CORRECCION HORARIA`.
  - Tablas destino: `lkn_soft.produccion_horaria_test` y `lkn_soft.dashboard_equipos_live_test`.
  - Replica las 15 ramas productivas, acepta `0` como ultimo valor y omite bloques futuros.
  - Usa un nodo MySQL propio y una cola TEST independiente de 20 mensajes por segundo.
- Respaldo previo recuperable:
  - `backups/node-red/2026-09-24T15-23-11-037Z-flows.json`.
  - `backups/node-red/2026-09-24T15-23-11-037Z-soldadura-tab.json`.
  - `backups/node-red/2026-09-24T15-57-06-301Z-test-tucker-flow-before-all-machines.json`.
  - SHA-256 de la pestaña productiva: `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- Validacion:
  - La pestaña productiva mantiene exactamente el mismo SHA-256 despues del despliegue TEST.
  - Las 15 funciones TEST escriben unicamente en tablas TEST, aceptan `cantidad = VALUES(cantidad)` y aplican el filtro de bloques futuros.
  - Se cubrieron las 62 maquinas con 496 filas correspondientes a 8 bloques iniciados, sin filas futuras.
  - Se encontraron 19 bloques donde Test registro `0` y Produccion conservo un positivo anterior; una transaccion controlada tambien confirmo que un valor `123` puede corregirse a `0` y fue revertida.
- Pendiente antes de Produccion:
  - Observar el flujo TEST durante un turno completo y contrastarlo con el CSV de la intranet.
  - Promover la correccion de las 15 ramas solamente despues de aprobar esa comparacion.
  - Definir si la cola productiva se mantiene o se ajusta; no fue modificada en esta prueba.

## 2026-09-02

- Cambio preparado y validado en modo Test:
  - El importador LKN deja de corregir dos veces el cruce de Turno 3: copia `fecha_operativa` a `fecha_modificada` y consulta solo la fecha operativa solicitada.
  - El filtro de horas futuras contempla que `00-06` ocurre en el calendario siguiente dentro del mismo dia operativo.
  - El frontend abre y refresca el dia operativo anterior durante la madrugada.
  - Los positivos con `ultima_lectura < fecha_hora_desde` se persisten como cero para limpiar residuos sin ocultar la pieza.
- Migracion aplicada sobre `ferrosider_produccion_soldadura_test`:
  - Se reimportaron con `replaceDate=true` los dias `2026-08-26` a `2026-09-01`.
  - Se cargaron 10.344 filas de 59/62 maquinas segun disponibilidad de cada dia.
  - Se neutralizaron 1.062 positivos anticipados, equivalentes a 27.657 unidades residuales.
  - Para los siete dias, la cantidad de filas y el total persistido coinciden exactamente con LKN menos los positivos anticipados; no quedaron fechas origen distintas de `fecha_modificada`.
  - Para `2026-09-01`, cada bucket `00-06` contiene las 62 maquinas y el Dashboard devuelve total Turno 3 `3680`.
  - Para el dia actual `2026-09-02`, se importaron 682 filas iniciadas y se omitieron 806 filas futuras; no quedo ninguna fila de la proxima madrugada.
  - Prueba HTTP sobre backend corregido en puerto temporal `3002`: `/api/health` informo `operationalDate=2026-09-02`, `/api/live-sync/status` informo `source=lkn` sin errores y `/api/dashboard?fecha=2026-09-01` devolvio 62 filas, total `31460` y Turno 3 `3680`.
- Operacion aplicada sobre `ferrosider_produccion_soldadura`:
  - Se creo el respaldo recuperable `produccion_hora_backup_20260902_fecha_operativa_fix` con 8.564 filas del rango `2026-08-26` a `2026-09-02` y total previo `205666`.
  - `npm --prefix backend run db:init` finalizo correctamente contra la base productiva.
  - Se sembraron 62 mapeos explicitos LKN con vigencia desde `2026-08-26`, sin maquinas omitidas.
  - Se reimportaron con `replaceDate=true` los siete dias historicos `2026-08-26` a `2026-09-01`; sus filas y totales coinciden con la validacion de Test y no quedaron fechas operativas desplazadas.
  - El dashboard productivo `2026-09-01` devuelve 62 filas, total `31460` y Turno 3 `3680`.
  - El dia actual no se recargo todavia porque el scheduler productivo sigue ejecutando la version anterior y lo volveria a sobrescribir.
- Hallazgo pendiente de origen:
  - LKN entrega cantidades repetidas en tags TUCKER distintos; el caso `2026-08-31 17:00` contiene seis filas independientes con cantidad `20`.
  - Para corregir esa repeticion sin perder combinaciones validas, Node-RED/PLC debe informar el conjunto activo o poner en cero los tags no trabajados.
- Pendiente antes de Produccion:
  - Desplegar/reiniciar el backend/frontend corregidos en el servidor web.
  - Reimportar el dia operativo actual despues del reinicio.
  - Validar una madrugada real y revisar el estado de sincronizacion LKN.

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
  - `LIVE_CSV_PATH` apunta al share vivo administrado por Mantenimiento.
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
  - Se recargo produccion llamando a `POST /soldadura/api/live-sync` en el host productivo.
  - Resultado: 451 filas solo de `2026-07-16`, sin historicos y sin horas futuras; dashboard productivo devuelve `total=2704`, `totalProductosFinales=1530`.
  - Observacion critica: Produccion estaba leyendo una copia local obsoleta, con `sourceMtime=2024-09-03T15:54:21.081Z`, no el share vivo administrado por Mantenimiento.

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
  - `POST /api/live-sync` OK contra el share vivo administrado por Mantenimiento: 89 filas leidas, 62 filas importadas, 1488 celdas horarias actualizadas para 2026-07-02.
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
