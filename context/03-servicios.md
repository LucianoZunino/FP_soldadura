# Servicios

## Backend HTTP

`backend/src/server.js` compone la API, selecciona la fuente viva y arranca un unico scheduler segun `SYNC_SOURCE`.

- `lkn`: inicia `lknAutoSync` si `LKN_AUTO_SYNC_ENABLED=true`.
- `csv`: inicia `liveCsvSync` si `LIVE_CSV_AUTO_SYNC_ENABLED=true`.
- El frontend nunca inicia el scheduler; solo consulta o solicita una ejecucion manual.

## Importador LKN

`backend/src/services/lknImporter.js` es la frontera entre el staging externo y el modelo local.

Responsabilidades:

1. Leer una `fecha_operativa` de `LKN_DB_NAME.produccion_horaria`.
2. Resolver cada maquina mediante un mapeo vigente; usar el parser de nombres solo como fallback.
3. Validar turno, celda y pieza antes de modificar el destino.
4. Omitir buckets futuros y neutralizar positivos cuya lectura sea anterior al inicio del bucket.
5. Reemplazar la fecha operativa dentro de una transaccion y hacer upsert por clave de negocio.

Invariantes:

- Si la fuente devuelve cero filas, conserva el snapshot local y responde `reason=empty-source`.
- Si existe una falla de mapeo, no reemplaza parcialmente el dia.
- `fecha_modificada` recibe directamente `fecha_operativa`; LKN ya resuelve el cruce de Turno 3.
- Una sola importacion puede estar activa por scheduler; llamadas simultaneas reutilizan la promesa en curso.

## Scheduler LKN

`backend/src/services/lknAutoSync.js` ejecuta una primera sincronizacion al arrancar y luego cada `LKN_SYNC_SECONDS`. Conserva en memoria `lastResult`, `lastError`, estado de ejecucion y fecha ISO de la ultima sincronizacion.

El estado se reinicia al reiniciar el proceso. La evidencia persistente permanece en las tablas y logs del entorno.

## Monitor interno LKN

`backend/src/services/lknHealthMonitor.js` controla en segundo plano:

- scheduler habilitado e iniciado;
- ultimo error y respuesta `empty-source`;
- filas y maquinas disponibles para el dia operativo;
- atraso de `lkn_soft.produccion_horaria` respecto del servidor MySQL.

Solo registra en logs cuando cambia el nivel o la causa, para evitar ruido cada 15 segundos. El estado tecnico se consulta en `GET /api/lkn-health`; no se muestra en el frontend.

## Importadores CSV

- `csvImporter.js`: importa una fecha historica o un archivo indicado manualmente.
- `liveCsvSync.js`: sincronizacion viva alternativa cuando `SYNC_SOURCE=csv`.
- En Produccion normal el scheduler CSV esta deshabilitado. El CSV no debe competir con LKN sobre el mismo dia.

## Relaciones de articulos

`articleRelationImporter.js` procesa el Excel configurado y actualiza catalogos y relaciones. La relacion por celda y pieza tiene prioridad sobre la relacion generica de pieza al construir el dashboard.

## Consultas

`productionService.js` consulta por `fecha_modificada`, agrega por turno y hora, resuelve el articulo final y devuelve ceros para combinaciones sin cantidad. No accede directamente al staging LKN.

## Node-RED

Las 15 ramas productivas adquieren 62 maquinas desde PLC y hacen upsert en LKN. Las reglas vigentes son:

- no escribir buckets cuyo inicio sea futuro;
- permitir que cero corrija un positivo durante el bucket y hasta 10 minutos despues;
- proteger el positivo historico frente a ceros tardios por reinicio;
- usar `HORA[0]` para `00-01` en CELDA_7;
- declarar en el endpoint global de CELDA_7 los cinco tags `HORA[0]` y los cinco `HORA[24]` requeridos;
- conservar el indice de medianoche propio del resto de las ramas.

Test y Produccion comparten un unico endpoint global de CELDA_7. El despliegue no se hace editando manualmente cada funcion o endpoint: se usa el script productivo versionado, que valida la huella, respalda `/flows`, elimina configuraciones duplicadas y verifica el resultado.

## Evidencia

- `backend/src/server.js`
- `backend/src/services/lknImporter.js`
- `backend/src/services/lknAutoSync.js`
- `backend/src/services/lknHealthMonitor.js`
- `backend/src/services/liveCsvSync.js`
- `backend/src/services/productionService.js`
- `scripts/deploy-node-red-all-machines-production.js`
