# Contexto tecnico - FP_Soldadura

> Contrato tecnico vigente del sistema de produccion horaria de soldadura.

Ultima revision: 2026-10-15. Node-RED productivo incorpora filtro de horas futuras, correccion temporal de ceros y la excepcion de medianoche de CELDA_7; el importador protege el destino cuando LKN no devuelve filas.

## Mapa

1. [Arquitectura](./01-arquitectura.md) - componentes, limites y flujo de extremo a extremo.
2. [Datos](./02-datos.md) - fuentes de verdad, tablas, claves y fechas.
3. [Servicios](./03-servicios.md) - responsabilidades e invariantes.
4. [API](./04-endpoints.md) - contratos HTTP reales.
5. [Decisiones tecnicas](./05-decisiones-tecnicas.md) - razones y trade-offs vigentes.
6. [Migraciones](./06-migraciones.md) - evolucion, orden y rollback.
7. [Limitaciones](./07-limitaciones.md) - riesgos confirmados y workaround.
8. [Frontend](./08-frontend.md) - vistas, estado y refresco.

## Operacion e historial

- [Despliegue y rollback](../DEPLOY.md).
- [Runbook Node-RED](../docs/runbooks/node-red-soldadura.md).
- [Runbook de fuente LKN](../docs/runbooks/recuperacion-lkn.md).
- [Changelog oficial](../docs/CHANGELOG.md).
- [Registro de despliegues](../docs/DEPLOY_LOG.md).
- [Backlog](../BACKLOG.md).
- [Analisis historico LKN](../docs/ANALISIS_LKN_PRODUCCION_HORARIA.md).

## Regla de actualizacion

El codigo es la evidencia final. Si codigo y contexto difieren, verificar implementacion y entorno, corregir el documento aplicable en el mismo cambio y registrar la validacion. No copiar secretos ni accesos internos en esta carpeta.
