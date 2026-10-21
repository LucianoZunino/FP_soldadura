# Datos

## Fuentes de verdad

| Tema | Fuente |
|---|---|
| Contador PLC por hora | PLC, adquirido por Node-RED |
| Staging horario vivo | `lkn_soft.produccion_horaria` |
| Consulta estable del dashboard | `produccion_hora` en la DB propia |
| Maquina hacia celda/pieza | `maquina_pieza_mapeo` |
| Turnos | `turno` y `backend/src/constants/production.js` |
| Articulos finales | Excel importado a `articulo_final` y tablas de relacion |
| Estandar horario visible | Constante `STANDARD_PIECES_PER_HOUR` del backend |
| CSV historico/manual | Archivo configurado en `CSV_PATH` |

## Modelo local

### `celda`

Catalogo unico por `nombre`.

### `pieza`

Catalogo unico por `descripcion`.

### `turno`

- T1: `06:00-14:00`.
- T2: `14:00-22:00`.
- T3: `22:00-06:00`.

### `produccion_hora`

- PK: `id_produccion`.
- Clave de negocio: `fecha + id_turno + hora_desde + id_celda + id_pieza`.
- `fecha`: fecha recibida de la fuente.
- `fecha_modificada`: fecha operativa usada por consultas.
- `cantidad`: entero no negativo esperado; la fuente puede informar cero.
- `fecha_actualizacion`: auditoria de ultima escritura.
- Indices principales por fecha, fecha operativa, turno, celda y pieza.

### `maquina_pieza_mapeo`

Resuelve una maquina LKN a una combinacion local con vigencia temporal:

- `fecha_desde` inclusiva.
- `fecha_hasta` inclusiva o `NULL`.
- `activo`, `prioridad`, `fuente` y `notas` permiten controlar resolucion.
- Al crear un nuevo mapeo, el servicio cierra el anterior por defecto.

### Articulos finales

- `articulo_final`: codigo, descripcion y atributos auxiliares.
- `pieza_articulo_final`: relacion general componente-articulo.
- `celda_pieza_articulo_final`: relacion operativa prioritaria por celda y pieza.

El dashboard prioriza la relacion operativa y usa la relacion general como fallback. Sin relacion muestra `SUBPROCESO`.

## Estandar horario

El estandar vigente es global: `24` piezas por hora para todas las combinaciones celda/pieza. No proviene de `articulo_final.modulacion` ni modifica datos historicos; el backend lo agrega a cada fila del dashboard como `standardPiecesPerHour`.

## Staging LKN

Campos consumidos de `lkn_soft.produccion_horaria`:

- `fecha_operativa`, `maquina`, `hora_desde`, `hora_hasta`, `turno`.
- `cantidad`, `fecha_hora_desde`, `ultima_lectura`, `actualizado_en`.

La clave externa esperada representa una maquina y un bucket dentro de la fecha operativa. Node-RED realiza upsert idempotente.

## Reglas de consistencia

- `fecha_operativa` LKN se copia a `fecha_modificada`.
- Un positivo cuya `ultima_lectura` es anterior al inicio del bucket se neutraliza a cero.
- Las horas futuras no se importan al modelo local.
- Una fuente LKN vacia no borra el destino.
- Fallas de mapeo bloquean la importacion completa del dia.
- Ausencia de fila en staging Test se interpreta visualmente como cero, pero no prueba una lectura explicita del PLC.

## CSV

El contrato actual contiene una fila por celda/pieza y 24 valores horarios distribuidos por turno. Los indices exactos estan versionados en `backend/src/constants/production.js`; no deben duplicarse en integraciones nuevas.

## Retencion y datos sensibles

No hay una politica automatica de retencion versionada. Los datos son operativos industriales; los respaldos y exports no se versionan. Las credenciales pertenecen al entorno, nunca a SQL, codigo o documentacion.

## Evidencia

- `backend/database/init.sql`
- `backend/src/database/initDb.js`
- `backend/src/services/lknImporter.js`
- `backend/src/services/csvImporter.js`
- `backend/src/services/productionService.js`
