# Backlog

Solo contiene trabajo abierto. Las decisiones cerradas pertenecen a `docs/CHANGELOG.md` y los despliegues reales a `docs/DEPLOY_LOG.md`.

## P0 - Validar medianoche productiva de CELDA_7

- **Problema:** la correccion `HORA[0]` fue demostrada con captura PLC y promovida, pero todavia no se contrasto su primera ejecucion productiva real.
- **Impacto:** una regresion perderia produccion de `00-01` para cinco piezas de CELDA_7.
- **Evidencia:** `docs/ANALISIS_LKN_PRODUCCION_HORARIA.md` y flujo diagnostico `113a3702b93d7672`.
- **Siguiente paso:** comparar LKN, CSV cerrado y diagnostico en el proximo cruce.
- **Criterio de cierre:** las piezas activas coinciden y no se observan valores tomados de `[24]`.

## P0 - Desplegar proteccion de fuente vacia en backend

- **Problema:** el codigo evita reemplazar un dia cuando LKN devuelve cero filas, pero el servidor web requiere pull y reinicio.
- **Impacto:** una version anterior puede borrar temporalmente el snapshot del Dashboard durante una caida de staging.
- **Evidencia:** `backend/test/lknImporterEmptySource.test.js` y `backend/src/services/lknImporter.js`.
- **Siguiente paso:** desplegar el commit aprobado en el servidor y verificar el endpoint con una fecha inocua sin fuente.
- **Criterio de cierre:** Produccion responde `reason=empty-source`, `preservedExistingData=true` y conserva el conteo destino.

## P1 - Resolver huecos historicos

- **Problema:** LKN no contiene datos del 2026-10-10 al 2026-10-14 por una detencion de Node-RED.
- **Impacto:** reportes historicos incompletos.
- **Evidencia:** conteos registrados en `docs/ANALISIS_LKN_PRODUCCION_HORARIA.md`.
- **Siguiente paso:** localizar CSV cerrados u otra fuente confiable y definir un backfill respaldado.
- **Criterio de cierre:** fechas recuperadas y contrastadas, o declaradas irrecuperables con aprobacion operativa.

## P1 - Agregar observabilidad de adquisicion

- **Problema:** no hay alerta automatica por staging atrasado, ramas offline o sesiones Ethernet/IP trabadas.
- **Impacto:** una caida puede detectarse horas o dias despues.
- **Evidencia:** incidentes de Tucker y MIG_1 documentados el 2026-10-01.
- **Siguiente paso:** definir watchdog por rama, umbral de atraso y canal de alerta.
- **Criterio de cierre:** una prueba controlada de desconexion genera alerta y registra recuperacion.

## P1 - Distinguir cero de falta de lectura

- **Problema:** cero confirmado y ausencia de comunicacion se presentan igual.
- **Impacto:** no puede auditarse la calidad de un bloque sin volver a la fuente.
- **Evidencia:** filas ausentes Test de Tucker y MIG_1 durante Turno 3.
- **Siguiente paso:** agregar estado de lectura/origen al staging y al modelo local antes de modificar la UI.
- **Criterio de cierre:** API y Dashboard diferencian `CERO_CONFIRMADO` de `SIN_LECTURA`.

## P1 - Formalizar y completar despliegue web

- **Problema:** no hay procedimiento versionado para pull, build, reinicio y rollback del servidor real.
- **Impacto:** un push no permite demostrar que Produccion ejecuta el commit esperado; la proteccion de fuente vacia y el Resumen general no quedan activos hasta reiniciar/publicar.
- **Evidencia:** `DEPLOY.md` debe dejar el gestor de procesos sin especificar.
- **Siguiente paso:** relevar servicio, rutas, usuario tecnico y health checks sin publicar secretos.
- **Criterio de cierre:** despliegue reproducible con verificacion de commit y rollback probado.

## P1 - Definir retencion

- **Problema:** staging, diagnosticos y respaldos no tienen plazo documentado.
- **Impacto:** crecimiento no controlado o perdida prematura de evidencia.
- **Evidencia:** ausencia de jobs o politica en el repo.
- **Siguiente paso:** acordar retencion por tabla y tipo de backup.
- **Criterio de cierre:** politica aprobada, automatizada y monitoreada.

## P2 - Modularizar frontend

- **Problema:** vistas, estado y llamadas HTTP estan concentrados en `frontend/src/main.jsx`.
- **Impacto:** cambios pequenos pueden generar regresiones cruzadas.
- **Evidencia:** estructura actual del frontend.
- **Siguiente paso:** separar cliente API, fecha operativa, vistas y componentes sin cambiar contrato visual.
- **Criterio de cierre:** modulos con responsabilidades claras y build/pruebas equivalentes.

## P2 - Clasificar errores y proteger escrituras

- **Problema:** la API no tiene autenticacion y devuelve HTTP 500 para cualquier error.
- **Impacto:** endpoints de escritura quedan expuestos en la red y los clientes no distinguen validacion de infraestructura.
- **Evidencia:** `backend/src/server.js`.
- **Siguiente paso:** definir autenticacion, roles y contrato de errores 4xx/5xx.
- **Criterio de cierre:** importaciones/mapeos requieren permiso y los errores tienen codigos estables.
