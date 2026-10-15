# Despliegue y rollback

## Regla inicial

Antes de cualquier comando confirmar el modo: **Test** o **Produccion**. `backend/.env` sobrescribe valores de `.env`; no asumir el destino por el nombre de la terminal.

## Preparacion comun

```powershell
git status --short
node --check backend\src\server.js
node --check backend\src\services\lknImporter.js
node --check backend\src\services\lknAutoSync.js
npm --prefix backend test
npm run frontend:build
git diff --check
```

Revisar que no se versionen `.env`, backups, credenciales, rutas personales ni datos exportados.

## Test

Configuracion esperada:

```env
DB_NAME=ferrosider_produccion_soldadura_test
SYNC_SOURCE=lkn
LKN_DB_NAME=lkn_soft
LKN_AUTO_SYNC_ENABLED=true
LKN_SYNC_SECONDS=15
LIVE_CSV_AUTO_SYNC_ENABLED=false
```

El flujo Node-RED Test escribe solamente tablas terminadas en `_test`.
Definir `NODE_RED_BASE_URL` en la sesion antes de ejecutar los scripts; no guardar la direccion interna en el repo.

```powershell
node scripts\deploy-node-red-all-machines-test.js
node scripts\deploy-node-red-all-machines-test.js --deploy
```

Ejecutar primero el dry-run y revisar las 15 ramas, sus indices de medianoche y destinos.

## Produccion web

Configuracion esperada:

```env
DB_NAME=ferrosider_produccion_soldadura
SYNC_SOURCE=lkn
LKN_DB_NAME=lkn_soft
LKN_AUTO_SYNC_ENABLED=true
LKN_SYNC_SECONDS=15
LIVE_CSV_AUTO_SYNC_ENABLED=false
APP_TIME_ZONE=America/Argentina/Buenos_Aires
```

En el servidor que ejecuta la aplicacion:

1. Respaldar DB y configuracion segun politica operativa.
2. Obtener el commit aprobado.
3. Instalar dependencias si cambiaron los lockfiles.
4. Ejecutar `npm run db:init` solo despues de verificar `DB_NAME` productivo.
5. Ejecutar `npm run frontend:build`.
6. Reiniciar backend y publicacion frontend con el gestor real del servidor.
7. Confirmar `/api/health` y `/api/live-sync/status`.
8. Verificar que `source=lkn`, el scheduler este iniciado y `lastError` sea nulo.
9. Comparar al menos un bloque cerrado contra LKN o CSV de control.

El repositorio no contiene actualmente el comando del gestor de procesos productivo. No inventar `pm2`, servicio Windows o ruta de publicacion: registrarlos cuando sean confirmados.

## Produccion Node-RED

Definir `NODE_RED_BASE_URL` en la sesion de operacion. La direccion productiva no se versiona.

Dry-run obligatorio:

```powershell
node scripts\deploy-node-red-all-machines-production.js
```

Despliegue explicito:

```powershell
node scripts\deploy-node-red-all-machines-production.js --deploy --confirm-production
```

El script exige una huella conocida, genera respaldo, promueve exactamente 15 funciones desde el flujo validado de Test y comprueba la huella desplegada. Si el flujo ya coincide, informa `operation=no-op`.

Rollback del despliegue 2026-10-15:

```powershell
node scripts\deploy-node-red-all-machines-production.js --rollback backups\node-red\2026-10-15T11-15-05-production-flow-before-hourly-corrections.json --confirm-production
```

El backup es operacional y esta ignorado por Git. Verificar que exista en la maquina desde la que se ejecutara el rollback.

## Criterio de exito

- Node-RED productivo conserva 15 ramas y escribe solo tablas productivas.
- El staging LKN actualiza 62 maquinas para el dia operativo.
- El backend importa sin errores de mapeo y omite horas futuras.
- El frontend muestra el mismo total que `/api/dashboard`.
- El cambio y su evidencia quedan en `docs/DEPLOY_LOG.md`.

## Rollback web

1. Detener el scheduler o proceso afectado.
2. Volver al commit estable.
3. Restaurar DB solo si hubo una migracion o importacion destructiva.
4. Reconstruir frontend y reiniciar backend.
5. Confirmar fuente, fecha operativa, estado del scheduler y un bloque cerrado.
6. Registrar causa, alcance y resultado en `docs/DEPLOY_LOG.md`.
