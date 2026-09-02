# ANALISIS - lkn_soft.produccion_horaria

## Objetivo

Dejar documentado el relevamiento hecho sobre la tabla `lkn_soft.produccion_horaria` como posible reemplazo de la lectura del CSV vivo actual.

Este archivo sirve como contexto para retomar la decisión técnica en otro chat o en otro momento sin tener que repetir la investigación.

## Pregunta de negocio / tecnica

Se evaluó si la tabla `lkn_soft.produccion_horaria` puede reemplazar el consumo actual de:

- `LIVE_CSV_PATH` para sincronización viva del día actual
- y eventualmente también la lógica de importación que hoy parte de un CSV

manteniendo las tablas actuales de la app:

- `celda`
- `pieza`
- `turno`
- `produccion_hora`
- y el resto del modelo relacional ya usado por el dashboard

## Estado actual del proyecto

Hoy `FP_Soldadura` funciona así:

```text
CSV historico / CSV vivo
        |
        v
backend/src/services/csvImporter.js
backend/src/services/liveCsvSync.js
        |
        v
MySQL local del proyecto
tabla produccion_hora
        |
        v
backend/src/services/productionService.js
        |
        v
frontend React
```

El frontend no conoce ni el CSV ni `lkn_soft`. Consume solamente la API del backend.

## Hallazgo principal

La tabla `lkn_soft.produccion_horaria` sí es una fuente válida de producción horaria de soldadura, y parece ser la fuente operativa más cercana al PLC/Node-RED.

No es un reemplazo directo 1:1 del modelo actual, pero sí es una buena candidata para reemplazar el CSV vivo si se agrega una capa de transformación hacia nuestras tablas.

## Evidencia relevada

### 1. Estructura de la tabla origen

Columnas observadas en `lkn_soft.produccion_horaria`:

- `id_produccion`
- `fecha_operativa`
- `maquina`
- `nombre_plc`
- `tag_origen`
- `bloque_hora`
- `fecha_hora_desde`
- `fecha_hora_hasta`
- `hora_desde`
- `hora_hasta`
- `turno`
- `cantidad`
- `ultima_lectura`
- `origen`
- `creado_en`
- `actualizado_en`

Conclusión:

- Tiene granularidad horaria compatible con el dashboard actual.
- La dimensión principal es `maquina`.
- No expone `celda` y `pieza` como columnas separadas.

### 2. Flujo origen confirmado en Node-RED

Se inspeccionó el flujo:

- `http://192.168.3.62:1880/#flow/tab_prod_soldadura_24h`

El tab relevado fue:

- `LKN PRODUCCION SOLDADURA 24H`

Descripción del flujo:

- Lee producción horaria de Soldadura SPOT/TUCKER/MIG por PLC Allen-Bradley
- Guarda datos en `produccion_horaria`

Esto confirma que la tabla no es una carga manual secundaria, sino parte del flujo operativo principal de adquisición.

### 3. Frecuencia de actualización

En Node-RED, cada rama PLC tiene un limitador con:

```js
const intervaloMs = 15 * 1000;
```

Interpretación:

- cada PLC/celda intenta pasar a SQL aproximadamente cada 15 segundos
- no necesariamente escribe siempre: solo inserta/upsertea cuando detecta cambios

Conclusión práctica:

- la tabla `lkn_soft.produccion_horaria` se alimenta en una cadencia operativa de aproximadamente 15 segundos por rama
- esto es suficiente para reemplazar el CSV vivo actual, que hoy se consulta cada 10 segundos desde la app

### 4. Regla operativa de turnos

En el flujo Node-RED se confirmó esta lógica:

- `MAÑANA` = 06:00 a 14:00
- `TARDE` = 14:00 a 22:00
- `NOCHE` = 22:00 a 06:00

Y la fecha operativa se calcula así:

- antes de las 06:00, el flujo resta un día
- o sea, la madrugada pertenece al día operativo anterior

Validacion directa del 2026-09-02:

- `fecha_operativa=2026-09-02, hora_desde=00:00` tiene
  `fecha_hora_desde=2026-09-03 00:00`;
- por lo tanto, `fecha_operativa` ya es la clave final del dashboard;
- leer tambien `fecha_operativa + 1` y restar un dia por segunda vez desplaza la
  madrugada valida y puede introducir buckets futuros del dia siguiente.

Esto es consistente con el modelo actual del proyecto.

### 5. Regla importante de protección contra ceros

En el `ON DUPLICATE KEY UPDATE` del flujo se observó esta lógica:

```sql
cantidad = CASE
    WHEN VALUES(cantidad) = 0 AND cantidad > 0 THEN cantidad
    ELSE VALUES(cantidad)
END
```

Interpretación:

- si una nueva lectura trae `0`, pero en la tabla ya había un valor positivo, no lo pisa
- esto protege contra lecturas transitorias en cero o escrituras incompletas

Esto es importante porque la app actual con CSV sí pisa con el valor nuevo, incluidos ceros.

Si se migra a `lkn_soft.produccion_horaria`, conviene decidir explícitamente si:

- se respeta esta semántica de negocio
- o si nuestra capa local seguirá permitiendo que un cero reemplace un positivo

### 6. Positivos residuales en buckets futuros

El 2026-08-13 se confirmo en el flujo activo que cada rama recorre las 24 posiciones
horarias del PLC en cada ciclo. Cuando cambia la fecha operativa o se reinicia el
flujo, las claves de contexto son nuevas y se pueden insertar valores residuales en
horas que todavia no comenzaron.

Luego, la proteccion contra ceros conserva esos positivos aunque el PLC entregue
cero cuando llega la hora real. Se verifico el caso `CELDA_6_GOR_SUP_RH_OP10` del
2026-08-07: los buckets 16:00-19:00 quedaron positivos con una ultima lectura de
aproximadamente las 09:03.

Como defensa parcial, FP_Soldadura convierte la cantidad positiva a `0` cuando
`ultima_lectura` es anterior a `fecha_hora_desde`. La fila se conserva para que la
combinacion de celda/pieza siga visible, pero el positivo anticipado no contribuya
a la produccion. La sincronizacion informa cuantas filas y unidades fueron
neutralizadas mediante `prematurePositiveRowsReset` y
`prematureQuantityDiscarded`.

Esta defensa evita importar buckets positivos que nunca fueron leidos dentro de su
propia franja, pero no puede reconstruir un cero que Node-RED ya descarto despues
de iniciada la hora si la fuente actualiza tambien la marca `ultima_lectura`.

La correccion definitiva debe hacerse en Node-RED:

- no persistir posiciones horarias futuras;
- permitir que el cero valido reemplace un positivo residual, idealmente con un
  debounce corto para lecturas transitorias;
- conservar una lectura cruda o una marca de validacion para poder auditar el valor
  finalmente recibido desde el PLC.

### 7. Repeticion entre conjuntos TUCKER

La validacion directa confirma que FP_Soldadura no replica una fila hacia varias
piezas. LKN entrega una fila independiente por conjunto y tag. Por ejemplo, para
`fecha_operativa=2026-08-31, hora_desde=17:00`, las seis maquinas TUCKER
(`E02` a `E07`) guardan cantidad `20` en seis tags distintos.

Como esas filas tienen una `ultima_lectura` posterior al comienzo del bucket, la
defensa contra positivos anticipados no puede distinguir cual conjunto estuvo
realmente activo. Resolver ese caso requiere que Node-RED/PLC entregue una marca de
conjunto activo o que deje en cero los tags de los conjuntos no trabajados. Elegir
una pieza por igualdad de cantidades en el importador eliminaria produccion valida
cuando varios componentes se trabajan realmente en combinacion.

## Compatibilidad con el modelo actual

## Cómo modela hoy la app

La app actual guarda producción en `produccion_hora` con estas dimensiones:

- `fecha`
- `id_turno`
- `hora_desde`
- `hora_hasta`
- `id_celda`
- `id_pieza`
- `cantidad`

El dashboard y las vistas del frontend consumen esa forma normalizada.

## Cómo modela la fuente `lkn_soft`

La tabla origen guarda:

- `fecha_operativa`
- `turno`
- `hora_desde`
- `hora_hasta`
- `maquina`
- `cantidad`

La dimensión `maquina` parece representar, en muchos casos, una combinación de:

- celda
- operación / pieza

## Coincidencias observadas

Ejemplos donde el mapeo es bastante directo:

- `CELDA_1_DASH_OP10` -> `CELDA_1` + `DASH OP10`
- `CELDA_2_OMEGA_OP10` -> `CELDA_2` + `OMEGA OP10`
- `CELDA_3_CAJA_DE_AGUA_OP10` -> `CELDA_3` + `CAJA DE AGUA OP10`
- `TUCKER_CAJA_DE_AGUA` -> `CELDA_TUCKER` + `CAJA DE AGUA`
- `TUCKER_TUNNEL` -> `CELDA_TUCKER` + `TUNNEL`

Conclusión:

- sí hay similitud real entre `maquina` y la combinación actual `celda + pieza`
- tu observación sobre "celda como tipo de máquina" aplica y es útil para el análisis

## Diferencias observadas

No todo coincide de forma textual directa.

Casos detectados:

- `SCHULER_3` en origen hoy equivale a `LINEA SCHULER` + `PRENSA 3`
- `VERSON_2_3` en origen hoy equivale a `LINEA VERSON` + `PRENSA 3`
- `MIG_2_GOR_*` no coincide textual con la celda actual `MIG_GOR`
- hay diferencias menores de formato:
  - underscores vs espacios
  - `OP10` vs `OP.10`
  - nombres compactados en origen y nombres operativos más legibles en la base local

Conclusión:

- no alcanza con parsear strings "a ojo"
- conviene una tabla de mapeo explícita

## Recomendación de arquitectura

## Recomendación principal

No consultar `lkn_soft.produccion_horaria` directamente desde el frontend.

Mantener la arquitectura actual basada en:

- una capa de persistencia local normalizada (`produccion_hora`)
- una API estable del backend
- y un frontend desacoplado de la fuente física

### Arquitectura recomendada

```text
lkn_soft.produccion_horaria
        |
        v
backend/src/services/dbImporter.js
        |
        v
tabla local produccion_hora
        |
        v
productionService.js
        |
        v
frontend actual
```

## Qué cambiaría

- reemplazar `liveCsvSync` por una sincronización desde base origen
- mantener `productionService.js` y la API actual
- mantener el frontend igual

## Qué no cambiaría

- el contrato actual de `/api/dashboard`
- el contrato actual de `/api/turno`
- la forma en que el frontend pinta la matriz horaria

Conclusión:

- no haría cambios de arquitectura en frontend para este reemplazo

## Complicaciones del cambio

### 1. Tabla de mapeo obligatoria

Hace falta una tabla local de equivalencias, por ejemplo:

- `maquina_origen`
- `celda_destino`
- `pieza_destino`
- `activo`
- `observaciones`

Sin esto, el cambio queda atado a heurísticas frágiles.

### 2. Diferencias entre fuente PLC y datos históricos locales

Durante el análisis apareció una diferencia entre sumas agregadas de una fecha consultada.

Eso no debe usarse como validación definitiva porque:

- se aclaró que lo cargado para `2026-07-07` en la base local era incorrecto y pertenecía a otro día

Conclusión:

- cualquier comparación histórica contra ese día queda descartada
- la validación correcta debe hacerse con nuevos días controlados

### 3. Semántica de ceros

La fuente Node-RED protege contra ceros que podrían borrar un valor ya positivo.

Hay que decidir si la tabla local:

- replica esa semántica
- o si sigue aceptando el último valor recibido, incluso si es cero

### 4. Dependencia de la base externa

Al pasar de CSV a `lkn_soft`, la app dependerá de:

- conectividad de red al host MySQL
- disponibilidad del schema `lkn_soft`
- estabilidad del flujo Node-RED que alimenta la tabla

Esto es más robusto que un archivo compartido, pero también requiere monitoreo.

### 5. Trazabilidad

Hoy el CSV es un artefacto visible y fácil de inspeccionar manualmente.

Si se reemplaza por base:

- conviene loguear resultados de sincronización
- y eventualmente guardar resúmenes o staging de la lectura para auditoría

## Estrategia recomendada de implementación

## Paso 1. Mantener el modelo local

No eliminar `produccion_hora`.

Seguir usándola como:

- capa estable de consumo del dashboard
- frontera de compatibilidad con el frontend
- almacenamiento normalizado de la app

## Paso 2. Crear tabla de mapeo

Ejemplo conceptual:

```text
maquina_mapeo
- maquina_origen
- celda_nombre
- pieza_descripcion
- activo
- notas
```

Esta tabla debe permitir mapear todas las máquinas de `lkn_soft.produccion_horaria` a nuestras entidades.

## Paso 3. Crear importador desde DB

Nuevo servicio sugerido:

- `backend/src/services/dbImporter.js`

Responsabilidad:

- leer `lkn_soft.produccion_horaria`
- traducir `turno` a `id_turno`
- resolver `maquina` a `celda` y `pieza`
- hacer upsert en `produccion_hora`

## Paso 4. Reemplazar solo el modo vivo

Primera etapa recomendada:

- mantener `POST /api/import` para histórico CSV si todavía sirve
- reemplazar `POST /api/live-sync` para que lea desde `lkn_soft` en vez del CSV vivo

Ventaja:

- menor riesgo
- menor superficie de cambio
- el frontend no se entera del reemplazo

## Paso 5. Dejar fallback temporal

Durante una etapa de transición, conviene poder volver temporalmente a:

- `LIVE_CSV_PATH`

si el acceso a `lkn_soft` falla o si todavía hay máquinas sin mapear.

## Decisión recomendada

Sí conviene avanzar hacia consumo de `lkn_soft.produccion_horaria`.

Pero la forma recomendada es:

- no consumirla directo desde frontend
- no abandonar el esquema local actual
- no depender de parseo implícito del nombre de máquina

La estrategia correcta es:

- consumir `produccion_horaria`
- mapear `maquina -> celda + pieza`
- cargar `produccion_hora`
- mantener intacta la API y el frontend actuales

## Próximos pasos sugeridos

1. Crear tabla local de mapeo de máquinas.
2. Completar el mapeo de todas las `maquina` activas de soldadura.
3. Implementar `dbImporter.js`.
4. Reemplazar `liveCsvSync` por una versión `liveDbSync`.
5. Validar uno o más días operativos correctos contra la fuente real.
6. Recién después decidir si el CSV histórico sigue existiendo o queda solo como fallback/manual.
