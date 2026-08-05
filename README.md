# FP_Soldadura

Sistema de captura, importacion y visualizacion de produccion horaria para soldadura.

## Documentacion base

- [CONTEXTO_PROYECTO.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/CONTEXTO_PROYECTO.md)
- [INDICE_DOCUMENTACION.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/INDICE_DOCUMENTACION.md)
- [CHANGELOG.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/CHANGELOG.md)
- [DEPLOY_LOG.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/DEPLOY_LOG.md)
- [AGENTS.md](/C:/Users/lzunino/Desktop/FP_Soldadura/AGENTS.md)

## Inicio rapido

1. Instalar dependencias en raiz, `backend` y `frontend` si hace falta.
2. Configurar `.env` a partir de `.env.example`.
3. Inicializar la base con `npm run db:init`.
4. Levantar el proyecto con `npm run dev`.

## Base local de test

El backend carga primero `.env` de la raiz y despues `backend/.env` con prioridad. Para desarrollo local se puede usar `backend/.env` para apuntar a una base aislada, por ejemplo:

```env
DB_NAME=ferrosider_produccion_soldadura_test
```

Esta configuracion evita que las pruebas locales escriban sobre la tabla productiva. El frontend local puede activar o desactivar el refresco visual del dashboard con `frontend/.env.development.local`:

```env
VITE_AUTO_DASHBOARD_REFRESH=true
```

La fuente viva se selecciona con `SYNC_SOURCE`.

La fuente viva esperada es LKN, con correccion de fecha operativa en `fecha_modificada` para el Turno 3:

```env
SYNC_SOURCE=lkn
LKN_AUTO_SYNC_ENABLED=true
LKN_SYNC_SECONDS=15
LKN_DB_NAME=lkn_soft
```

Estado de la sincronizacion viva configurada:

```bash
curl http://localhost:3001/api/live-sync/status
```

Para rellenar una base de prueba desde LKN se puede usar:

```bash
curl -X POST http://localhost:3001/api/import-lkn \
  -H "Content-Type: application/json" \
  -d "{\"fecha\":\"YYYY-MM-DD\",\"replaceDate\":true}"
```

CSV queda como fallback vivo si se necesita contrastar contra el archivo compartido:

```env
SYNC_SOURCE=csv
LIVE_CSV_PATH=\\192.168.3.223\Mantenimiento\CSV\produccion_sold_bk_1.csv
LIVE_CSV_AUTO_SYNC_ENABLED=true
LIVE_REFRESH_SECONDS=10
LKN_AUTO_SYNC_ENABLED=false
```

En produccion, el proceso CSV vivo debe quedar comentado/desactivado:

```env
# LIVE_CSV_PATH=\\192.168.3.223\Mantenimiento\CSV\produccion_sold_bk_1.csv
LIVE_CSV_AUTO_SYNC_ENABLED=false
# LIVE_REFRESH_SECONDS=10
```

Estado del scheduler:

```bash
curl http://localhost:3001/api/lkn-sync/status
```

Para consultar o cambiar mapeos de maquina LKN a celda/pieza:

```bash
curl http://localhost:3001/api/lkn-mappings
```

```bash
curl -X POST http://localhost:3001/api/lkn-mappings \
  -H "Content-Type: application/json" \
  -d "{\"maquina\":\"CELDA_4_X\",\"celda\":\"CELDA_4\",\"pieza\":\"PIEZA NUEVA\",\"fechaDesde\":\"YYYY-MM-DD\"}"
```

Cuando se informa un nuevo mapeo, el backend cierra el mapeo activo anterior de esa maquina hasta el dia previo a `fechaDesde`, salvo que se envie `closePrevious:false`.

## Estructura

- `backend/`: API Express, importador CSV y acceso MySQL.
- `frontend/`: dashboard React + Vite.
- `docs/`: documentacion operativa y contexto del proyecto.
- `logs/`: salidas locales de desarrollo.
- `backend/database/init.sql`: esquema y datos base.

## Notas operativas

- Produccion debe quedar con `SYNC_SOURCE=lkn` una vez validada la correccion de Turno 3.
- `fecha_modificada` es la fecha operativa usada por el dashboard; en Turno 3 mueve `00-06` al dia anterior.
- `CSV_PATH` queda para importacion historica/manual; `LIVE_CSV_PATH` queda como fallback vivo.
- El frontend apunta por defecto a `http://localhost:3001`.
- Los cambios funcionales deberian reflejarse en `docs/CHANGELOG.md` y, si salen a uso real, tambien en `docs/DEPLOY_LOG.md`.

## Reglas de documentacion

- Usar documentacion por disparadores.
- Si cambia instalacion o arranque, actualizar `README.md`.
- Si cambia API, CSV, SQL, arquitectura o flujo operativo, actualizar `docs/CONTEXTO_PROYECTO.md`.
- Si cambia el comportamiento funcional, actualizar `docs/CHANGELOG.md`.
- Si el cambio pasa a uso real, actualizar `docs/DEPLOY_LOG.md`.
- Ningun cambio de contrato se considera terminado sin su actualizacion documental.
