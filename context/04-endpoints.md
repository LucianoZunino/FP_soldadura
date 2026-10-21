# API HTTP

Base local por defecto: `http://localhost:3001`. En frontend se configura con `VITE_API_BASE`.

La API usa JSON y actualmente no implementa autenticacion. Los errores de los handlers se devuelven como HTTP 500 con `{ "error": "..." }`; no existe todavia una clasificacion 4xx/5xx.

## Salud y estado

### `GET /api/health`

Devuelve `ok`, fecha calendario del backend y `operationalDate`.

### `GET /api/live-sync/status`

Devuelve la fuente seleccionada y los estados de los schedulers CSV y LKN. Para Produccion se espera:

- `source: "lkn"`;
- `lkn.enabled: true`;
- `lkn.started: true`;
- `lkn.lastError: null`.

### `GET /api/lkn-sync/status`

Devuelve solo el estado del scheduler LKN: intervalo, ejecucion en curso, ultimo resultado y ultimo error.

## Lectura

### `GET /api/dashboard?fecha=YYYY-MM-DD`

Devuelve la matriz diaria agregada y sus resumenes. Consulta `produccion_hora.fecha_modificada`.
Cada fila incluye `standardPiecesPerHour: 24`, estandar fijo vigente para todas las piezas.

### `GET /api/resumen-general/excel?fecha=YYYY-MM-DD`

Genera un archivo XLSX con una fila por combinacion celda/pieza y estas columnas exactas:

- `PIEZA_NUMERO`: nombre de celda o maquina visible.
- `DESCRIPCION`: descripcion de la pieza.
- `PROD_T1`, `PROD_T2`, `PROD_T3`: total de cada turno.
- `produccion_actual`: suma diaria de los tres turnos.

La respuesta usa el MIME de Excel, nombre `resumen_general_<fecha>.xlsx`, autofiltro y valores numericos. Los datos provienen del mismo `getDashboard(fecha)` que alimenta la pantalla, incluyendo ocultamiento de horas futuras.

### `GET /api/turno?fecha=YYYY-MM-DD&turno=1|2|3`

Devuelve el detalle del turno solicitado para la fecha operativa.

### `GET /api/catalogos`

Devuelve catalogos utilizados por filtros y vistas.

### `GET /api/lkn-mappings?maquina=NOMBRE`

Lista mapeos. `maquina` es opcional.

## Escritura y sincronizacion

### `POST /api/live-sync`

Ejecuta la fuente configurada. Cuerpo opcional:

```json
{
  "fecha": "2026-10-15",
  "replaceDate": true,
  "skipFutureHours": true,
  "force": true
}
```

Con `SYNC_SOURCE=lkn`, `force` no cambia el comportamiento del importador LKN.

### `POST /api/import-lkn`

Importa LKN directamente. Acepta `fecha`, `replaceDate` y `skipFutureHours` por body o query. Si la fuente esta vacia, responde `skipped=true`, `reason=empty-source` y `preservedExistingData=true` sin borrar el destino.

### `POST /api/lkn-sync/run`

Ejecuta el scheduler LKN manualmente y actualiza su estado en memoria. Usa el mismo contrato de opciones que `/api/import-lkn`.

### `POST /api/import`

- Para el dia operativo actual y sin `csvPath`, delega en la fuente viva configurada.
- Para una fecha historica o con `csvPath`, ejecuta el importador CSV.

Ejemplo historico:

```json
{
  "fecha": "2026-10-14",
  "csvPath": "ruta-configurada-por-el-operador"
}
```

### `POST /api/import-articulos`

Importa relaciones desde el Excel configurado o desde `xlsxPath` enviado explicitamente.

### `POST /api/lkn-mappings/seed`

Genera mapeos iniciales a partir de nombres de maquina. Acepta `fecha` y `fechaDesde`. Es una operacion de preparacion, no un reemplazo para revisar cambios reales de celda o pieza.

### `POST /api/lkn-mappings`

Crea o actualiza un mapeo temporal.

```json
{
  "maquina": "CELDA_1_DASH_OP10",
  "celda": "CELDA_1",
  "pieza": "DASH OP10",
  "fechaDesde": "2026-10-15",
  "fechaHasta": null,
  "prioridad": 100,
  "fuente": "manual",
  "notas": "Cambio operativo aprobado",
  "closePrevious": true
}
```

`maquina`, `celda` y `pieza` son obligatorios. Por defecto se cierra el mapeo anterior el dia previo a `fechaDesde`.

## Evidencia

- `backend/src/server.js`
- `backend/src/services/lknImporter.js`
- `backend/src/services/productionService.js`
- `backend/src/services/summaryExportService.js`
