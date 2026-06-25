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

## Estructura

- `backend/`: API Express, importador CSV y acceso MySQL.
- `frontend/`: dashboard React + Vite.
- `docs/`: documentacion operativa y contexto del proyecto.
- `logs/`: salidas locales de desarrollo.
- `backend/database/init.sql`: esquema y datos base.

## Notas operativas

- El backend usa `CSV_PATH` para ubicar el archivo de importacion.
- El backend puede usar `ARTICLES_XLSX_PATH` para importar la relacion articulo final <-> componente desde Excel.
- El frontend apunta por defecto a `http://localhost:3001`.
- Los cambios funcionales deberian reflejarse en `docs/CHANGELOG.md` y, si salen a uso real, tambien en `docs/DEPLOY_LOG.md`.

## Reglas de documentacion

- Usar documentacion por disparadores.
- Si cambia instalacion o arranque, actualizar `README.md`.
- Si cambia API, CSV, SQL, arquitectura o flujo operativo, actualizar `docs/CONTEXTO_PROYECTO.md`.
- Si cambia el comportamiento funcional, actualizar `docs/CHANGELOG.md`.
- Si el cambio pasa a uso real, actualizar `docs/DEPLOY_LOG.md`.
- Ningun cambio de contrato se considera terminado sin su actualizacion documental.
