# Changelog de StockPredict Pro

Formato: versión semántica MAYOR.MENOR.PARCHES.
Regla del proyecto: el cambio de versión viaja en el mismo commit que la funcionalidad.

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