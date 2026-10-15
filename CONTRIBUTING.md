# Contribucion

## Antes de cambiar

1. Confirmar con el responsable si el trabajo es **Test** o **Produccion**.
2. Leer `context/index.md`, `DEPLOY.md` y el documento del componente afectado.
3. Revisar `git status`; no descartar cambios ajenos.
4. No usar `node_modules/` como fuente de verdad.

## Configuracion

- `.env` y `backend/.env` no se versionan.
- El backend carga primero `.env` y despues `backend/.env` con override.
- No registrar credenciales, rutas personales, IP privadas ni exports de datos en documentacion o commits.
- `.env.example` define nombres y defaults seguros, no una configuracion desplegable.

## Codigo y datos

- Mantener SQL idempotente y respetar claves de negocio.
- Una importacion no debe borrar el destino si la fuente esta vacia o si fallan mapeos.
- Los cambios maquina-pieza requieren vigencia temporal; no editar historicos por conveniencia.
- El frontend no debe convertirse en escritor automatico de produccion.
- Cambios Node-RED productivos requieren dry-run, respaldo, SHA conocido, verificacion posterior y rollback.

## Validacion minima

```powershell
node --check backend\src\server.js
node --check backend\src\services\lknImporter.js
node --check backend\src\services\lknAutoSync.js
npm --prefix backend test
npm run frontend:build
git diff --check
```

Para Node-RED ejecutar primero, sin flags de despliegue:

```powershell
node scripts\deploy-node-red-all-machines-test.js
node scripts\deploy-node-red-all-machines-production.js
```

## Documentacion obligatoria

- Cambio funcional o de contrato: actualizar el archivo aplicable en `context/` y `docs/CHANGELOG.md`.
- Operacion real en un entorno: agregar evidencia en `docs/DEPLOY_LOG.md`.
- Trabajo no resuelto: agregar o actualizar `BACKLOG.md`.
- Cambio de arranque o configuracion: actualizar `README.md`, `.env.example` y `DEPLOY.md` si corresponde.
- No duplicar el contrato vigente en documentos historicos.

## Cierre

Un cambio esta listo cuando las validaciones pasan, no contiene secretos, el diff esta revisado y queda claro si fue solamente versionado o tambien desplegado.
