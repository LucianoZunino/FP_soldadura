# Frontend

## Stack y entrada

React 18 y Vite. La aplicacion se compone actualmente en `frontend/src/main.jsx` y usa `frontend/src/styles.css` para layout y estilos.

## Configuracion

- `VITE_API_BASE`: base HTTP del backend. Default local: `http://localhost:3001`.
- `VITE_AUTO_DASHBOARD_REFRESH`: habilita refresco automatico salvo que valga literalmente `false`.

Las variables `VITE_*` se resuelven durante el build. Un cambio requiere reconstruir el frontend.

## Vistas

- **Dashboard:** matriz diaria por celda, pieza, articulo final, turno y hora.
- **Turno:** detalle filtrado por turno.
- **Historial:** consulta fechas seleccionadas.
- **Detalle:** desglose operativo.
- **Exportar:** genera CSV en navegador con separador punto y coma y BOM.

La navegacion no usa router ni URL por vista. `activeView` vive en `App`, por lo que recargar vuelve al Dashboard.

## Fuentes de estado

| Estado | Fuente de verdad |
|---|---|
| Produccion y resumen | Respuesta de `GET /api/dashboard` |
| Fecha seleccionada | Estado local `selectedDate` |
| Turno visible | Estado local `shiftId` |
| Vista y sidebar | Estado local del componente `App` |
| Filtros de detalle | Estados locales `cell` y `piece` |
| Ultima actualizacion | Hora del navegador al completar una lectura |

No hay store global, cache persistente ni sincronizacion de filtros con URL.

## Fecha y refresco

- La fecha inicial es el dia operativo, no siempre el dia calendario.
- Entre `00:00` y `05:59`, el dia operativo visible corresponde al anterior.
- Para el dia operativo actual, el Dashboard vuelve a consultar `/api/dashboard` cada 10 segundos.
- El refresco automatico es de solo lectura; no dispara sincronizaciones.
- El boton de actualizacion manual llama `/api/live-sync` para hoy y `/api/import` para historicos.

## Carga, error y vacio

- La carga inicial y cada cambio de fecha muestran un estado bloqueante `Cargando datos`.
- El refresco de 10 segundos es silencioso y conserva la grilla visible.
- Los errores de lectura o importacion aparecen en un toast con el mensaje de API.
- Si nunca se obtuvo un dashboard, se presenta `Sin datos para mostrar`.
- No existe boton generico de reintento; cambiar/consultar fecha, actualizar manualmente o esperar el siguiente refresco vuelve a ejecutar la solicitud.
- Importar produccion e importar articulos tienen flags independientes para deshabilitar sus botones durante la operacion.

## Presentacion de ceros

La grilla muestra `0` en lugar de una celda vacia para una combinacion sin cantidad. Esto no distingue entre cero explicitamente leido y ausencia de fila en la fuente; esa calidad debe resolverse en datos antes de presentarla.

## Articulos finales

La UI muestra la relacion resuelta por backend. Cuando no existe articulo final asociado, presenta `SUBPROCESO`.

## Filtros, identidad y exportacion

- La fecha solo se aplica al presionar `Consultar`; el input mantiene un borrador local.
- La vista Turno selecciona por `shift.id`.
- Detalle filtra por texto de celda y pieza y toma la primera fila coincidente.
- Las celdas horarias se identifican por `turno:hora_desde`; las filas combinan celda y pieza.
- El boton rotulado `Exportacion a Excel` descarga en realidad un archivo CSV, no XLSX.

## Presentacion y responsive

- Numeros totales usan locale `es-AR`; las fechas visibles se formatean como `DD/MM/YYYY`.
- La tabla mantiene columnas iniciales fijas y scroll horizontal; puede mostrar una barra inferior sincronizada.
- Bajo 900 px el layout adapta sidebar y contenido, aunque la matriz sigue dependiendo de desplazamiento horizontal.
- Los botones iconicos principales incluyen `title`; no existe una auditoria de accesibilidad automatizada documentada.

## Build

```powershell
npm run frontend:build
```

El resultado queda en `frontend/dist/`. La publicacion depende del mecanismo del servidor, que no esta automatizado en este repositorio.

## Evidencia

- `frontend/src/main.jsx`
- `frontend/src/styles.css`
- `frontend/package.json`
- `backend/src/services/productionService.js`
