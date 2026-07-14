# INDICE_DOCUMENTACION - FP_Soldadura

## Archivos de contexto en raiz

- [README.md](/C:/Users/lzunino/Desktop/FP_Soldadura/README.md): entrada rapida para instalar, inicializar y ejecutar el proyecto.
- [AGENTS.md](/C:/Users/lzunino/Desktop/FP_Soldadura/AGENTS.md): reglas cortas de trabajo y lectura recomendada.
- [CONTEXTO_PROYECTO.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/CONTEXTO_PROYECTO.md): vision funcional y tecnica del sistema.
- [CHANGELOG.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/CHANGELOG.md): cambios funcionales del proyecto.
- [DEPLOY_LOG.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/DEPLOY_LOG.md): cambios llevados o listos para llevar a uso operativo.
- [ANALISIS_LKN_PRODUCCION_HORARIA.md](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/ANALISIS_LKN_PRODUCCION_HORARIA.md): relevamiento de `lkn_soft.produccion_horaria` como reemplazo potencial del CSV vivo.
- [FP_Soldadura_Flujo_operativo_datos.png](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/FP_Soldadura_Flujo_operativo_datos.png): imagen del flujo operativo del proyecto.
- [FP_Soldadura_Flujo_operativo_datos.puml](/C:/Users/lzunino/Desktop/FP_Soldadura/docs/FP_Soldadura_Flujo_operativo_datos.puml): fuente editable PlantUML del diagrama de flujo operativo.

## Orden fisico recomendado del repo

- raiz: solo entrada, configuracion y manifiestos (`README.md`, `AGENTS.md`, `package.json`, `.env*`, `.gitignore`)
- `docs/`: documentacion operativa
- `logs/`: logs locales de desarrollo
- `backend/` y `frontend/`: codigo de aplicacion

## Documentacion por modulo

- `backend/database/init.sql`: esquema inicial de base de datos.
- `backend/src/server.js`: contratos API disponibles.
- `backend/src/csvImporter.js`: logica de importacion desde CSV.
- `backend/src/productionService.js`: agregaciones y respuestas del dashboard.
- `frontend/src/main.jsx`: composicion de vistas, fetches y estado principal.
- `frontend/src/styles.css`: layout y lenguaje visual de la app.

## Orden recomendado de lectura

1. `README.md`
2. `docs/CONTEXTO_PROYECTO.md`
3. `backend/database/init.sql`
4. `backend/src/server.js`
5. `frontend/src/main.jsx`

## Cuando actualizar cada archivo

- `README.md`: cambios de arranque, instalacion o uso local.
- `AGENTS.md`: cambios en reglas operativas de documentacion.
- `docs/CONTEXTO_PROYECTO.md`: cambios de arquitectura, contratos o flujos.
- `docs/CHANGELOG.md`: cualquier cambio funcional.
- `docs/DEPLOY_LOG.md`: cambios que ya fueron aplicados o estan listos para aplicar.
