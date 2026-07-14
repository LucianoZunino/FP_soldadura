# CHANGELOG - FP_Soldadura

## 2026-07-13

- Se corrige la convivencia entre `POST /api/import` y `POST /api/live-sync` para la fecha actual: el modo vivo deja de pisar una importacion manual si `LIVE_CSV_PATH` tiene una fecha de modificacion anterior al archivo importado manualmente.
- La respuesta de importacion ahora incluye metadatos de frescura del archivo fuente (`sourceMtime`, `sourceMtimeMs`, `sourceSizeBytes`) para diagnosticar por que una fuente reemplaza o no reemplaza a otra.
- Se optimiza la importacion CSV con upserts por lote para que `POST /api/live-sync` pueda completar dentro de la ventana de refresco configurada.
- El modo vivo toma varias muestras del CSV y preserva valores positivos existentes cuando una lectura transitoria trae cero, evitando que la pantalla retroceda mientras el archivo compartido se esta actualizando.
- El boton principal del Dashboard usa `POST /api/live-sync` cuando la fecha seleccionada es el dia actual, evitando que intente leer el `CSV_PATH` historico `_ayer`.
- `POST /api/import` tambien redirige internamente a la sincronizacion viva cuando se pide la fecha actual sin `csvPath` explicito, para cubrir navegadores con bundle viejo o llamados externos.

## 2026-07-02

- Se agrega sincronizacion automatica del Dashboard contra el CSV vivo del dia actual configurado en `LIVE_CSV_PATH`.
- Se incorpora el endpoint `POST /api/live-sync`, con lectura estable del archivo, upsert de valores actuales y proteccion contra sincronizaciones concurrentes o demasiado frecuentes.
- El Dashboard principal dispara la sincronizacion al abrir y luego cada 10 segundos solo cuando muestra la fecha actual; las consultas historicas no son pisadas por el modo vivo.
- Se agregan las variables `LIVE_CSV_PATH` y `LIVE_REFRESH_SECONDS` a la configuracion documentada.

## 2026-06-25

- Se agrega la base de documentacion operativa del proyecto: `AGENTS.md` en raiz y `CONTEXTO_PROYECTO.md`, `INDICE_DOCUMENTACION.md`, `CHANGELOG.md`, `DEPLOY_LOG.md` como set de contexto del repo.
- `README.md` deja de ser un placeholder minimo y pasa a enlazar la documentacion principal, el flujo de arranque y las notas operativas.
- Se formaliza la tecnica de "documentacion por disparadores" como regla del repo: cada tipo de cambio queda asociado al `.md` que debe actualizarse y ningun cambio de contrato se considera cerrado sin documentacion sincronizada.
- Se ordena la raiz del proyecto moviendo la documentacion operativa a `docs/` y los logs de desarrollo a `logs/`, dejando en la carpeta principal solo archivos de entrada y configuracion.
- Se agrega soporte para relacionar componentes con articulos finales desde Excel mediante un modelo muchos-a-muchos (`articulo_final`, `pieza_articulo_final`), endpoint `POST /api/import-articulos` y nueva columna agregada en los reportes del frontend. El criterio de vinculacion queda definido por codigo de componente, no por descripcion.
- La importacion reconoce el marcador `_ayer` en el nombre del CSV y asigna los datos al dia calendario anterior. El frontend cambia automaticamente a la fecha efectivamente importada.
- Los selectores de fecha de Dashboard e Historial mantienen una fecha en edicion y solo actualizan la consulta al presionar `Consultar`, evitando recargas parciales mientras se modifica el calendario.

## Criterio de uso

- Registrar aca cambios funcionales, de contrato, de integracion o de comportamiento visible.
- No usar este archivo para ruido de formato, renombres menores o cambios internos sin impacto.
- Si un cambio llega a entorno real, reflejarlo tambien en `DEPLOY_LOG.md`.
