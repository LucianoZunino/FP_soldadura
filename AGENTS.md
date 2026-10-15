Objetivo del repo: registrar y visualizar produccion horaria de soldadura desde PLC/Node-RED y LKN, con CSV como respaldo historico/manual.

Lectura obligatoria cuando falte contexto:
- `context/index.md` para ubicar el contrato vigente.
- `DEPLOY.md` antes de operar Test o Produccion.
- `BACKLOG.md` para riesgos y pendientes.
- `docs/CHANGELOG.md` para historial funcional.
- `docs/DEPLOY_LOG.md` para operaciones ya realizadas.

Reglas de trabajo:
- Preguntar primero si se trabaja en Test o Produccion antes de tocar configuracion, DB, sincronizacion, servicios, Node-RED o despliegues.
- No usar `node_modules/` como fuente de verdad.
- No versionar secretos, `.env`, rutas personales ni respaldos productivos.
- Mantener SQL idempotente cuando corresponda y preservar claves de negocio.
- Node-RED productivo requiere dry-run, respaldo, huella conocida, verificacion posterior y rollback documentado.
- Si cambia API, datos, servicios, UI, arquitectura o despliegue, actualizar el archivo aplicable de `context/` en el mismo cambio.
- `docs/CHANGELOG.md` es el unico historial funcional oficial.
- `BACKLOG.md` contiene solo trabajo abierto; no usarlo como historial.
