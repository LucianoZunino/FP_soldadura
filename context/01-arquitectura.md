# Arquitectura

## Alcance

FP_Soldadura transforma contadores horarios industriales en una matriz operativa por fecha, turno, celda y pieza. El frontend no consulta PLC, Node-RED ni LKN directamente.

## Componentes

```text
PLC
  -> Node-RED / Ethernet-IP
  -> lkn_soft.produccion_horaria
  -> scheduler LKN del backend
  -> DB propia / produccion_hora
  -> API Express
  -> frontend React
```

Fuentes auxiliares:

```text
CSV historico/manual -> csvImporter -> DB propia
Excel de articulos   -> articleRelationImporter -> catalogos y relaciones
```

## Limites

- **PLC y Node-RED:** adquieren contadores y determinan el bucket horario de origen.
- **LKN:** staging operativo externo; no es contrato directo del frontend.
- **Backend:** valida fechas, mapea maquinas, copia a modelo local y expone API.
- **DB propia:** frontera estable para consultas y relaciones de negocio.
- **Frontend:** solo presenta, filtra, refresca y exporta respuestas HTTP.

## Flujo vivo

1. Cada rama Node-RED lee un PLC aproximadamente cada 15 segundos.
2. Solo se persisten bloques iniciados; un bloque futuro no se escribe.
3. Un cero puede corregir un positivo durante el bloque y hasta 10 minutos despues de su cierre. Luego se protege el historico ante reinicios tardios.
4. CELDA_7 usa `HORA[0]` para `00-01`; otras ramas conservan el indice definido por su PLC.
5. El backend sincroniza LKN cada `LKN_SYNC_SECONDS`.
6. El importador resuelve `maquina -> celda + pieza`, descarta horas futuras y reemplaza el dia local en una transaccion.
7. Si LKN devuelve cero filas, no abre la transaccion de reemplazo y conserva el snapshot existente.
8. El frontend consulta `/api/dashboard` y, para el dia operativo actual, refresca cada 10 segundos si esta habilitado.

## Dia operativo

- Zona horaria de aplicacion: `APP_TIME_ZONE`, por defecto `America/Argentina/Buenos_Aires`.
- Entre `00:00` y `05:59`, el dia operativo sigue siendo el calendario anterior.
- LKN ya entrega `fecha_operativa` con ese criterio. El backend no debe restar un segundo dia.

## Entornos

- **Test:** base propia de prueba y tablas Node-RED terminadas en `_test`.
- **Produccion:** base operativa y `lkn_soft.produccion_horaria`.
- `backend/.env` tiene prioridad sobre `.env`; debe revisarse antes de ejecutar comandos.

## Testing y observabilidad

- Pruebas backend: `npm --prefix backend test`.
- Build frontend: `npm run frontend:build`.
- Estado del scheduler: `GET /api/live-sync/status`.
- Node-RED Test registra transiciones Ethernet/IP en `plc_estado_diagnostico_test`.
- Despliegues Node-RED usan SHA-256, respaldo previo y verificacion posterior.

## Evidencia

- `backend/src/server.js`
- `backend/src/services/lknImporter.js`
- `backend/src/services/lknAutoSync.js`
- `backend/src/services/productionService.js`
- `frontend/src/main.jsx`
- `scripts/deploy-node-red-all-machines-production.js`
