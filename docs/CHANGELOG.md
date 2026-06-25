# CHANGELOG - FP_Soldadura

## 2026-06-25

- Se agrega la base de documentacion operativa del proyecto: `AGENTS.md` en raiz y `CONTEXTO_PROYECTO.md`, `INDICE_DOCUMENTACION.md`, `CHANGELOG.md`, `DEPLOY_LOG.md` como set de contexto del repo.
- `README.md` deja de ser un placeholder minimo y pasa a enlazar la documentacion principal, el flujo de arranque y las notas operativas.
- Se formaliza la tecnica de "documentacion por disparadores" como regla del repo: cada tipo de cambio queda asociado al `.md` que debe actualizarse y ningun cambio de contrato se considera cerrado sin documentacion sincronizada.
- Se ordena la raiz del proyecto moviendo la documentacion operativa a `docs/` y los logs de desarrollo a `logs/`, dejando en la carpeta principal solo archivos de entrada y configuracion.
- Se agrega soporte para relacionar componentes con articulos finales desde Excel mediante un modelo muchos-a-muchos (`articulo_final`, `pieza_articulo_final`), endpoint `POST /api/import-articulos` y nueva columna agregada en los reportes del frontend. El criterio de vinculacion queda definido por codigo de componente, no por descripcion.

## Criterio de uso

- Registrar aca cambios funcionales, de contrato, de integracion o de comportamiento visible.
- No usar este archivo para ruido de formato, renombres menores o cambios internos sin impacto.
- Si un cambio llega a entorno real, reflejarlo tambien en `DEPLOY_LOG.md`.
