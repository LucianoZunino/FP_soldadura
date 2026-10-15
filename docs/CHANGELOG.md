# CHANGELOG - FP_Soldadura

## 2026-10-15

- Se agrega la vista `Resumen general` por fecha con columnas `PIEZA_NUMERO`, `DESCRIPCION`, `PROD_T1`, `PROD_T2`, `PROD_T3` y `produccion_actual`.
- Se incorpora `GET /api/resumen-general/excel` para descargar esos mismos datos como XLSX real, con autofiltro, anchos de columna y valores numericos.
- El Resumen general del dia operativo actual participa del refresco de solo lectura cada 10 segundos.
- Las exportaciones historicas de grilla y turno pasan a rotularse correctamente como CSV para diferenciarlas del nuevo XLSX.
- Se promueven a las 15 ramas Node-RED productivas el filtro de horas futuras, la ventana de 10 minutos para corregir ceros y la lectura `HORA[0]` de CELDA_7 en `00-01`.
- El despliegue productivo queda automatizado con dry-run, validacion de huella, respaldo previo, verificacion posterior, modo idempotente y rollback explicito.
- Se confirma con captura directa del PLC de CELDA_7 que el bloque `00-01` se acumula en `HORA[0]`, mientras `HORA[24]` permanece en cero.
- El flujo general Test usa ahora `[0]` solo para CELDA_7 en medianoche. Las otras ramas conservan el indice de su configuracion productiva; Tucker y las MIG ya usaban `[0]`.
- Se mantiene en las 15 ramas Test el descarte de horas futuras y la regla que acepta ceros hasta 10 minutos despues del cierre, sin escribir tablas productivas.
- El importador LKN deja de reemplazar una fecha cuando la fuente devuelve cero filas. Informa `reason=empty-source` y `preservedExistingData=true` sin iniciar una transaccion destructiva.
- Se agrega una prueba automatica para demostrar que una fuente vacia no ejecuta `DELETE FROM produccion_hora`.
- Se reorganiza la documentacion segun el contrato del proyecto: `context/` para estado vigente, runbooks para operacion, un unico changelog, backlog separado y procedimientos de despliegue/rollback.
- El Dashboard reemplaza el subtitulo obsoleto de lectura CSV por la fuente viva LKN vigente.

## 2026-10-01

- Se agrega `scripts/diagnose-node-red-celda7-hour-index-test.js` y se deja activo un flujo Test temporal que compara los indices `[0]` y `[24]` de las cinco piezas de CELDA_7 durante el proximo cruce de medianoche.
- Se confirma que el PLC de CELDA_7 expone ambos indices. La lectura posterior a las 06:00 encontro ambos reiniciados en cero, por lo que hace falta capturarlos durante `00-01` antes de cambiar el mapeo.
- Se agrega al flujo general Test un monitor deduplicado de estados reales de las 15 entradas `eth-ip`, con destino `lkn_soft.plc_estado_diagnostico_test`.
- Tucker y MIG_1 fueron las unicas ramas sin estado `online` despues del despliegue, aunque sus PLC respondieron en el puerto 44818. La evidencia apunta a sesiones Node-RED trabadas o sin reconexion automatica, no a un error de mapeo.
- Se determina que el heartbeat basado en mensajes no prueba conectividad: el modo `all` del nodo instalado emite solamente cuando cambia al menos un tag.

## 2026-09-30

- La comparacion del 29/09 contra `produccion_sold_bk_ayer.csv` confirma que el flujo TEST corrigio 46 falsos positivos del Turno 3: Test coincidio en 1.467 celdas frente a 1.430 de Produccion.
- Se detecta que aceptar cualquier cero puede borrar produccion historica cuando el PLC reinicia tarde sus arreglos horarios; `MIG_4_APRON_OP5LH` paso incorrectamente de `30` a `0` en el bloque `06-07`.
- Las 15 ramas TEST ahora aceptan un cero sobre un positivo solamente durante el bloque activo y hasta 10 minutos despues de su cierre. Los ceros tardios conservan el positivo historico.
- La proteccion usa la hora local de Argentina convertida explicitamente desde UTC y mantiene el descarte de bloques futuros.
- Quedan pendientes la diferencia de CELDA_7 en `00-01` y el completado explicito de bloques sin lectura en MIG_1.

## 2026-09-24

- Se confirma en Node-RED que Tucker usa tags independientes por pieza: `TUNNEL` lee `E05.Produccion.Por_Hora`, sin cruces de mapeo con `DASH OP 5`, `DASH OP 7` ni `CAJA DE AGUA`.
- Se identifica que el upsert de `lkn_soft.produccion_horaria` conserva un positivo cuando el PLC informa cero y que las ramas recorren los 24 bloques sin descartar horarios futuros.
- Se agrega `scripts/deploy-node-red-all-machines-test.js` para generar y desplegar una prueba aislada de las 15 ramas de soldadura, con validaciones previas y ejecucion explicita mediante `--deploy`.
- La prueba corrige el upsert para aceptar cero, descarta bloques cuyo inicio todavia no ocurrio, usa una cola MySQL TEST independiente y escribe exclusivamente en `produccion_horaria_test` y `dashboard_equipos_live_test`.
- La comparacion de 62 maquinas y 496 bloques iniciados encontro 19 casos donde Test registro `0` y Produccion conservo un positivo anterior, confirmando el defecto del upsert productivo.

## 2026-09-02

- El frontend usa el dia operativo como fecha inicial y como criterio de refresco vivo: entre `00:00` y `05:59` mantiene visible el dia anterior para completar el Turno 3.
- `POST /api/import` y la importacion LKN sin fecha explicita usan tambien el dia operativo actual, evitando que una actualizacion manual durante la madrugada apunte al dia calendario nuevo.
- Se corrige la doble conversion de fecha LKN: `fecha_operativa` ya incluye `00-06` dentro del dia operativo anterior, por lo que el importador deja de leer el dia siguiente y deja de restar otro dia al guardar `fecha_modificada`.
- El filtro de horas futuras entiende el cruce operativo: antes de medianoche mantiene ocultos `00-06` del calendario siguiente y durante la madrugada habilita cada bucket solamente cuando comienza.
- Los positivos residuales de LKN cuya `ultima_lectura` es anterior al inicio de su bucket se guardan como produccion `0` en vez de eliminar la fila completa. Asi las combinaciones sin produccion permanecen visibles y no heredan una cantidad anticipada.
- La sincronizacion LKN informa `prematurePositiveRowsReset` y `prematureQuantityDiscarded` para auditar filas y cantidades residuales neutralizadas.
- Se agregan pruebas automaticas para el cruce operativo `00-06` y para la neutralizacion de positivos anticipados.

## 2026-08-13

- Se detecta que los buckets cuya `ultima_lectura` es anterior a `fecha_hora_desde` pueden contener valores residuales que Node-RED precarga antes de que comience la hora correspondiente.
- Se confirma que Node-RED recorre las 24 posiciones horarias del PLC y conserva el positivo anterior cuando recibe cero; la correccion completa de positivos residuales requiere ajustar ese flujo de origen.

## 2026-08-04

- Se agrega `produccion_hora.fecha_modificada` como fecha operativa de consulta del dashboard.
- El importador LKN conserva `fecha` como fecha origen de `lkn_soft.produccion_horaria` y calcula `fecha_modificada` para el cruce de Turno 3.
- Para Turno 3, las horas `00-06` de LKN se guardan con `fecha_modificada` del dia anterior, por ejemplo origen `2026-07-29 00-06` consulta como operativo `2026-07-28`.
- `GET /api/dashboard` y `GET /api/turno` pasan a consultar por `fecha_modificada`.
- La sincronizacion LKN automatica usa fecha operativa actual: entre `00:00` y `05:59` refresca el dia anterior.
- En modo Test se valida LKN contra `ferrosider_produccion_soldadura_test` para `2026-07-28` y `2026-07-29`.
- Se deja la configuracion preparada para seguir consumiendo desde LKN en produccion (`SYNC_SOURCE=lkn`, `LKN_AUTO_SYNC_ENABLED=true`) y se desactiva/comenta el proceso CSV vivo.
- La grilla del frontend muestra `0` explicitamente en las horas sin produccion, en lugar de dejar la celda vacia.
- La interpretacion de `fecha_operativa` documentada en esta version queda corregida por el relevamiento del 2026-09-02: LKN ya entrega la fecha operativa ajustada y no debe restarse nuevamente.

## 2026-07-23

- Se detectan diferencias entre `lkn_soft.produccion_horaria` y la intranet vieja en varias celdas/horas; luego se identifico que una causa critica era el cruce de dia del Turno 3.
- Se restaura la sincronizacion viva desde CSV mediante `LIVE_CSV_PATH`, con scheduler backend opcional (`LIVE_CSV_AUTO_SYNC_ENABLED`, `LIVE_REFRESH_SECONDS`).
- `POST /api/live-sync` y `POST /api/import` para el dia actual pasan a usar la fuente configurada por `SYNC_SOURCE=csv|lkn`.
- Se agrega `GET /api/live-sync/status` para ver la fuente activa y el estado de los sincronizadores CSV/LKN.
- En modo Test se configura `SYNC_SOURCE=csv`, `LKN_AUTO_SYNC_ENABLED=false` y base `ferrosider_produccion_soldadura_test`.
- Esta decision queda superada por la correccion de `fecha_modificada` del 2026-08-04: produccion vuelve a quedar orientada a LKN.

## 2026-07-16

- Se corrige la vista del dia actual para que no muestre ni sume produccion de franjas horarias futuras, aunque existan valores adelantados en `produccion_hora`.
- La sincronizacion viva (`POST /api/live-sync`) deja de importar buckets horarios futuros y limpia a cero valores futuros ya persistidos para el dia actual.
- El calculo de dia/hora operativa del backend queda fijado por defecto a `America/Argentina/Buenos_Aires`, configurable con `APP_TIME_ZONE`, evitando errores si el proceso corre con zona horaria UTC.
- La sincronizacion viva conserva el mayor valor observado por celda/pieza/hora, evitando saltos hacia abajo cuando el CSV alterna snapshots o trae lecturas parciales.
- Se reemplaza la sincronizacion automatica desde el frontend por un refresco visual de solo lectura (`VITE_AUTO_DASHBOARD_REFRESH`), evitando que un navegador escriba en base cada 10 segundos.
- Se crea la DB `ferrosider_produccion_soldadura_test` para uso local, con estructura y catalogos copiados desde produccion pero sin historico de `produccion_hora`.
- Se agrega importador desde `lkn_soft.produccion_horaria` hacia `produccion_hora` mediante `POST /api/import-lkn`, manteniendo el frontend desacoplado de la fuente origen.
- Se rellena `ferrosider_produccion_soldadura_test` para `2026-07-16` desde LKN: 1488 filas origen, 62 maquinas mapeadas, 806 filas importadas y 682 franjas futuras omitidas.
- Se agrega scheduler backend opcional para refrescar automaticamente `produccion_hora` desde LKN (`LKN_AUTO_SYNC_ENABLED`, `LKN_SYNC_SECONDS`) y endpoints de estado/ejecucion (`GET /api/lkn-sync/status`, `POST /api/lkn-sync/run`).
- El frontend refresca la vista del dia actual leyendo `/api/dashboard` cada 10 segundos; la escritura automatica queda a cargo del scheduler backend.
- Se agrega `maquina_pieza_mapeo` con vigencia temporal para resolver cambios de pieza por maquina sin reinterpretar historicos; incluye endpoints `GET/POST /api/lkn-mappings` y seed automatico desde LKN.
- `POST /api/live-sync` y `POST /api/import` para la fecha actual pasan a usar LKN como fuente viva; el CSV queda limitado a importaciones historicas/manuales.

## 2026-07-13

- Se corrige la convivencia entre `POST /api/import` y `POST /api/live-sync` para la fecha actual: el modo vivo deja de pisar una importacion manual si `LIVE_CSV_PATH` tiene una fecha de modificacion anterior al archivo importado manualmente.
- La respuesta de importacion ahora incluye metadatos de frescura del archivo fuente (`sourceMtime`, `sourceMtimeMs`, `sourceSizeBytes`) para diagnosticar por que una fuente reemplaza o no reemplaza a otra.
- Se optimiza la importacion CSV con upserts por lote para que `POST /api/live-sync` pueda completar dentro de la ventana de refresco configurada.
- El modo vivo toma varias muestras del CSV y preserva valores positivos existentes cuando una lectura transitoria trae cero, evitando que la pantalla retroceda mientras el archivo compartido se esta actualizando.
- El boton principal del Dashboard usa `POST /api/live-sync` cuando la fecha seleccionada es el dia actual, evitando que intente leer el `CSV_PATH` historico `_ayer`.
- `POST /api/import` tambien redirige internamente a la sincronizacion viva cuando se pide la fecha actual sin `csvPath` explicito, para cubrir navegadores con bundle viejo o llamados externos.

## 2026-07-02

- Se agrega sincronizacion automatica del Dashboard contra el CSV vivo del dia actual configurado en `LIVE_CSV_PATH`.
- Se incorpora el endpoint `POST /api/live-sync`, con lectura estable del archivo, upsert de valores actuales y proteccion contra sincronizaciones concurrentes o demasiado frecuentes.
- El Dashboard principal dispara la sincronizacion al abrir y luego cada 10 segundos solo cuando muestra la fecha actual; las consultas historicas no son pisadas por el modo vivo.
- Se agregan las variables `LIVE_CSV_PATH` y `LIVE_REFRESH_SECONDS` a la configuracion documentada.

## 2026-06-25

- Se agrega la base de documentacion operativa del proyecto: `AGENTS.md` en raiz y `CONTEXTO_PROYECTO.md`, `INDICE_DOCUMENTACION.md`, `CHANGELOG.md`, `DEPLOY_LOG.md` como set de contexto del repo.
- `README.md` deja de ser un placeholder minimo y pasa a enlazar la documentacion principal, el flujo de arranque y las notas operativas.
- Se formaliza la tecnica de "documentacion por disparadores" como regla del repo: cada tipo de cambio queda asociado al `.md` que debe actualizarse y ningun cambio de contrato se considera cerrado sin documentacion sincronizada.
- Se ordena la raiz del proyecto moviendo la documentacion operativa a `docs/` y los logs de desarrollo a `logs/`, dejando en la carpeta principal solo archivos de entrada y configuracion.
- Se agrega soporte para relacionar componentes con articulos finales desde Excel mediante un modelo muchos-a-muchos (`articulo_final`, `pieza_articulo_final`), endpoint `POST /api/import-articulos` y nueva columna agregada en los reportes del frontend. El criterio de vinculacion queda definido por codigo de componente, no por descripcion.
- La importacion reconoce el marcador `_ayer` en el nombre del CSV y asigna los datos al dia calendario anterior. El frontend cambia automaticamente a la fecha efectivamente importada.
- Los selectores de fecha de Dashboard e Historial mantienen una fecha en edicion y solo actualizan la consulta al presionar `Consultar`, evitando recargas parciales mientras se modifica el calendario.

## Criterio de uso

- Registrar aca cambios funcionales, de contrato, de integracion o de comportamiento visible.
- No usar este archivo para ruido de formato, renombres menores o cambios internos sin impacto.
- Si un cambio llega a entorno real, reflejarlo tambien en `DEPLOY_LOG.md`.
