# Changelog de StockPredict Pro

Formato: versión semántica MAYOR.MENOR.PARCHES.
Regla del proyecto: el cambio de versión viaja en el mismo commit que la funcionalidad.

## [v1.13.0] - 2026-10-28

### Añadido — Fase 15 (parte 2): reposición y órdenes de compra (completa la fase iniciada en v1.12.0)
- **Motor de sugerencias (`sugerencias.service.ts`, 15.4)**: calcula on-the-fly la cantidad de
  reposición cruzando la tabla `predicciones` (**fuente única**, JOIN por `producto_id` — no recalcula
  el consumo inflado de 11.8, que divide solo entre días con venta) con `producto_proveedor`
  (lead-time efectivo por `COALESCE`, MOQ, costo). Fórmula `Q = stock_minimo + consumo × (lead-time + R)
  − stock_actual − pendientes`, con **`R = 0`** (revisión continua) y **`pendientes = 0`** (A+ no
  registra OCs), ambos documentados en el service como constantes nombradas. Filtro de entrada
  **`Q_bruta > 0`** (unifica cobertura y bajo-mínimo sin huecos: un producto en mínimo exacto sin gasto
  no entra; uno bajo mínimo sin ventas sí). Ranking de proveedores por **lead-time ASC, costo desempate,
  nulls al fondo** (Opción 2: el criterio de orden coincide con lo que el modal destaca, así el usuario
  entiende por qué están ordenados así). Bordes: **B2** (sin proveedor activo → `Q = null` + aviso, no
  se descarta en silencio) y **B3** (plazo no registrado → degrada a reponer al mínimo, sin asumir
  entrega inmediata).
- **Vista `/proveedores/reposicion` (15.4)**: página propia **subordinada** a `/proveedores` (ruta hija,
  **sin** enlace en el navbar: reposición es vista derivada de proveedores, no dominio primario — se
  decidió no saturar la barra y preservar la subordinación conceptual). Tabla de 8 columnas con
  lead-time destacado (criterio de orden), costo secundario, badge "Bajo mínimo" (señal secundaria, no
  de entrada), avisos A+/B2/B3, y el modal "Ver otros proveedores" **read-only** (todos los pares, el
  recomendado en primera posición por **posición, no badge** interpretativo; scroll soldado: header fijo
  + `modal-body` con `overflow-y:auto` + `min-height:0` + footer fijo; nace con `max-width: 720px` por
  ser tabla, no 500px de formulario).
- **Botón-contador "📦 Reposición N"** junto a "Nuevo proveedor" en `/proveedores` (patrón campana de
  notificaciones), alimentado por el `load` (`obtenerSugerencias().length`, **paridad total** badge↔vista,
  **sin** SSE: dato estático entre cargas). Las dos acciones del header se agrupan a la derecha
  (`.header-acciones-grupo`) para que el contador no flote en el medio al haber tres elementos.
- **Exportación de OC a PDF (15.5)**: `generarOrdenCompraPDF()` en `reportes.service.ts` (patrón branded
  de `generarReporteInventario`: header rect + autoTable + total + footer global con `VERSION`; **una
  página por OC**, opción iii — imprimir por página = imprimir una OC). Endpoint `POST
  /api/exportar/orden-compra` que agrupa por proveedor (**D2: una OC = un proveedor**), **valida cada
  cantidad contra MOQ/entero/>0 y resuelve costos y plazos desde BD** (**D6**: el server es autoridad, el
  cliente solo manda `ids + cantidad`; rechaza pares inexistentes o proveedores inactivos con 400 y
  motivo, nunca reescribe la cantidad aprobada), numera `OC-YYYYMMDD-HHmm-{proveedorId}` (único por
  batch) y audita la emisión (`oc_generada`). Plazo de la OC = **máximo** de los lead-times del grupo
  (se satisface cuando llega todo), con plazo por línea en la tabla. Moneda `€` en el PDF nuevo (no
  replica el `$` heredado del reporte de inventario). Componente `BotonOC.svelte` (hermano de `BotonPDF`
  con POST, self-contained para no tocar `BotonPDF` en uso) + checkboxes de selección en `/reposicion`
  (patrón `/notificaciones`: estado local inmutable + `confirm` nativo con resumen "N OCs a generar: …").
- **`obtenerParActivo`** en `proveedores.service.ts`: resuelve un par (producto, proveedor) **activo**
  desde BD (`WHERE prov.activa = 1`) como autoridad de validación de la OC.
- **Tipos nuevos** (`types.ts`): `SugerenciaReposicion`, `ProveedorRanking` (15.4) y `LineaOCPayload`,
  `ParActivo`, `LineaOC`, `OrdenCompraExportable` (15.5).
- **Claves i18n** (`es`/`en`): namespaces propios `reposicion.*` (vista de sugerencias) y `oc.*`
  (selección + generación), sin claves cruzadas (hardening de la Fase 12).
- **`static/app.css`**: `.page-container--wide` generalizado (el aprieto de las tablas de la 15 es por
  **densidad de datos** — nombres largos + 5–8 columnas — no por acumulación; cada vista de tabla densa
  hereda un contenedor más ancho sin tocar el `max-width` global de 1200px de las demás rutas).

### Corregido
- **Asociaciones no refrescaban tras guardar** (`/proveedores/[id]`, bug de la ficha de v1.12.0
  descubierto al integrar 15.4): el `each` bindeaba los inputs a propiedades del argumento
  (`bind:value={fila.costo_unitario}`) y el `$effect` de resincronización reasignaba `filas` vía `.map()`
  — zona gris "buggy and unpredictable" de runes mode que dejaba la fila nueva sin pintar pese al toast
  (el server **sí** persistía). Migrado al patrón canónico de índice (`{#each filas as fila, i}` +
  `bind:value={filas[i].x}`). De paso, el plazo del par estaba bindeado por error al global del proveedor
  (`bind:value={p.tiempo_entrega_dias}`, un `$derived` read-only); corregido a `filas[i].tiempo_entrega_dias`.
  El `placeholder` sí usa `p` (refleja si hay global que heredar).
- **`each_key_duplicate` en `/reportes`** (bug de 11/13 descubierto al probar la 15): cuatro `each` usaban
  keys concatenando campos no-únicos (`${lote}-${producto}`, `${fecha}-${producto}-${tipo}`,
  `p.producto`), colisionando cuando dos filas compartían esos valores (p. ej. dos lotes "423" del mismo
  producto → `"423-Laptop"` duplicado → crash de runtime y DOM cruzado al filtrar). Como **ningún** tipo
  de reporte tiene `id` primario, no se pudo usar `(x.id)`; y añadir `id` al `SELECT` habría metido una
  columna "id" en el `.xlsx` (rompiendo la garantía *byte-idéntico* de 1.10.0). Fix en la vista: se
  mantiene la key semántica y se añade `-${i}` (índice) a los cinco `each`, garantizando unicidad por
  construcción sin tocar service, types ni el binario Excel.

### Deuda técnica agendada (no bloqueante)
- **D22** — ciclo de vida de órdenes de compra: tabla `ordenes_compra` + estado (emitida/recibida/
  cancelada) para descontar "pedidos ya emitidos" de la fórmula de `Q` y dar historial de compras.
  Consecuencia consciente de elegir A+ (OC efímera, sin persistencia); mientras tanto la UI avisa de su
  límite. Es la opción B descartada por alcance, no un olvido.
- **D23** — keys por índice en `/reportes`: estables mientras la vista no tenga sort/filter en cliente
  (hoy no lo tiene). Si lo gana, migrar a `id` real añadiendo la columna al `SELECT` **y** excluyéndola
  del Excel (SELECTs separados vista-vs-descarga).
- **D24** — paridad 11.8 → 15.4: que `/reportes` consuma el motor de sugerencias y retire su
  `compra_recomendada` on-the-fly (horizonte 30 fijo, sin lead-time, sin margen), cerrando la deuda de
  paridad que el propio 1.10.0 marcaba como "pendiente: confirmar esquema" (esquema ya confirmado).
- **D25** — i18n de documentos PDF: los cuatro generadores hardcodean ES y mezclan `$` (inventario) y
  `€` (OC nueva); unificar moneda/idioma derivándolos del locale activo.
- **D26** — uniformizar `BotonPDF` (GET) y `BotonOC` (POST) en un componente de descarga genérico que
  acepte método + body, eliminando la duplicación de las ~8 líneas de blob→download.
- *(las deudas D17/D19/D20/D21 de v1.12.0 siguen vigentes; no se repiten aquí)*.

---

## [v1.12.0] - 2026-10-27

### Añadido — Fase 15 (parte 1): gestión de proveedores y asociación por producto
- **Migración 017** (`017_proveedores.ts`): tabla `proveedores` (datos maestros + `tiempo_entrega_dias`
  global como default + `activa` soft-disable, patrón de `api_keys`/`webhooks`) y tabla intermedia
  `producto_proveedor` con la relación muchos-a-muchos **fina**: `costo_unitario REAL NOT NULL`
  (inherentemente por par), `tiempo_entrega_dias` **override-nullable** (`NULL` = hereda el global del
  proveedor, evitando redundancia) y `pedido_minimo` (MOQ por par). El `lead-time` va por par — no
  global como planteaba el plan original — porque es término directo de la cantidad sugerida de
  reposición (`Q = consumo × (lead-time + revisión) + seguridad − stock`): un global subestimaría el
  pedido de los productos lentos y sobrestimaría el de los rápidos. Se descarta el campo
  `productos_suministrados` del plan (lista de productos como texto: imposible de consultar con JOIN,
  sin FK, sin costo/plazo por producto) en favor de la intermedia.
- **`proveedores.service.ts`**: CRUD con auditoría en los métodos mutantes (precedente de
  productos/transferencias, no de ubicaciones que no audita), `eliminar` con guard que **lanza si hay
  productos asociados** (no deja que el `CASCADE` borre el historial de costos/plazos en silencio),
  `reasociarProductos` **idempotente** (transacción + diff insert/update/delete por `producto_id`,
  validación de invariants y de existencia de productos antes de mutar, auditoría agregada del diff),
  `obtenerProveedoresDelProducto` (filtra `activa = 1`, para la ficha de producto) y
  `obtenerProductosDelProveedor` (expone **tanto** el override crudo como el efectivo resuelto por
  `COALESCE`, para distinguir "hereda" de "hardcodeado" en el pre-rellenado).
- **Vista `/proveedores`** (lista): tabla con conteo de productos asociados, modal accesible de
  alta/edición, eliminar como form action con toast, y asimetría de permisos **lectura abierta /
  escritura solo admin** (`exigirAdmin` en los actions + botones ocultos por `data.rol`).
- **Vista `/proveedores/[id]`** (ficha): hub de asociaciones en **multiselección** (borrador local +
  `each` keyed por `producto_id` para no perder ediciones al añadir/quitar + inputs leídos del
  `FormData` al submit, patrón de `transferencias/nueva`), cabecera editable (modal), 3 métricas
  derivadas (productos, stock a costo de reposición, plazo promedio) y **pre-rellenado** de las
  asociaciones desde el server.
- **Conectores**: sección "Proveedores" (read-only, solo activos, con click-through) en
  `/products/[id]`, y enlace `/proveedores` en el navbar visible para todos los autenticados
  (coherente con la lectura abierta; la escritura sigue blindada en los actions).
- **Claves i18n** (`es`/`en`): bloque `proveedores.*` completo (lista + ficha + errores),
  `producto.proveedores` / `producto.proveedoresVacio`, y `nav.proveedores`.

### Corregido
- **PRG en `crear` de `/proveedores`**: retornar `{ success }` dejaba el POST pendiente y, como
  `proveedores.nombre` **no** es `UNIQUE` (a diferencia de `productos.nombre`), un F5 **duplicaba** el
  proveedor. Cambiado a `redirect(303, '/proveedores')` (fuera del `try`) con el toast disparado desde
  el callback interior de `use:enhance`. `actualizar`/`eliminar` se quedan con `{ success }` a
  propósito: son idempotentes por `id`, así que un reenvío es no-op.
- **Modal que cortaba los botones** (`/proveedores` y `/proveedores/[id]`): sin `max-height` ni
  `overflow`, en pantallas de ~700 px útiles el contenido desbordaba y Cancelar/Guardar quedaban
  fuera sin forma de scrollear. Reestructurado a header fijo + cuerpo scrolleable + footer fijo
  (`flex` + `max-height: calc(100vh - 2rem)` + `min-height: 0` en los flex items, que es lo que activa
  el scroll). El mismo bug preexistente en `admin/ubicaciones` se deja para la Fase 16 (no es de esta
  fase).
- **`const` → `let` en `productoAElegir`** (`$state` reasignable por `bind:value` y por
  `agregarFila`; el compilador lo marcó como `constant_assignment`).
- **Tipo `ProductoAsociado` duplicado**: existía inline en el service **y** en `types.ts`, y la vista
  consumía el inline (sin `tiempo_entrega_override`) → TS2339. El inline se elimina y el service
  importa el de `types.ts` (una sola fuente); el `SELECT` añade la columna `tiempo_entrega_override`
  (cruda) junto al `tiempo_entrega_efectivo` (resuelto).
- **TS2322 en el `$effect` de resincronización**: `a.tiempo_entrega_override ?? ''` devolvía
  `string | number` (el `??` no convierte a string), incompatible con `FilaBorrador`. Alineado con el
  patrón de `pedido_minimo`: `!= null ? String(...) : ''`.
- **`placeholder` del plazo** miraba `fila.tiempo_entrega_dias` (un `string`, siempre `!= null`) en vez
  de `p.tiempo_entrega_dias` (el global, `number | null`): decía "hereda global" aunque el proveedor no
  tuviera global que heredar.
- **Métrica renombrada** "Valor a costo" → "Stock a costo de reposición": la fórmula usa el costo
  vigente (`stock_actual × costo_unitario`), no el costo histórico FIFO de lo que ya hay en estantería;
  el nombre nuevo describe el proxy con honestidad.
- **Hint de "Pedido mín."**: campo nullable que aún no tiene consumidor de cálculo (lo tendrá en 15.4),
  se documenta en la UI para que no parezca ruido al llenar el formulario.

### Eliminado
- `type ProductoAsociado` inline en `proveedores.service.ts` (duplicado del de `types.ts`).

### Deuda técnica agendada (no bloqueante)
- **D17** — auditar el CRUD de `ubicaciones` (hoy crear/editar/eliminar no deja rastro en auditoría,
  incoherente con productos/transferencias/proveedores).
- **D19** — reubicar `/proveedores` bajo `/admin` cuando la 16.6 (hoy el guard de rol va inline por
  vista, como `admin/ubicaciones`, en vez de un layout centralizado).
- **D20** — semántica de asociar un producto a un proveedor **inactivo** (hoy se permite y la asociación
  queda oculta en la ficha del producto hasta reactivar; decidir entre permitir / bloquear / permitir
  con aviso). Decisión de dominio, no bug.
- **D21** — migrar los tipos de fila inline restantes del service (`ProveedorConConteo`,
  `ProveedorDelProducto`) a `types.ts`, para que el service sea 100% "importa tipos, no los declara"
  (coherente con el hardening de 11.8/12).
- **Duplicación de adaptador** `actualizar` (lista + ficha llaman al mismo `service.actualizar`):
  uniformizable con un componente de form de cabecera compartido.
- **Modal sin scroll en `admin/ubicaciones`** (preexistente de la fase 7) y **favicon relativo**
  (`/productos/N/favicon.ico`, residuo del scaffold) → Fase 16.
- **Lo que falta de la Fase 15** (otro release de la misma fase, no deudado aquí): **15.4** sugerencias
  de orden de compra (cruce `predicciones` × `producto_proveedor`, donde `lead-time` por par y `MOQ`
  empiezan a trabajar juntos en `Q_sugerida`) y **15.5** exportación de OC a PDF (reuso del pipeline de
  `reportes.service`).

---

## [v1.11.0] - 2026-10-25

### Añadido — Fase 13: Visualización Histórica
- **Motor de series temporales** (`series.service.ts`): reconstruye el stock histórico rebobinando
  desde `movimientos` (sin tabla de snapshots) y proyecta el futuro con el modelo lineal de consumo
  promedio. Endpoints `/api/series/global` y `/api/series/producto/[id]`.
- **`GraficoTendencias.svelte`**: componente reutilizable (Chart.js + zoom por rueda/arrastre,
  exportar PNG, línea "hoy", stale-while-error honesto, repintado al cambiar de tema). SSR-safe
  (carga dinámica de Chart.js y el plugin de zoom dentro de `$effect`; sin `hammerjs`).
- **Incrustación** en `/reportes` (bonus), **dashboard** (pestaña Análisis) y **ficha de producto**
  (`/productos/[id]`, nueva: hub de navegación + tendencia por ítem).
- **Dashboard con pestañas** accesibles (Operación / Análisis / Ubicaciones, roving tabindex +
  navegación por flechas), KPIs fijos fuera de las pestañas, charts migrados de `onMount` a
  `$effect` (lazy por pestaña, destroy+create al cambiar), y ranking "Top vendidos" convertido de
  donut a **barras horizontales** (lectura por longitud, no por ángulo).
- **Ficha de producto** (`/productos/[id]`): cierra el 500 por `+page.svelte` ausente; expone
  `rol` y valida el id; enlaza a las subrutas existentes sin duplicar su lógica.
- Tabla de `/productos` simplificada de 5 botones/fila a **Detalles + Eliminar**.

### Corregido
- **Reactividad/render (Fase 13):** `state_descriptors_fixed` al pasar nodos DOM (`canvas`,
  `contenedor`) y arrays de datos (`serie`) de `$state` a **`$state.raw`** (proxy profundo de Svelte
  chocaba con los property descriptors no-configurables del DOM y con los que Chart.js instrumenta).
- **Lienzo blanco al cambiar de rango:** el `<canvas>` dejaba de existir dentro de la rama
  `{#if cargando}` (lo desmontaba y huérfanaba la instancia `chart`). Ahora el canvas **persiste**
  mientras exista `serie` y `cargando` es un **overlay superpuesto** (`pointer-events:none`, conserva
  el zoom activo).
- **Transferencias (integridad):** `completar` ya no marca "completada" una recepción vacía
  (guard `totalRecibido === 0` con rollback), devuelve al origen la recepción parcial
  (`solicitada - recibida`), valida `lote_id = NULL` y cantidades negativas/exceso. Se reabrió y
  resolvió la transferencia #3 (fuga de stock por el bug anterior).
- **Formulario de recepción** (`/transferencias/[id]`): inputs y botón ahora comparten un único
  `<form>` (antes vivían en forms hermanos y `FormData` no recogía las cantidades).
- **`/transferencias/nueva` (crear):** de retornar `{ success }` (quedarse pegado en el formulario y
  exponerse a duplicar la transferencia con un F5) a **redirect PRG** (`303 → /transferencias`), con
  el toast de éxito disparado desde el callback interior de `use:enhance`.
- **`/reportes`:** `Intl` ahora lee el idioma real del store (`$locale`) con mapeo BCP-47 y doble
  fallback, en vez de una clave inexistente (`app.locale`) que causaba `RangeError` en SSR.
- **Build de producción (`ENOENT: schema.sql`):** `database.ts` leía el esquema con `readFileSync`
  relativo al módulo, que falla en el bundle de Vite (los `.sql` no se copian al directorio de
  chunks). Añadido **fallback a la ruta del source vía `process.cwd()`**, cubriendo dev-Vite, Node
  puro (migraciones) y build-Vite **sin** recurrir a `?raw` (que solo entiende Vite y rompería los
  scripts de migración, restricción documentada en el propio archivo).
- **`use:enhance` (TS2339 `result` no existe):** el callback que inspecciona `result` debe ser el
  **interior** (retorno del exterior), no leer `result` del argumento exterior (fase pre-submit);
  añadido `await update()` para que el redirect/failure se aplique.
- **Firmas de actions:** `throw fail(401)` → `return fail(401)` (`fail` retorna, no lanza; el `throw`
  producía 500) y `throw redirect(...)` sacado del `try` (el `catch` lo atrapaba y lo convertía en
  `fail(400)`, bloqueando la navegación).

### Eliminado
- Action `editar` huérfana en `/productos/[id]` (la subruta `/editar` es el único camino vivo).
- Clave `dashboard.tendenciaStock` de los locales (sustituida por `stockVsMinimo`; sin consumidores).
- `$effect` de `form.success` muerto en `/transferencias/nueva` (el action ahora redirige, no retorna
  `{ success }`).

### Deuda técnica agendada (no bloqueante)
- **Seguridad/roles (fase por definir):** guard de rol + transacción en `productos.eliminar` (hoy
  cualquier autenticado borra y `DELETE`+auditoría no son atómicos).
- **Despliegue (D16):** `adapter-auto` no emite artefacto desplegable sin plataforma; elegir
  `adapter-node`/`adapter-cloudflare`/`adapter-vercel`. Si se opta por serverless, la carga de
  `schema.sql` vía `cwd` fallará en runtime y deberá inlinearse como string. **Prerequisito de la
  Fase 14 (PWA/Offline):** el Service Worker y el "instalar como app" exigen HTTPS en producción,
  y el Web Push pendiente desde 1.7.0 también.
- **Fase 17/18:** job de reconciliación `productos.stock_actual` ↔ `SUM(lotes.cantidad_actual)`;
  unificación de la carga de Chart.js (`auto` estático vs `chart-setup` dinámico); tipo dedicado
  `transferencia_devuelta`; paridad 1:1 gráfico ↔ tabla `predicciones` persistida.
- **Decisión de dominio pendiente:** política de `lote_id = NULL` en transferencias (hoy error) y
  recepción parcial vs total obligatoria (hoy parcial permitida).

---

## [1.10.0] - 2026-10-23

### ✨ Bloque 11.8 · Reporte avanzado multi-hoja (cierre de Fase 11)
- **Vista `/reportes`** (solo admin): resumen ejecutivo con KPIs, stock bajo, lotes por vencer (FEFO), predicciones, anomalías activas y actividad reciente. El informe se *lee en pantalla* y el `.xlsx` pasa a ser una acción dentro de la vista, no un archivo a ciegas.
- **Excel de 6 hojas** (`/api/exportar/reporte-completo`): un solo libro con pestañas Resumen / Stock bajo / Lotes por vencer / Predicciones / Anomalías / Movimientos, con anchos de columna adaptativos y hoja "Sin datos" graceful cuando una sección está vacía.
- **Predicciones calculadas on-the-fly** desde `movimientos` (la tabla `productos` no las persiste), con fórmula transparente (consumo = salidas / días con venta) y nota honesta en la UI. Sustituible por un JOIN a la tabla real de predicciones del dashboard para paridad 1:1 (pendiente: confirmar esquema).
- **Límite de memoria** en la vista (30 movimientos renderizados) vs el Excel (hasta 5.000), para no castigar el DOM en hardware modesto.

### ♻️ Hardening de tipos (Fase 12 → 11.8)
- `state_referenced_locally` corregido: `data.informe` se consume vía `$derived`, preservando la reactividad ante invalidaciones de `load`.
- Los métodos del servicio de reporte devuelven **tipos concretos** (`FilaPrediccionReporte[]`, `FilaLoteReporte[]`, `FilaAnomaliaReporte[]`, `FilaMovimientoReporte[]`, `KPIsReporte`) con mapeo explícito `String()/Number()`, eliminando los casts `as` en el `load`.
- Las constructoras de archivo (`construirXLSX`, `construirLibroMultiHoja`) operan sobre el tipo base `Array<object>`: compatible con toda interfaz y todo `Record`, sin el "cast de la muerte" `as unknown as`. El binario de Excel queda byte-idéntico.
- `error()` sustituye a `fail()` en los endpoints de importación/exportación: los motivos reales (401/403/400/500) llegan al usuario en vez de colapsar en un 500 genérico.

### 🚧 Deuda consciente (no bloqueante, agendada)
- **i18n de moneda:** `Intl.NumberFormat('es-ES', {currency:'EUR'})` está hardcodeado en `/reportes`; debe derivarse del idioma activo (Fase 13/17).
- **Cabeceras del Excel** usan las claves internas en snake_case (`stock_actual`, `dias_hasta_agotar`); un mapa clave→etiqueta las hará legibles para un contador (Fase 17, junto a los gráficos).
- **Paridad 1:1 con el dashboard:** confirmar el esquema de la tabla de predicciones persistida para reemplazar el cálculo on-the-fly.

---

## [1.9.0] - 2026-10-23

### ♻️ Fase 12: Refactorización y unificación del módulo de importación/exportación
- **Tipos compartidos:** los tipos de dominio (`ModoImportacion`, `FilaProducto`, `FilaStockInicial`, `ResultadoImportacion`, `ColumnaPreview`) migran a `lib/types.ts`. Ningún componente `.svelte` vuelve a importar desde `lib/server/`.
- **Componentes reutilizables:** `TablaPreview` (tabla editable + paginación), `ResumenImportacion` (métricas + detalle de errores) y `MenuExportar` (dropdown accesible de exportación). Se elimina el parseo/paginación/resultados duplicados entre las dos vistas de importación.
- **Parser unificado y robusto** (`lib/utils/parseoArchivos.ts`): detección de formato por *magic bytes* (no por extensión), normalización de encabezados (tildes/mayúsculas/espacios→guion bajo), rescate automático de "CSV pegado como texto en una celda de Excel", y corrección del bug de zona horaria en fechas `.xlsx` (`fechaLocalISO` en vez de `toISOString()` UTC).
- **Namespace i18n propio:** `importacion.*` y `exportacion.*`. Se eliminan las claves cruzadas con `admin.*`/`productos.*` y las huérfanas.
- **Seguridad:** guard de rol en las vistas de importación (`+page.server.ts` redirige a no-admins) y restricción de los endpoints de exportación a administradores (antes cualquier usuario logueado podía descargar el catálogo con precios y el historial global).
- **Endpoints de importación** migrados de `fail()` a `error()`: los motivos reales (403/400/500) ahora llegan al usuario en vez de colapsar en un 500 genérico.
- **Hogar unificado de exportación:** los botones sueltos de `/productos` se agrupan en un dropdown accesible (`aria-expanded`, cierre con Escape y click-fuera), coherente con el módulo de importación.

### 🎨 UX
- Scroll automático suave a la previsualización y al resultado en ambas importaciones.
- Botón "Descargar reporte de errores (CSV)" con nombres de archivo distinguibles (`_catalogo` / `_stock`).
- Badge de modalidad y pestañas activas para reforzar visualmente dónde está el usuario.

---

## [1.8.0] - 2026-10-23

### ✨ Fase 11: Gestión Masiva de Datos
- **Importación de catálogo (CSV y Excel)**: vista `/productos/importar` con parseo en el navegador, previsualización paginada de 50 filas, celdas editables, validación visual fila por fila y dos modos: "Crear solo" o "Crear o actualizar" (UPSERT de datos maestros sin tocar stock).
- **Importación de stock (CSV y Excel)**: vista `/productos/importar-stock` que crea lotes y movimientos tipo `entrada` con trazabilidad completa. Si el número de lote ya existe, suma la cantidad (reposición). El stock global se actualiza como consecuencia del movimiento.
- **Exportación CSV y Excel**: catálogo completo e historial de movimientos desde `/api/exportar/*`, con BOM UTF-8 (acentos perfectos en Excel) y anchos de columna optimizados.
- **Plantillas descargables** en CSV y Excel, generadas desde una única fuente de verdad en `static/plantillas/`.
- **Validación y seguridad**: límite de 10.000 filas, transacciones atómicas, reporte de errores con número de fila y motivo, endpoints restringidos a administradores y auditoría de cada importación y exportación.
- **Rendimiento**: la librería SheetJS se carga de forma dinámica solo cuando el usuario sube un archivo Excel; los usuarios de CSV no pagan ese costo.

### 🚧 Pendientes conocidos (se abordarán en fases futuras)
- Refactorización y unificación arquitectónica del módulo de importación/exportación (tipos compartidos, componente de preview reutilizable, namespace de traducciones propio).
- Guard de rol en las vistas de importación (hoy solo los endpoints lo aplican).
- Web Push pendiente de despliegue con HTTPS (infraestructura base ya implementada en la Fase 10).

---

## [1.7.0] - 2026-10-21

### ✨ Fase 10: Comunicación en Tiempo Real
- **Sistema de notificaciones completo**: Tabla `notificaciones` con 5 tipos de eventos (`stock_bajo`, `anomalia_detectada`, `transferencia_completada`, `transferencia_cancelada`, `lote_por_vencer`).
- **Disparadores automáticos**: Integrados en los servicios de movimientos, anomalías y transferencias.
- **Tiempo real con SSE**: Endpoint `/api/notificaciones/stream` con polling interno de 5 segundos para mantener el contador del Navbar actualizado sin recargar la página.
- **Panel `/notificaciones`**: Filtros por tipo y estado, paginación, marcado como leída con un clic (estilo Gmail) con reactividad instantánea en el cliente, y eliminación individual/masiva.
- **Campana en Navbar**: Popover con las últimas 5 notificaciones no leídas y contador en tiempo real.
- **Preferencias por usuario**: Cada usuario puede activar/desactivar tipos específicos de notificaciones.
- **Favicon profesional**: Nuevo logo SVG con degradado morado-azul para pestañas, favoritos y futuras notificaciones push.

### ⚠️ Nota técnica sobre escalabilidad del SSE
El sistema actual utiliza **SSE con polling interno de 5 segundos** (un `SELECT COUNT` indexado por conexión abierta). Esta decisión arquitectónica fue tomada por su bajo consumo de recursos (ideal para el hardware actual) y su reconexión nativa. Funciona óptimamente hasta ~500-1000 usuarios concurrentes. Para escalar más allá, se recomienda migrar a una arquitectura pub/sub (Redis/WebSockets).

### 🚧 Pendiente para Producción (Web Push)
- **Notificaciones Push del Navegador**: La infraestructura base (Service Worker, tabla de suscripciones y claves VAPID) está implementada y probada en Chrome. Sin embargo, su activación completa se deja pendiente para el despliegue en producción, ya que la API de Push requiere obligatoriamente **HTTPS** y configuración de dominio para funcionar de manera estable en todos los navegadores (especialmente Edge/Safari).

---

## [1.6.1] - 2026-10-18
### ✨ Mejoras de UX

- **Sistema global de toasts**: Notificaciones de éxito unificadas, con duración de 4.5s, apilamiento automático y cierre manual.
- **Limpieza visual**: Eliminación de banners de éxito inline en formularios de administración, productos, movimientos, transferencias, simulación, perfil y anomalías.
- **Persistencia inteligente**: Los errores de validación y los secretos de API/Webhooks siguen mostrándose inline, ya que requieren atención o acción del usuario.
- **Eliminación de deuda técnica**: Removido el componente obsoleto `ToastFeedback.svelte`.

---

## [1.6.0] - 2026-10-18

### ✨ Nuevas funcionalidades

- **API pública RESTful**: endpoints para consulta de productos, stock por ubicación y registro de movimientos
- **Autenticación por API keys**: claves hasheadas con scopes granulares (productos:leer, stock:leer, movimientos:escribir)
- **Sistema de webhooks**: notificaciones push con firma HMAC-SHA256, cola de reintentos con backoff exponencial
- **Panel de gestión de integraciones**: CRUD de API keys y webhooks, logs de llamadas API, historial de entregas de webhooks
- **Documentación OpenAPI**: especificación completa con ejemplos de uso en curl, JavaScript y Python
- **Rate limiting por API key**: 120 peticiones por minuto con respuesta 429 al exceder el límite

### 🔒 Seguridad

- API keys hasheadas con SHA-256 (nunca se almacenan en texto plano)
- Secreto de webhook firmado con HMAC para verificación de autenticidad
- Validación de scopes en cada endpoint (rechazo 403 si el scope es insuficiente)
- Logs inmutables de todas las llamadas API con duración, código de respuesta e IP de origen

### 🏗️ Arquitectura

- Migración 014: tablas api_keys, webhooks, webhook_entregas, api_logs
- Servicio apiGateway para autenticación, rate limiting y logging centralizado
- Worker de webhooks con procesamiento asíncrono y reintentos automáticos (30s, 5min, 30min, 2h, 24h)
- Documentación OpenAPI 3.0 servida como JSON estático

---

## 1.5.0 (2026-10-18)
* Multi ubicación: nueva tabla de ubicaciones con soporte para almacenes, tiendas y centros de distribución, administrables desde el panel con permisos de rol.
* Transferencias en tránsito: flujo completo de origen a destino con validación de stock, descuento inmediato en origen y confirmación de recepción en destino.
* Trazabilidad por ubicación: los lotes y movimientos ahora registran su ubicación, permitiendo reportes de stock consolidado por almacén o tienda.
* Cancelación segura: las transferencias canceladas devuelven automáticamente el stock no recibido al origen, con registro de auditoría.
* Dashboard logístico: resumen de ubicaciones activas, stock total del sistema, stock por vencer y transferencias en tránsito visibles de un vistazo.
* Navegación contextual: el botón de retorno en ubicaciones adapta su destino y su texto según el punto de entrada del usuario.
* Migraciones 012 y 013: creación de tablas logísticas y ampliación segura de los tipos de movimiento mediante recreación de tabla sin pérdida de datos.

---

## 1.4.0 (2026-10-18)
* Sesiones persistentes: migracion de autenticacion a tokens opacos hasheados en base de datos, permitiendo listar dispositivos activos y cierre de sesiones remoto individual o masivo.
* Defensas en el servidor: implementacion de rate limiting para bloquear intentos de login fallidos y cambios excesivos de contrasena, con registro automatico en auditoria.
* Perfil unificado y endurecido: formulario unico para editar datos, correo y preferencias, con reautenticacion obligatoria para cambios sensibles y medidor de fortaleza de contrasena en tiempo real.
* Experiencia de usuario mejorada: errores de validacion mostrados junto al campo correspondiente, estados de carga en botones para evitar envios dobles y seccion de actividad reciente siempre visible.
* Preferencias sincronizadas: el idioma y el tema seleccionados se guardan en la base de datos y se aplican automaticamente al iniciar sesion en cualquier dispositivo.
* Autenticacion de dos factores (2FA): soporte completo para TOTP con generacion de QR, validacion de codigos y gestion de codigos de recuperacion de un solo uso.

---

## 1.3.0 (2026-10-16)
- Historial de auditoría inmutable: registro automático de todas las acciones críticas del sistema con marca de tiempo, usuario, IP y detalles.
- Tabla `auditoria` con triggers de SQLite que garantizan inmutabilidad: ni UPDATE ni DELETE permitidos.
- Vista `/auditoria` exclusiva para administradores con filtros combinables (fecha, usuario, acción) y paginación de 50 registros.
- Exportación de auditoría en CSV y PDF respetando los filtros activos.
- Instrumentación completa: login/logout, CRUD de productos, movimientos, administración de usuarios, cambios de perfil, umbrales del monitor.
- Foto fija del autor: el nombre del usuario se congela al momento de la acción, sobreviviendo a eliminaciones o renombrados posteriores.

---

## 1.2.0 (2026-10-16)
- Monitor de anomalías: detección automática por z-score y desviación porcentual con ventana móvil de 7 días cerrados.
- Panel `/anomalias` con explicación contextual en lenguaje natural ("veces más" o "veces menos"), detalle diario desplegable y clasificación en revisada o falso positivo.
- Badge contador de pendientes en el Navbar y tarjeta de métrica púrpura en el Dashboard.
- Umbrales configurables (z-score, porcentaje y días consecutivos) desde el Panel de Administración, con botón de barrido global manual.
- Detección automática y ligera al registrar cada salida de stock, sin bloquear la operación.
- Ayudas contextuales en lenguaje plano para los umbrales del monitor.

---

## 1.1.0 (2026-10-13)
- Simulador de escenarios What-if con comparador interactivo base vs simulación.
- Guardado, carga y eliminación de escenarios simulados por usuario.
- Sistema de versión visible en login, footer global, menú de perfil y reportes PDF.

---

## 1.0.0 (2026-10-10)
- Base estable: autenticación con roles, internacionalización es/en, series de tiempo
  con estacionalidad, lotes con lógica FEFO, reportes PDF, códigos QR,
  panel de administración, perfil de usuario y estilos centralizados.