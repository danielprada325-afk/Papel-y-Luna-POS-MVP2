# Papel y Luna POS — MVP 2

Aplicación web para operar ventas, inventario, compras y entidades del negocio. El frontend usa HTML, CSS y JavaScript vanilla; Google Sheets almacena los registros y Google Apps Script expone la API de lectura y escritura.

## Alcance implementado

- Ventas: búsqueda de productos, carrito, cantidades, subtotal, total, Efectivo/Nequi/Debe, cálculo de cambio, cierre, factura imprimible y consulta de historial.
- Ventas abiertas: guardado en Sheets, reanudación y cierre posterior. No descuentan inventario hasta el cierre.
- Productos: alta, edición y eliminación con validación, categoría existente, código sugerido, seguimiento de inventario y stock.
- Inventario: verifica existencias antes de cerrar; actualiza stock después de confirmar la venta o compra; los productos sin seguimiento no alteran stock; las compras actualizan el costo.
- Compras: proveedor, productos, cantidades y costo, envío a Sheets, detalle e historial.
- Categorías, clientes y proveedores: búsqueda y CRUD. Rechaza en la interfaz la eliminación cuando existen relaciones.
- Estados de error/carga, prevención de doble envío, roles visuales, diseño responsive y manejo de JSON.

El MVP 2 excluye descuentos, reembolsos y correcciones de ventas cerradas. La guía de Sheets no incluye una columna de método de pago de compra; por eso las compras guardan los campos que define ese contrato.

## Google Sheets y Apps Script creados

Ya se creó la hoja **Papel y Luna POS MVP 2**, y Apps Script completó `setupPOS()`. La hoja contiene las pestañas `productos`, `ventas`, `compras`, `clientes`, `proveedores` y `categorias` con los encabezados del contrato P2.2.

- Hoja: https://docs.google.com/spreadsheets/d/1kmzh-YbSZKIZHOwXe6hb-08s_YD2gHpcnPdnWFpd_Y0/edit
- Proyecto Apps Script: https://script.google.com/home/projects/1Whxw-yUXgfyejZyJi7gRWeELTPRxEZVgwcuhEXbGuC8JmSohYGNBcQj9/edit

El proyecto tiene guardado el código API y está asociado por ID a esta hoja. Para cualquier cambio futuro, abre el proyecto de Apps Script anterior, edita `Código.gs`, guarda y publica una nueva versión de la implementación.

La API ya está publicada como aplicación web con ejecución bajo la cuenta propietaria y acceso `Cualquiera`. La guía requiere este modo para que el frontend y el profesor puedan consumirla sin iniciar sesión. Cualquier persona que obtenga la URL puede leer y escribir registros en las seis pestañas; comparte el enlace solo con el equipo y no uses estos datos para información sensible. El frontend ya tiene la URL `/exec` configurada en `config.js`.
## Conectar el frontend

`config.js` ya contiene la URL `/exec` publicada. Si creas otra implementación, actualiza `API_URL` allí. No pongas claves ni contraseñas en el frontend. La API está abierta a cualquiera que tenga el enlace, así que compártelo únicamente con el equipo.

API publicada: https://script.google.com/macros/s/AKfycbwatakpnQESC45pT084HPcxt4cobgzvmzXjFt__jl9Qwykd3p_RWfVTcVMIgmXdIHtX-w/exec

## Ejecutar localmente

Por los módulos ES, sirve la carpeta con un servidor HTTP local (localhost cuenta como contexto seguro):

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. También puedes publicar la carpeta en GitHub Pages. La API debe tener una política de acceso compatible con el contexto donde se ejecuta el frontend.

## Contrato de datos

Cada pestaña debe conservar exactamente los encabezados que crea `setupPOS`. `id` se genera en el frontend con `crypto.randomUUID()`. Las fechas son ISO; el dinero se maneja como enteros en pesos; `itemsJson` conserva una copia de nombre, precio/costo y cantidad de cada línea para que cambios posteriores no modifiquen el historial.

`api.js` concentra las llamadas `fetch`: GET `?resource=...` y POST con `text/plain;charset=utf-8` y cuerpo `{action,data}`. Se valida `success` antes de usar `data`. Apps Script implementa create, update y delete con bloqueo de escritura.

## Consistencia del inventario

Sheets no ofrece transacciones para varias filas. La app registra primero la venta/compra; solo tras respuesta exitosa aplica cambios a productos. Si una actualización de stock falla después de guardar la operación, la interfaz informa los productos afectados para corregirlos en Productos. Antes de la sustentación, revisa que no existan actualizaciones pendientes.

## Antes de entregar

- La URL `/exec` está configurada en `config.js`.
- Confirma las seis pestañas y sus encabezados.
- La estructura de pestañas ya fue creada con `setupPOS`; el Apps Script está desplegado.
- Publica el frontend y confirma el acceso exigido por el curso.
- Registra datos de prueba desde la interfaz; la aplicación no trae catálogo de ejemplo ni usa LocalStorage.
- Incluye los commits de todos los integrantes en el repositorio que exige el curso.

## Archivos

- `index.html`, `styles.css`: interfaz y diseño responsive.
- `app.js`: flujos y renderizado dinámico.
- `api.js`: acceso al servicio Google Sheets.
- `utils.js`: formato, validación visual e impresión de factura.
- `config.js`: URL configurable del servicio.
- `apps-script.gs`: API y creación de estructura de hojas.

