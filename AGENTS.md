Objetivo del repo: registrar produccion horaria de soldadura desde CSV y exponerla en un dashboard web con backend Node.js, frontend React y persistencia MySQL.

Documentacion base (leer primero cuando falte contexto):
- `docs/CONTEXTO_PROYECTO.md` para vision general, arquitectura y flujo de datos.
- `docs/INDICE_DOCUMENTACION.md` para ubicar rapidamente cada archivo.
- `README.md` para arranque rapido del entorno.
- `docs/CHANGELOG.md` para cambios funcionales versionados.
- `docs/DEPLOY_LOG.md` para cambios efectivamente llevados a uso operativo.

Reglas de trabajo:
- No usar `node_modules/` como fuente de verdad.
- Si cambia el contrato de API, el formato CSV o el esquema SQL, actualizar la documentacion en el mismo cambio.
- Registrar en `docs/CHANGELOG.md` cualquier cambio funcional, incluso si todavia no fue desplegado.
- Registrar en `docs/DEPLOY_LOG.md` solo cambios listos o aplicados en un entorno real de uso.
- Mantener este archivo corto: sirve como puerta de entrada, no como documentacion exhaustiva.

Tecnicas recomendadas para documentar:
- Usar documentacion por disparadores, no por memoria ni por voluntad eventual.
- Ningun cambio de contrato se considera cerrado si no actualiza su `.md` correspondiente.
- Si cambia la forma de arrancar o configurar el proyecto, actualizar `README.md`.
- Si cambia arquitectura, flujo, endpoints, esquema o integracion CSV, actualizar `docs/CONTEXTO_PROYECTO.md`.
- Si cambia el comportamiento funcional, actualizar `docs/CHANGELOG.md`.
- Si el cambio ya fue aplicado o esta listo para aplicarse en uso real, actualizar `docs/DEPLOY_LOG.md`.
