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

La fuente viva recomendada es `lkn_soft.produccion_horaria`. Para rellenar la base desde LKN se puede usar:

```bash
curl -X POST http://localhost:3001/api/import-lkn \
  -H "Content-Type: application/json" \
  -d "{\"fecha\":\"YYYY-MM-DD\",\"replaceDate\":true}"
```

Para actualizarla automaticamente desde el backend:

```env
LKN_AUTO_SYNC_ENABLED=true
LKN_SYNC_SECONDS=15
LKN_DB_NAME=lkn_soft
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

- El backend usa LKN (`lkn_soft.produccion_horaria`) como fuente viva de produccion.
- `CSV_PATH` queda solo para importacion historica/manual.
- El frontend apunta por defecto a `http://localhost:3001`.
- Los cambios funcionales deberian reflejarse en `docs/CHANGELOG.md` y, si salen a uso real, tambien en `docs/DEPLOY_LOG.md`.

## Reglas de documentacion

- Usar documentacion por disparadores.
- Si cambia instalacion o arranque, actualizar `README.md`.
- Si cambia API, CSV, SQL, arquitectura o flujo operativo, actualizar `docs/CONTEXTO_PROYECTO.md`.
- Si cambia el comportamiento funcional, actualizar `docs/CHANGELOG.md`.
- Si el cambio pasa a uso real, actualizar `docs/DEPLOY_LOG.md`.
- Ningun cambio de contrato se considera terminado sin su actualizacion documental.
