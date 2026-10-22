# Runbook - Node-RED Soldadura

## Objetivo

Diagnosticar y operar las 15 ramas que adquieren produccion horaria desde PLC y escriben en `lkn_soft.produccion_horaria`.

## Chequeo rapido

1. Confirmar modo Test o Produccion.
2. Consultar el estado del flujo y contar 15 funciones de transformacion.
3. Confirmar que las tablas destino corresponden al modo.
4. Revisar que las 62 maquinas tengan filas recientes para la fecha operativa.
5. Comparar un bucket cerrado, no el bucket activo, contra CSV o reporte de control.

## Reglas vigentes

- Buckets futuros: no se escriben.
- Cero: puede corregir durante el bloque y hasta 10 minutos despues.
- Cero tardio sobre positivo: conserva el positivo para evitar un borrado por reinicio.
- CELDA_7 `00-01`: usa `HORA[0]`.
- El endpoint global de CELDA_7 debe declarar cinco tags `HORA[0]` y cinco `HORA[24]`; Test y Produccion comparten ese unico endpoint.
- Resto: conserva el indice de medianoche de su rama; no aplicar cambios globales sin evidencia PLC.

## Dry-run

Definir `NODE_RED_BASE_URL` en la sesion. La direccion interna no se registra en Git.

```powershell
node scripts\deploy-node-red-all-machines-test.js
node scripts\deploy-node-red-all-machines-production.js
```

Revisar:

- 15 ramas detectadas;
- SHA actual y objetivo;
- indices de medianoche;
- un solo endpoint global de CELDA_7, sin configuraciones duplicadas;
- ausencia de tablas productivas en Test;
- reglas de futuro y ventana de cero.

## Despliegue productivo

Usar solamente con autorizacion explicita de Produccion:

```powershell
node scripts\deploy-node-red-all-machines-production.js --deploy --confirm-production
```

El script crea un JSON en `backups/node-red/`, verifica la huella posterior y revierte automaticamente si no coincide.

## Validacion posterior

1. Repetir el dry-run; debe informar `operation=no-op`.
2. Confirmar exactamente un endpoint `d106bad673723722`, sin `z`, y ausencia de `test_all_celda7_endpoint_v3`.
3. Confirmar que staging sigue actualizando y no aparecen buckets futuros.
4. Consultar `/api/live-sync/status` despues de al menos un ciclo backend; CELDA_7 debe sumar cinco maquinas y sus filas horarias.
5. Comparar todos los bloques cerrados disponibles contra CSV.
6. En el siguiente cruce, validar especialmente CELDA_7 `00-01`.

## Rollback

```powershell
node scripts\deploy-node-red-all-machines-production.js --rollback RUTA_AL_BACKUP.json --confirm-production
```

Despues del rollback verificar SHA, escritura de staging y un bloque cerrado. No borrar el backup usado.

## Diagnostico de desconexion

- Un PLC que responde por red no garantiza que la sesion Ethernet/IP de Node-RED este sana.
- Revisar transiciones en `lkn_soft.plc_estado_diagnostico_test` cuando el monitor Test este activo.
- El modo de lectura puede emitir solo ante cambios de tags; ausencia de mensajes no es por si sola prueba de desconexion.
- Si se reinicia Node-RED, controlar que las 15 ramas vuelvan online y que los timestamps de staging avancen.

## Evidencia del despliegue vigente

- Flujo productivo: `tab_prod_soldadura_24h` en el servidor Node-RED operativo.
- SHA previo: `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac`.
- SHA promovido: `a5f4eb404466f39bf79aaa9b74fb0c80c5516758d449f979cd509217221f1a35`.
- Endpoint CELDA_7: unico, global, cinco `HORA[0]` y cinco `HORA[24]`.
- Respaldo integral mas reciente: `backups/node-red/2026-10-22T08-55-20-production-flow-before-celda7-endpoint-fix.json`.
- SHA-256 del respaldo: `e3bfabd32316b7592f2c345a4a67e26da08df63c9a078dd3ebe26640711b11ec`.
