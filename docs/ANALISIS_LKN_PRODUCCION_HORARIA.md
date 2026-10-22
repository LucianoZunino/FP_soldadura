# ANALISIS - lkn_soft.produccion_horaria

## Recuperacion de CELDA_7 del 2026-10-22

La falta total de valores recientes de CELDA_7 no provenia del mapeo `maquina -> pieza`, del importador LKN ni de una desconexion del PLC. La transformacion ya habia sido corregida para leer `HORA[0]` en `00-01`, pero el endpoint Ethernet/IP `d106bad673723722` solo declaraba los cinco tags equivalentes terminados en `HORA[24]`.

La funcion evalua las variables requeridas antes de filtrar horarios futuros. Si falta una variable agrega el tag a `faltantes` y aborta la preparacion de todo el mensaje SQL. Por eso la ausencia de los cinco `HORA[0]` anulaba tambien los bloques diurnos validos de las cinco piezas.

La correccion se valido primero en Test mediante un endpoint aislado con los tags faltantes. El resultado para el dia operativo `2026-10-22` fue:

- cinco maquinas de CELDA_7;
- 15 filas positivas en tres bloques iniciados;
- total 312;
- sin escrituras de CELDA_7 en la tabla productiva durante la prueba aislada.

Al promover inicialmente la configuracion con `PUT /flow`, Node-RED conservo dos endpoints con el mismo ID: uno global sin `HORA[0]` y otro acotado al flujo productivo con la correccion. La rama continuo resolviendo la configuracion global anterior. La solucion definitiva fue normalizar el arreglo completo de `/flows`, conservando un solo endpoint global corregido y haciendo que Test y Produccion lo compartan.

Despues del despliegue definitivo se verifico:

- un unico endpoint global, sin `z`, con cinco `HORA[0]` y cinco `HORA[24]`;
- eliminacion del endpoint temporal Test;
- 15 filas iniciales identicas en `produccion_horaria` y `produccion_horaria_test`;
- incremento del sincronizador productivo de 162 filas/54 maquinas a 177 filas/59 maquinas;
- presencia de las cinco piezas en `ferrosider_produccion_soldadura.produccion_hora` y avance del bloque activo;
- comprobacion posterior con 20 filas, cinco maquinas y total 330 en ambas fuentes LKN y en el destino productivo, sin diferencias Test/Produccion.

La recuperacion diurna queda comprobada. El contraste del proximo `00-01` contra el CSV cerrado sigue abierto para validar en operacion el indice de medianoche, sin impedir el uso actual de la rama.

### Comparaciones posteriores

La herramienta `scripts/compare-csv-production.js` compara las 24 horas por celda y pieza, interpreta una fila ausente con valor esperado cero como coincidencia funcional y puede limitarse a bloques cerrados.

- Dia actual posterior al arreglo: 248 de 248 bloques cerrados coincidieron en Test contra el CSV vivo; ambos totalizaron 5489.
- Dia cerrado 2026-10-21, anterior al arreglo: 1437 de 1488 bloques coincidieron. Hubo 51 diferencias y delta total -692.
- De esas 51 diferencias, 50 fueron valores positivos de las cinco piezas de CELDA_7 ausentes en LKN por el endpoint incompleto.
- La unica diferencia ajena a CELDA_7 fue `CELDA_8 / FRONT FLOOR LH OP.20 / 21-22`, un paso intermedio previamente aceptado.

El dia 2026-10-21 sirve como evidencia del defecto anterior, no como aprobacion del endpoint corregido. La aprobacion vigente usa los bloques cerrados posteriores al despliegue; la primera jornada completa corregida se podra contrastar con el CSV de cierre siguiente.

## Promocion a Produccion del 2026-10-15

Despues de la validacion en Test se promovieron las correcciones a las 15 ramas del flujo productivo `tab_prod_soldadura_24h`. El flujo paso de SHA-256 `a472f9fdf7fa005a45c168de2254a5741e03475b1c0aa3bf3392815ad03057ac` a `a5f4eb404466f39bf79aaa9b74fb0c80c5516758d449f979cd509217221f1a35` y se genero un respaldo recuperable.

El estado vigente es:

- CELDA_7 usa `HORA[0]` en `00-01`.
- Las otras ramas conservan su indice de medianoche validado.
- Las 15 ramas omiten horas futuras.
- Un cero corrige durante el bucket y hasta 10 minutos despues; un cero tardio no borra un positivo cerrado.
- Las funciones productivas escriben solo tablas productivas.

La comparacion posterior incluyo 62 maquinas y 310 bloques cerrados disponibles: no se encontraron diferencias entre CSV vivo y staging productivo. Falta validar el primer cruce productivo real `00-01` de CELDA_7. Los huecos 2026-10-10 a 2026-10-14 se declararon no recuperables porque no existe una fuente cerrada confiable; no se fabricaran datos.

La proteccion del importador ante una fuente vacia esta implementada y probada en el repo, pero requiere desplegar y reiniciar el backend web para considerarse activa en el proceso productivo.

## Validacion previa en Test del 2026-10-15

El servidor Node-RED volvio a operar y permitio cerrar el diagnostico pendiente. Produccion genero nuevamente las 1.488 combinaciones de 62 maquinas y el flujo Test recibio las mismas 62 maquinas. Los 15 nodos Ethernet/IP informaron estado `online`, incluidos Tucker y MIG_1.

La captura del cruce local `00:00-01:00` del 2026-10-03 demostro el error de CELDA_7:

- `PIEZAS_HORA.M4.D4.HORA`, correspondiente a `CELDA_7_GOR_SUP_LH_OP10`, acumulo `33` en `[0]` y mantuvo `0` en `[24]`.
- `PIEZAS_HORA.M4.D8.HORA`, correspondiente a `CELDA_7_APRON_OP80`, acumulo `32` en `[0]` y mantuvo `0` en `[24]`.
- Las tres piezas restantes de CELDA_7 no produjeron en ese bloque y ambos indices permanecieron en cero.
- La tabla productiva guardo `0` para las dos piezas activas usando tags terminados en `[24]`, confirmando la perdida de produccion en origen.

La conclusion es especifica: en CELDA_7 el bloque `00-01` debe leer `[0]`. No corresponde cambiar todas las ramas. Tucker y las MIG ya usan `[0]`; las otras celdas SPOT conservan `[24]` porque sus comparaciones cerradas no mostraron este desplazamiento.

La excepcion se valido primero en `TEST - SOLDADURA CORRECCION HORARIA` y luego se promovio a Produccion con respaldo y verificacion de huella. La proxima madrugada debe compararse CELDA_7 con el flujo diagnostico y con el CSV cerrado para validar la primera ejecucion real.

### Contraste del dia actual

El CSV vivo actualizado a las 10:32 se comparo contra las 62 maquinas:

- 248 de 248 bloques cerrados (`06-07` a `09-10`) coincidieron exactamente tanto en Produccion como en Test.
- Las diferencias observadas pertenecian exclusivamente al bloque activo `10-11` y cambiaban por el desfase de segundos entre las tres lecturas.
- El reinicio no reconstruyo los dias 2026-10-10 a 2026-10-14: no existen filas LKN para esas fechas.

### Inconsistencias independientes

CELDA_7 no era la unica causa global de diferencias:

- El flujo productivo ya incorpora la ventana de correccion de 10 minutos desplegada el 2026-10-15.
- El servidor Node-RED estuvo detenido y dejo dias completos sin datos. El monitor de estados permite detectar futuras desconexiones, pero no reconstruye historicos.
- El importador borraba la fecha destino si LKN devolvia cero filas. El codigo queda protegido para omitir el reemplazo y conservar el ultimo snapshot; falta desplegar y reiniciar el backend web.
- Las filas cero ausentes en Test representan falta de cambio del nodo Ethernet/IP y el frontend las visualiza como cero. Para auditoria siguen siendo diferentes de una lectura explicita.

## Investigacion del 2026-10-01

### CELDA_7

Las diferencias de CELDA_7 se concentran en `00-01`. Las horas anteriores y posteriores coinciden, por lo que el mapeo de pieza y tag base es correcto. Las nueve celdas SPOT consultan `[24]` para representar medianoche, pero el PLC de CELDA_7 tambien expone `[0]`. El flujo actual solo tiene `[24]` en su tabla de variables.

Una lectura Test directa confirmo que `[0]` y `[24]` existen, pero a las 08:48 ambos ya se habian reiniciado en cero. No es seguro cambiar el indice basandose en esa captura tardia. Se dejo activo el flujo `TEST - DIAGNOSTICO CELDA7 HORA 0 VS 24`, que registrara ambos valores en `celda7_indice_diagnostico_test` durante el proximo cruce de medianoche. Si `[0]` coincide con el CSV y `[24]` permanece en cero, la correccion sera usar `[0]` solo para CELDA_7 en el bloque `00-01`.

### Tucker y MIG_1

El contraste en vivo muestra que sus mapeos coinciden con el CSV. Las filas ausentes no prueban por si solas una desconexion: la version instalada de `node-red-contrib-cip-ethernet-ip` en modo `all` emite un mensaje solamente cuando cambia al menos un tag. Por eso una hora completamente en cero puede no generar fila y el heartbeat en memoria puede marcar un falso offline.

Sin embargo, luego de redesplegar Test, 13 de 15 entradas informaron estado `online`; Tucker y MIG_1 no lo hicieron, aunque ambos PLC respondieron por TCP 44818. Esto apunta a sesiones `eth-ip` trabadas. El proyecto del nodo tiene un reporte abierto sobre PLC que no se reconectan automaticamente: `https://github.com/st-one-io/node-red-contrib-cip-ethernet-ip/issues/40`.

Se agrego un nodo `status` en Test para persistir solo transiciones reales en `plc_estado_diagnostico_test`. Esta evidencia permitira distinguir falta de cambios, desconexion y reconexion antes de decidir entre reiniciar endpoints, actualizar el nodo o agregar un watchdog.

## Validacion del 2026-10-01

Se comparo el dia operativo 2026-09-30 contra `produccion_sold_bk_ayer.csv`, cerrado el 2026-10-01 a las 05:55. El CSV contiene 62 maquinas y 1.488 bloques.

- Produccion coincidio exactamente en 1.424 bloques y difirio en 64.
- Test coincidio en 1.454 bloques, difirio en 6 y no materializo 28 filas.
- Las 28 filas ausentes esperaban valor cero. Si la ausencia se interpreta funcionalmente como cero, Test coincide en 1.482 de 1.488 bloques.
- Test corrigio 47 falsos positivos presentes en Produccion, principalmente en el Turno 3.
- No se detectaron positivos historicos validos borrados por ceros tardios. La ventana de 10 minutos evito la regresion observada el dia anterior.

Las seis diferencias con valor son:

- Dos pasos intermedios ya aceptados: `CELDA_3_PILAR_C_RH_OP07` y `CELDA_8_FRONT_FLOOR_LH_OP20`, ambos en `21-22`.
- CELDA_7 en `00-01`: `GOR_SUP_LH_OP10` informa `0` frente a `33` del CSV y `APRON_OP80` informa `0` frente a `1`.
- `TUCKER_APRON_FUSILERA` en `01-02`: Test informa `42` frente a `43` del CSV.
- `MIG_1_APRON_OP10_RH` en `03-04`: Test informa `0` frente a `1` del CSV.

Las 28 filas ausentes pertenecen al Turno 3: 24 de Tucker entre `02-06` y 4 de MIG_1 entre `04-06`. Todas esperaban cero, pero la ausencia confirma que esas ramas dejaron de emitir mensajes durante parte de la madrugada. Conviene materializar el cero con `origen='SIN_LECTURA'` y generar una alerta, en vez de tratar silenciosamente una desconexion como produccion cero.

## Validacion del 2026-09-30

La comparacion del dia operativo 2026-09-29 contra el CSV de la intranet incluyo 62 maquinas y 1.488 bloques. Produccion coincidio en 1.430 bloques y el flujo TEST en 1.467, con 46 falsos positivos corregidos en el Turno 3.

La prueba tambien detecto que el reemplazo irrestricto por cero no era seguro: `MIG_4_APRON_OP5LH` tenia `30` en `06-07`, coincidente entre CSV y Produccion, pero el PLC reinicio el arreglo cerca de las 06:00 del dia siguiente y TEST lo reemplazo por `0`.

La regla TEST se refino para permitir la correccion a cero solamente durante el bloque activo y hasta 10 minutos despues de su cierre. Esto conserva la capacidad de limpiar residuos al comenzar una hora sin produccion, pero evita que un reinicio posterior borre un bloque historico valido.

Persisten dos casos independientes de esta regla:

- CELDA_7 informa `0` en `HORA[24]` para `00-01`, mientras el CSV informa `21` en cinco piezas. Produccion y Test coinciden en cero, por lo que debe revisarse el tag o indice PLC.
- MIG_1 no emitio mensajes suficientes para crear ocho bloques en cero entre `02-06`. Debe definirse un cierre que materialice ceros aun cuando no llegue una nueva lectura.

## Validacion Node-RED del 2026-09-24

La pestaña productiva `LKN PRODUCCION SOLDADURA 24H` esta activa y Tucker entrega lecturas validas. El mapeo observado es independiente por pieza:

- `DASH OP 5` -> `E06.Produccion.Por_Hora`
- `DASH OP 7` -> `E01.Produccion.Por_Hora`
- `CAJA DE AGUA` -> `E02.Produccion.Por_Hora`
- `TUNNEL` -> `E05.Produccion.Por_Hora`

El problema de origen no esta en el mapeo de FP_Soldadura. La funcion SQL de Node-RED tenia dos comportamientos riesgosos:

- conservaba el positivo anterior cuando una lectura nueva informaba cero;
- recorria los 24 bloques cada 15 segundos sin impedir la persistencia de horarios futuros.

La tabla `produccion_horaria` alimenta directamente las vistas `vw_produccion_horaria`, `vw_produccion_turno`, `vw_produccion_diaria` y `vw_produccion_mensual`. No se encontraron triggers, rutinas, eventos ni claves foraneas que propaguen escrituras a otras tablas. Los consumidores externos de esas vistas no pueden determinarse solamente desde el schema.

Para validar la correccion sin tocar Produccion se desplego el flujo paralelo `TEST - SOLDADURA CORRECCION HORARIA` (`94735d01267fe806`). Replica las 15 ramas productivas y escribe solo en `produccion_horaria_test` y `dashboard_equipos_live_test`. La prueba acepta ceros reales, descarta bloques futuros y usa una cola MySQL TEST independiente de 20 mensajes por segundo.

La validacion del 2026-09-24 cubrio las 62 maquinas y 496 bloques ya iniciados, sin filas futuras. En esos bloques se detectaron 19 diferencias contra Produccion: Test registro `0` mientras el upsert productivo conservo valores positivos anteriores. Esto confirma que la regla de preservacion del positivo genera produccion ficticia cuando el PLC cambia a cero.

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

- Flujo interno Node-RED `tab_prod_soldadura_24h` (direccion reservada al entorno).

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
