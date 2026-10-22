# Limitaciones y riesgos

## Sin autenticacion ni autorizacion - Confirmada

- **Impacto:** endpoints de importacion, mapeo y sincronizacion pueden ser ejecutados por cualquier cliente con acceso de red.
- **Evidencia:** `backend/src/server.js` no registra middleware de identidad o permisos.
- **Workaround actual:** limitar acceso por red y no publicar la API fuera del segmento autorizado.
- **Prioridad y siguiente paso:** P2 en `BACKLOG.md`; definir autenticacion y roles.

## Errores HTTP no clasificados - Confirmada

- **Impacto:** un consumidor no distingue un request invalido de una falla de infraestructura.
- **Evidencia:** el middleware final responde HTTP 500 para todos los errores.
- **Workaround actual:** revisar `error.message` y logs del backend.
- **Prioridad y siguiente paso:** P2 en `BACKLOG.md`; introducir errores tipados y respuestas 4xx/5xx.

## Dependencia central de Node-RED - Confirmada

- **Impacto:** una detencion genera huecos de staging y las sesiones Ethernet/IP pueden no reconectar aunque el PLC responda por red.
- **Evidencia:** incidentes del 2026-10-01 y huecos 2026-10-10 a 2026-10-14.
- **Control actual:** `lknHealthMonitor` registra cambios de nivel y `/api/lkn-health` permite verificar scheduler, fuente vacia, cobertura y atraso de staging.
- **Riesgo residual:** el monitor detecta el efecto observable; no reinicia automaticamente una sesion Ethernet/IP.

## Cero y falta de lectura ambiguos - Confirmada

- **Impacto:** el Dashboard puede mostrar cero sin probar que el PLC haya informado un cero explicito.
- **Evidencia:** bloques ausentes en Tucker y MIG_1 que se ven como cero funcional.
- **Workaround actual:** contrastar staging, estado de rama y CSV ante una investigacion.
- **Decision:** conservar la distincion como diagnostico tecnico y no agregarla al frontend mientras no exista una necesidad operativa del usuario.

## Huecos historicos - Confirmada

- **Impacto:** reportes de fechas afectadas estan incompletos y no pueden reconstruirse desde LKN.
- **Evidencia:** ausencia de filas entre 2026-10-10 y 2026-10-14.
- **Decision:** se confirmo que no existe una fuente confiable para reconstruir esas fechas. Se conserva el hueco documentado y no se fabrican datos; no queda una tarea de backfill abierta.

## Reinicio web dependiente de infraestructura - Confirmada

- **Impacto:** el repositorio no controla el gestor externo que hace pull/reinicio en el servidor.
- **Control actual:** `DEPLOY.md` define el procedimiento y `scripts/verify-web-deployment.js` valida release, API, fuente LKN, scheduler y monitor despues de publicar.
- **Riesgo residual:** el comando concreto del gestor sigue perteneciendo a la infraestructura del servidor y no debe inventarse en este repo.

## Estado del scheduler no persistente - Confirmada

- **Impacto:** `lastResult` y `lastError` se pierden al reiniciar; no hay historial de salud.
- **Evidencia:** estado en memoria de `backend/src/services/lknAutoSync.js`.
- **Workaround actual:** revisar staging, DB local y logs del proceso.
- **Prioridad y siguiente paso:** incluir metricas persistentes dentro del P1 de observabilidad.

## Retencion no definida - Confirmada

- **Impacto:** crecimiento no controlado o eliminacion manual de evidencia necesaria.
- **Evidencia:** no hay politica ni job versionado para staging, diagnosticos o backups.
- **Workaround actual:** conservar respaldos de despliegues y no borrar datos sin aprobacion.
- **Prioridad y siguiente paso:** P1 en `BACKLOG.md`; acordar plazos y automatizacion.

## Frontend monolitico - Confirmada

- **Impacto:** aumenta el acoplamiento entre vistas, estado y llamadas HTTP.
- **Evidencia:** concentracion en `frontend/src/main.jsx`.
- **Workaround actual:** validar build y flujos completos ante cada cambio.
- **Prioridad y siguiente paso:** P2 en `BACKLOG.md`; modularizar sin alterar comportamiento.

## Riesgos operativos

- Ejecutar `db:init` con `backend/.env` apuntando al entorno incorrecto.
- Habilitar simultaneamente CSV y LKN como escritores del dia actual.
- Crear un mapeo sin vigencia correcta y reinterpretar una maquina.
- Promover funciones Node-RED sin validar destinos de tablas y SHA del flujo.
- Confundir ausencia de fila Test con cero confirmado por PLC.
