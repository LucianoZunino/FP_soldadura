# Runbook - Recuperacion LKN

## Sintomas

- `/api/live-sync/status` muestra `lastError`.
- `/api/lkn-health` informa `warning` o `critical`.
- `lastResult.sourceRows` es cero o no cambia.
- Los timestamps de `lkn_soft.produccion_horaria` dejan de avanzar.
- El Dashboard conserva un snapshot sin incorporar nuevos bloques.

## Regla de seguridad

Una fuente vacia no autoriza borrar `produccion_hora`. El importador corregido responde:

```json
{
  "skipped": true,
  "reason": "empty-source",
  "preservedExistingData": true
}
```

Si el backend desplegado no devuelve ese contrato, no ejecutar reemplazos repetidos hasta actualizarlo.

## Diagnostico

1. Confirmar modo y `DB_NAME` efectivo.
2. Consultar `GET /api/health`, `GET /api/live-sync/status` y `GET /api/lkn-health`.
3. Verificar `source=lkn`, scheduler habilitado/iniciado y fecha operativa esperada.
4. Contar filas y maquinas de staging para esa fecha.
5. Revisar mapeos vigentes para maquinas nuevas o trasladadas.
6. Revisar Node-RED si staging esta vacio o atrasado.

## Recuperacion

### Staging disponible

Ejecutar una sincronizacion controlada:

```http
POST /api/lkn-sync/run
Content-Type: application/json

{"fecha":"YYYY-MM-DD","replaceDate":true,"skipFutureHours":true}
```

Aceptar el resultado solo si no hay `failures`, `skipped=false` y los conteos son coherentes.

### Mapeo faltante

Crear una nueva vigencia mediante `POST /api/lkn-mappings`; no modificar el destino historico existente. Repetir la importacion despues de revisar el cierre del mapeo anterior.

### Fuente vacia

No forzar CSV sobre el dia actual sin decision operativa. Recuperar primero Node-RED/LKN. Si se aprueba fallback, deshabilitar el escritor LKN antes de habilitar CSV para evitar competencia.

### Hueco historico

1. Identificar una fuente cerrada y confiable.
2. Respaldar las fechas destino.
3. Importar una fecha por vez.
4. Contrastar filas, total y bloques por maquina.
5. Registrar archivo, checksum, conteos y resultado en `docs/DEPLOY_LOG.md`.

## Cierre

- Staging avanza para 62 maquinas esperadas o se documentan excepciones.
- El scheduler queda sin `lastError`.
- No existen horas futuras persistidas en la base local.
- Un bloque cerrado coincide con la fuente de control.
- El verificador `scripts/verify-web-deployment.js` devuelve `ok=true`.
- La causa y la recuperacion quedan registradas.
