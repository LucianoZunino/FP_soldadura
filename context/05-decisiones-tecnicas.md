# Decisiones tecnicas

## LKN como fuente viva

**Decision:** Produccion usa `lkn_soft.produccion_horaria`; CSV queda para historico y contraste.

**Razon:** desacopla el dashboard de archivos compartidos, centraliza la adquisicion PLC y permite sincronizacion frecuente desde backend.

**Condicion:** Node-RED y el staging deben estar operativos. Una fuente vacia no debe borrar el ultimo snapshot local.

## Base local como frontera

**Decision:** el frontend no consulta LKN directamente.

**Razon:** `produccion_hora` estabiliza claves, relaciones de articulos, fecha operativa y consultas aunque cambie la adquisicion.

## Dia operativo en origen

**Decision:** `fecha_modificada = fecha_operativa` para importaciones LKN.

**Razon:** LKN ya asigna `00-06` al dia operativo anterior. Restar un dia en backend desplaza dos veces el Turno 3.

## Mapeos con vigencia

**Decision:** los cambios maquina-pieza se modelan en `maquina_pieza_mapeo` con rango de fechas.

**Razon:** editar un mapeo unico reinterpreta historicos. Una nueva vigencia conserva lo producido con la configuracion anterior.

## Reemplazo atomico del dia

**Decision:** las sincronizaciones LKN validas reemplazan el dia completo en una transaccion.

**Razon:** evita mezclar snapshots parciales y simplifica correcciones de ceros. Precondiciones: fuente no vacia y mapeos completos.

## Cero con ventana temporal

**Decision:** Node-RED acepta cero durante el bucket y 10 minutos despues; luego preserva un positivo previo.

**Razon:** un cero real debe corregir falsos positivos, pero los PLC pueden reiniciar tarde sus arreglos y no deben borrar produccion cerrada.

**Trade-off:** falta distinguir en el modelo un cero confirmado de una falta de comunicacion.

## Indice de medianoche por rama

**Decision:** CELDA_7 usa `HORA[0]` para `00-01`; no se aplica una conversion global.

**Razon:** una captura directa del PLC demostro que CELDA_7 acumula en `[0]`, mientras otras ramas tienen contratos distintos.

## Escritura automatica solo en backend

**Decision:** el refresco del frontend es de solo lectura.

**Razon:** varios navegadores no deben competir escribiendo la misma fecha. El scheduler backend es el unico escritor automatico hacia la base local.

## Despliegue Node-RED reproducible

**Decision:** usar scripts versionados con dry-run, SHA esperado, respaldo y rollback.

**Razon:** editar 15 ramas manualmente es dificil de auditar y puede mezclar destinos Test/Produccion.

## Salud LKN solo operativa

**Decision:** controlar scheduler, errores, fuente vacia, atraso y cobertura desde el backend, logs y `/api/lkn-health`; no agregar estos estados al frontend.

**Razon:** son señales de infraestructura para diagnostico y despliegue, no informacion necesaria para operar el reporte diario.

## Huecos sin fuente confiable

**Decision:** no reconstruir ni fabricar datos para fechas donde no existe una fuente cerrada confiable.

**Razon:** completar con ceros o copiar otro dia produciria un historico falso. Los huecos confirmados permanecen documentados y fuera del backlog.

## Evidencia historica

El detalle de descubrimiento, comparaciones y decisiones superadas permanece en `docs/ANALISIS_LKN_PRODUCCION_HORARIA.md` y `docs/CHANGELOG.md`. Este archivo contiene solo decisiones vigentes.
