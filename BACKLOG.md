# Backlog

Solo contiene trabajo abierto. Las decisiones cerradas pertenecen a `docs/CHANGELOG.md` y los despliegues reales a `docs/DEPLOY_LOG.md`.

## P0 - Validar medianoche productiva de CELDA_7

- **Problema:** la correccion `HORA[0]` y los tags faltantes del endpoint fueron promovidos y ya recuperaron las horas diurnas, pero todavia no se contrasto un `00-01` productivo cerrado despues del arreglo.
- **Impacto:** una regresion perderia produccion de `00-01` para cinco piezas de CELDA_7.
- **Evidencia:** despliegue y recuperacion del 2026-10-22 registrados en `docs/ANALISIS_LKN_PRODUCCION_HORARIA.md`; el flujo diagnostico temporal ya fue retirado.
- **Siguiente paso:** comparar LKN y CSV cerrado en el proximo cruce, verificando los tags `[0]` del endpoint global si hubiera diferencias.
- **Criterio de cierre:** las piezas activas coinciden y no se observan valores tomados de `[24]`.

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
