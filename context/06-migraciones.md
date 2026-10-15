# Migraciones

## Esquema local

El esquema base esta en `backend/database/init.sql`. `backend/src/database/initDb.js` crea la DB seleccionada por `DB_NAME`, ejecuta el DDL idempotente y aplica compatibilidad para `produccion_hora.fecha_modificada` e indice asociado.

Antes de ejecutar:

1. Confirmar modo Test o Produccion.
2. Revisar `.env` y `backend/.env`; el segundo sobrescribe al primero.
3. Confirmar `DB_NAME` de forma explicita.
4. Generar respaldo si la operacion afecta datos existentes.

Comando:

```powershell
npm run db:init
```

El DDL usa `CREATE TABLE IF NOT EXISTS`, `ON DUPLICATE KEY UPDATE` e inspeccion de `information_schema`. Una migracion futura no debe asumir que la instalacion parte de cero.

## Evolucion relevante

### Fecha operativa

Se incorporo `produccion_hora.fecha_modificada` para consultar el Turno 3 bajo un unico dia operativo. La regla vigente para LKN es copiar `fecha_operativa` sin aplicar otra resta.

### Mapeos temporales

Se incorporo `maquina_pieza_mapeo` para evitar reinterpretar historicos cuando una maquina cambia de pieza o celda. Los mapeos nuevos deben comenzar en `fecha_desde` y cerrar el anterior.

### Articulos finales

Se separaron relaciones genericas de pieza y relaciones operativas por celda/pieza. La segunda tiene precedencia.

### Correcciones Node-RED

El 2026-10-15 se promovieron a las 15 ramas productivas:

- filtro de buckets futuros;
- correccion de cero con ventana de 10 minutos;
- indice `[0]` para medianoche de CELDA_7.

No existe migracion de datos historicos implicita: los huecos o errores previos requieren una fuente confiable y una operacion de backfill separada.

## Rollback

- Esquema: restaurar respaldo de DB o aplicar una migracion compensatoria revisada. No eliminar columnas automaticamente.
- Importacion: restaurar el snapshot de `produccion_hora` correspondiente a las fechas afectadas.
- Node-RED: usar el respaldo JSON y comando de rollback documentado en `DEPLOY.md`.
- Aplicacion: volver al commit estable y reiniciar backend/frontend; verificar la fuente activa antes de reanudar sincronizacion.

## Evidencia

- `backend/database/init.sql`
- `backend/src/database/initDb.js`
- `docs/DEPLOY_LOG.md`
- `docs/runbooks/node-red-soldadura.md`
