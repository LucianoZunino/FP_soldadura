# CONTEXTO_PROYECTO - FP_Soldadura

## Vision general

`FP_Soldadura` es una aplicacion full stack para importar produccion de soldadura desde un archivo CSV, guardarla en MySQL y visualizarla en un dashboard operativo por dia, turno, celda y pieza.

El objetivo del sistema es concentrar en una unica interfaz:

- la carga de produccion desde un archivo externo,
- la sincronizacion automatica contra `lkn_soft.produccion_horaria` para la produccion viva del dia actual,
- la consulta diaria por turnos y horas,
- el resumen por celda/pieza,
- la trazabilidad de cada componente hacia uno o varios articulos finales,
- y la exportacion de datos para analisis externo.

## Arquitectura

```text
CSV de produccion
        |
        v
backend/src/csvImporter.js
        |
        v
MySQL (celda, pieza, turno, produccion_hora)
        |
        v
backend/src/productionService.js
        |
        v
API Express (/api/*)
        |
        v
frontend React/Vite
```

El CSV queda disponible como fuente historica/manual:

```text
CSV historico/manual (CSV_PATH)
        |
        v
backend/src/services/csvImporter.js
        |
        v
MySQL + Dashboard
```

La fuente viva vigente para sincronizacion automatica es SQL:

```text
lkn_soft.produccion_horaria
        |
        v
maquina_pieza_mapeo (vigencia por fecha)
        |
        v
backend/src/services/lknImporter.js
        |
        v
MySQL local/test (produccion_hora)
        |
        v
Dashboard actual
```

## Componentes principales

### 1. Backend

Ubicacion: `backend/`

Responsabilidades:

- exponer endpoints REST,
- importar el CSV hacia MySQL,
- sincronizar la produccion viva desde `lkn_soft.produccion_horaria`,
- consultar produccion agregada por fecha/turno,
- entregar catalogos para filtros del frontend.

Piezas principales:

- `src/server.js`: servidor Express y rutas `/api`.
- `src/csvImporter.js`: parseo del CSV e insercion/upsert en base.
- `src/services/lknImporter.js`: importacion desde `lkn_soft.produccion_horaria` hacia `produccion_hora`.
- `src/services/lknAutoSync.js`: scheduler backend para actualizar automaticamente desde LKN.
- `src/productionService.js`: armado de dashboard, turnos y catalogos.
- `database/init.sql`: crea esquema, tablas y turnos base.

### 2. Frontend

Ubicacion: `frontend/`

Responsabilidades:

- mostrar el tablero diario,
- permitir importar CSV,
- navegar entre vistas de produccion, historial y detalle,
- exportar los datos visibles a CSV.

Piezas principales:

- `src/main.jsx`: aplicacion principal, fetch de API y vistas.
- `src/styles.css`: layout y estilos del dashboard.

### 3. Base de datos

Motor esperado: MySQL

Tablas base:

- `celda`
- `pieza`
- `articulo_final`
- `pieza_articulo_final`
- `celda_pieza_articulo_final`
- `maquina_pieza_mapeo`
- `turno`
- `produccion_hora`

Relaciones funcionales:

- una fila de `produccion_hora` representa una cantidad producida en una fecha, turno, tramo horario, celda y pieza;
- `celda` y `pieza` actuan como catalogos normalizados;
- `articulo_final` guarda el codigo y la descripcion del articulo terminado;
- `pieza_articulo_final` modela la relacion muchos-a-muchos entre componente y articulo final;
- `celda_pieza_articulo_final` modela el mapeo operativo entre una pieza productiva concreta en una celda y su articulo final visible en reportes;
- `maquina_pieza_mapeo` traduce `lkn_soft.produccion_horaria.maquina` a `celda + pieza` con vigencia por fecha, permitiendo que una maquina cambie de pieza sin modificar la lectura historica;
- `turno` define las franjas T1, T2 y T3.

## Flujo de datos

### Importacion

1. El usuario dispara `POST /api/import`.
2. El backend toma `CSV_PATH` desde entorno o `csvPath` desde el body.
3. Si el nombre del archivo contiene el marcador `_ayer`, la fecha de produccion se resuelve automaticamente como el dia calendario anterior a la importacion, independientemente de la fecha visible en pantalla.
4. `csvImporter.js` parsea filas y separa bloques horarios por turno.
5. Se realiza upsert de catalogos (`celda`, `pieza`) y de `produccion_hora`.

### Sincronizacion en tiempo real

1. El backend lee `lkn_soft.produccion_horaria` como fuente viva del dia actual.
2. `POST /api/live-sync` y el scheduler LKN ejecutan el mismo importador hacia `produccion_hora`.
3. La traduccion `maquina -> celda + pieza` se resuelve primero por `maquina_pieza_mapeo` vigente para la `fecha_operativa`; si no existe mapeo, el parseo automatico queda como fallback.
4. Para el dia actual, la sincronizacion viva no importa franjas horarias futuras.
5. Si hay una sincronizacion en curso, el backend reutiliza el resultado en vuelo para evitar escrituras concurrentes innecesarias.

El frontend puede refrescar automaticamente el Dashboard del dia actual leyendo `/api/dashboard` cada 10 segundos. Ese refresco visual no escribe en base; la escritura automatica queda a cargo del scheduler backend LKN o del endpoint de sincronizacion que corresponda.

### Importacion de articulos finales

1. El usuario dispara `POST /api/import-articulos`.
2. El backend toma `ARTICLES_XLSX_PATH` desde entorno o `xlsxPath` desde el body.
3. Se parsea la primera hoja del Excel como fuente canonica de articulos y componentes.
4. Se reconstruyen `articulo_final` y `pieza_articulo_final`.
5. Si un componente del Excel todavia no existe en `pieza`, se crea para mantener completo el catalogo relacional.

### Consulta

1. El frontend solicita una fecha.
2. `GET /api/dashboard` devuelve matriz diaria y resumenes.
3. Si la fecha consultada es el dia operativo actual, el backend oculta y excluye de los totales las franjas horarias futuras.
4. `GET /api/turno` devuelve detalle de un turno puntual.
5. `GET /api/catalogos` devuelve listas para filtros y detalle.

## Contratos actuales

### Endpoints

- `GET /api/health`
- `POST /api/import`
- `POST /api/import-articulos`
- `POST /api/live-sync`
- `POST /api/import-lkn`
- `GET /api/lkn-mappings`
- `POST /api/lkn-mappings`
- `POST /api/lkn-mappings/seed`
- `GET /api/lkn-sync/status`
- `POST /api/lkn-sync/run`
- `GET /api/dashboard?date=YYYY-MM-DD`
- `GET /api/turno?date=YYYY-MM-DD&shiftId=1|2|3`
- `GET /api/catalogos?date=YYYY-MM-DD`

### Turnos

- `T1`: 06:00 a 14:00
- `T2`: 14:00 a 22:00
- `T3`: 22:00 a 06:00

### Estados visuales del dashboard

Segun los umbrales actuales:

- `high`: produccion >= 20
- `medium`: produccion >= 15
- `low`: produccion > 0
- `empty`: produccion = 0

## Variables de entorno relevantes

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `CSV_PATH`
- `ARTICLES_XLSX_PATH`
- `APP_TIME_ZONE` opcional; por defecto `America/Argentina/Buenos_Aires`
- `LKN_DB_NAME` opcional; por defecto `lkn_soft`
- `LKN_AUTO_SYNC_ENABLED` opcional; por defecto `false`
- `LKN_SYNC_SECONDS` opcional; por defecto `15`
- `PORT` opcional para backend
- `VITE_API_BASE_URL` opcional para frontend
- `VITE_AUTO_DASHBOARD_REFRESH` opcional para frontend; por defecto `true`

No documentar secretos reales en este archivo. Solo nombres y funcion.

## Estructura resumida

```text
FP_Soldadura/
|-- backend/
|   |-- database/init.sql
|   `-- src/
|       |-- server.js
|       |-- csvImporter.js
|       `-- productionService.js
|-- frontend/
|   `-- src/
|       |-- main.jsx
|       `-- styles.css
|-- docs/
|   |-- CONTEXTO_PROYECTO.md
|   |-- INDICE_DOCUMENTACION.md
|   |-- CHANGELOG.md
|   `-- DEPLOY_LOG.md
|-- logs/
|-- README.md
|-- AGENTS.md
`-- .env
```

## Riesgos tecnicos actuales

- La logica del frontend esta concentrada en `frontend/src/main.jsx`; si crece, conviene separar componentes y hooks.
- El backend crea el acceso a base de forma simple; si aumenta el trafico o la cantidad de consultas, conviene revisar reutilizacion del pool y manejo de errores.
- El formato CSV es parte del contrato real del sistema; cualquier cambio en columnas o indices debe tratarse como cambio de integracion.
- La tabla LKN se actualiza por PLC/Node-RED; por eso la sincronizacion automatica debe conservar control de concurrencia, omitir horas futuras y mantener trazabilidad de mapeos por vigencia.
- La relacion componente -> articulo final no es uno a uno en todos los casos; cualquier vista que muestre "Articulo final" debe contemplar multiples coincidencias.
- La produccion historica actual mezcla nombres operativos y codigos tecnicos en `pieza.descripcion`; por eso el backend resuelve articulos finales priorizando `celda_pieza_articulo_final` y usa `pieza_articulo_final` solo como fallback por componente.
- El Excel de celdas no lista todas las operaciones intermedias: en general representa la ultima operacion/subproceso que entrega el articulo final. Las operaciones productivas previas que no aparecen en el Excel se heredan al mismo articulo final mediante reglas operativas por `celda + pieza`.

## Criterio de mantenimiento de documentacion

Actualizar este archivo cuando cambie al menos uno de estos puntos:

- arquitectura general,
- endpoints disponibles,
- esquema de base,
- formato de importacion,
- flujo operativo entre frontend, backend y base.

## Tecnica recomendada para mantener la documentacion

La tecnica adoptada por este proyecto es documentacion por disparadores:

- no esperar a "tener tiempo para documentar";
- documentar en el mismo cambio que modifica el contrato o el comportamiento;
- usar cada archivo `.md` para un tipo de cambio bien definido.

Mapa de disparadores:

- cambio en instalacion, comandos o arranque local: `README.md`
- cambio en arquitectura, endpoints, esquema, importacion o flujo: `docs/CONTEXTO_PROYECTO.md`
- cambio funcional visible o cambio de contrato: `docs/CHANGELOG.md`
- cambio aplicado o listo para aplicar en uso operativo: `docs/DEPLOY_LOG.md`

Regla de cierre:

- un cambio de contrato no se considera terminado hasta que su documentacion quede actualizada en el mismo commit o en la misma tanda de trabajo.
