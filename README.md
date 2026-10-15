# FP_Soldadura

Dashboard industrial para capturar, normalizar y consultar produccion horaria de soldadura por celda, pieza, turno y articulo final.

La fuente viva principal es `lkn_soft.produccion_horaria`, alimentada por Node-RED desde PLC. El backend copia el dia operativo a una base propia y el frontend consume solamente la API. CSV queda disponible para importaciones historicas y contraste manual.

## Stack

- Backend: Node.js, Express y MySQL.
- Frontend: React y Vite.
- Integracion industrial: Node-RED y Ethernet/IP.
- Fuentes auxiliares: CSV horario y Excel de articulos finales.

## Inicio rapido

Requisitos: Node.js compatible con las versiones de `package-lock.json`, npm, acceso a MySQL y variables de entorno locales.

```powershell
npm install
npm --prefix backend install
npm --prefix frontend install
Copy-Item .env.example .env
npm run db:init
npm run dev
```

Antes de ejecutar `db:init`, importaciones o servicios, confirmar si el trabajo corresponde a **Test** o **Produccion**. Para desarrollo local se recomienda `backend/.env` apuntando a una base aislada; ese archivo no se versiona.

## Comandos

```powershell
npm run dev
npm --prefix backend test
npm run frontend:build
npm run db:init
node scripts\deploy-node-red-all-machines-test.js
node scripts\deploy-node-red-all-machines-production.js
```

Los scripts Node-RED son `dry-run` por defecto. La operacion productiva y su rollback requieren confirmacion explicita; consultar [DEPLOY.md](./DEPLOY.md).
Antes de ejecutarlos se debe definir `NODE_RED_BASE_URL` en la sesion local; la direccion interna no se versiona.

## Configuracion

`.env.example` enumera el contrato de configuracion sin valores sensibles. Variables principales:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- `SYNC_SOURCE=lkn|csv`.
- `LKN_DB_NAME`, `LKN_AUTO_SYNC_ENABLED`, `LKN_SYNC_SECONDS`.
- `CSV_PATH`, `LIVE_CSV_PATH`, `LIVE_CSV_AUTO_SYNC_ENABLED`, `LIVE_REFRESH_SECONDS`.
- `ARTICLES_XLSX_PATH`, `APP_TIME_ZONE`, `PORT`.
- `VITE_API_BASE`, `VITE_AUTO_DASHBOARD_REFRESH`.

No versionar `.env`, credenciales, rutas personales ni respaldos con datos.

## Documentacion

- [Mapa de contexto](./context/index.md): contrato tecnico vigente.
- [Despliegue y rollback](./DEPLOY.md): procedimiento operativo.
- [Pendientes](./BACKLOG.md): riesgos y trabajo abierto.
- [Contribucion](./CONTRIBUTING.md): reglas de cambio y validacion.
- [Changelog oficial](./docs/CHANGELOG.md): historial funcional integrado.
- [Registro de despliegue](./docs/DEPLOY_LOG.md): evidencia de operaciones reales.
- [Analisis LKN](./docs/ANALISIS_LKN_PRODUCCION_HORARIA.md): investigacion historica detallada.

## Estructura

```text
backend/   API, servicios, esquema y pruebas
frontend/  interfaz React
context/   contrato tecnico vigente
docs/      evidencia, analisis y runbooks
scripts/   diagnostico y despliegue Node-RED
```

La regla de mantenimiento es simple: si cambia un comportamiento, su documento de contexto y el changelog deben actualizarse en el mismo cambio.
