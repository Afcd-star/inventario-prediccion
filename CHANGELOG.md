# Changelog de StockPredict Pro

Formato: versión semántica MAYOR.MENOR.PARCHES.
Regla del proyecto: el cambio de versión viaja en el mismo commit que la funcionalidad.

## [1.6.1] - 2026-10-18
### ✨ Mejoras de UX

- **Sistema global de toasts**: Notificaciones de éxito unificadas, con duración de 4.5s, apilamiento automático y cierre manual.
- **Limpieza visual**: Eliminación de banners de éxito inline en formularios de administración, productos, movimientos, transferencias, simulación, perfil y anomalías.
- **Persistencia inteligente**: Los errores de validación y los secretos de API/Webhooks siguen mostrándose inline, ya que requieren atención o acción del usuario.
- **Eliminación de deuda técnica**: Removido el componente obsoleto `ToastFeedback.svelte`.

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

## 1.5.0 (2026-10-18)
* Multi ubicación: nueva tabla de ubicaciones con soporte para almacenes, tiendas y centros de distribución, administrables desde el panel con permisos de rol.
* Transferencias en tránsito: flujo completo de origen a destino con validación de stock, descuento inmediato en origen y confirmación de recepción en destino.
* Trazabilidad por ubicación: los lotes y movimientos ahora registran su ubicación, permitiendo reportes de stock consolidado por almacén o tienda.
* Cancelación segura: las transferencias canceladas devuelven automáticamente el stock no recibido al origen, con registro de auditoría.
* Dashboard logístico: resumen de ubicaciones activas, stock total del sistema, stock por vencer y transferencias en tránsito visibles de un vistazo.
* Navegación contextual: el botón de retorno en ubicaciones adapta su destino y su texto según el punto de entrada del usuario.
* Migraciones 012 y 013: creación de tablas logísticas y ampliación segura de los tipos de movimiento mediante recreación de tabla sin pérdida de datos.

## 1.4.0 (2026-10-18)
* Sesiones persistentes: migracion de autenticacion a tokens opacos hasheados en base de datos, permitiendo listar dispositivos activos y cierre de sesiones remoto individual o masivo.
* Defensas en el servidor: implementacion de rate limiting para bloquear intentos de login fallidos y cambios excesivos de contrasena, con registro automatico en auditoria.
* Perfil unificado y endurecido: formulario unico para editar datos, correo y preferencias, con reautenticacion obligatoria para cambios sensibles y medidor de fortaleza de contrasena en tiempo real.
* Experiencia de usuario mejorada: errores de validacion mostrados junto al campo correspondiente, estados de carga en botones para evitar envios dobles y seccion de actividad reciente siempre visible.
* Preferencias sincronizadas: el idioma y el tema seleccionados se guardan en la base de datos y se aplican automaticamente al iniciar sesion en cualquier dispositivo.
* Autenticacion de dos factores (2FA): soporte completo para TOTP con generacion de QR, validacion de codigos y gestion de codigos de recuperacion de un solo uso.

## 1.3.0 (2026-10-16)
- Historial de auditoría inmutable: registro automático de todas las acciones críticas del sistema con marca de tiempo, usuario, IP y detalles.
- Tabla `auditoria` con triggers de SQLite que garantizan inmutabilidad: ni UPDATE ni DELETE permitidos.
- Vista `/auditoria` exclusiva para administradores con filtros combinables (fecha, usuario, acción) y paginación de 50 registros.
- Exportación de auditoría en CSV y PDF respetando los filtros activos.
- Instrumentación completa: login/logout, CRUD de productos, movimientos, administración de usuarios, cambios de perfil, umbrales del monitor.
- Foto fija del autor: el nombre del usuario se congela al momento de la acción, sobreviviendo a eliminaciones o renombrados posteriores.

## 1.2.0 (2026-10-16)
- Monitor de anomalías: detección automática por z-score y desviación porcentual con ventana móvil de 7 días cerrados.
- Panel `/anomalias` con explicación contextual en lenguaje natural ("veces más" o "veces menos"), detalle diario desplegable y clasificación en revisada o falso positivo.
- Badge contador de pendientes en el Navbar y tarjeta de métrica púrpura en el Dashboard.
- Umbrales configurables (z-score, porcentaje y días consecutivos) desde el Panel de Administración, con botón de barrido global manual.
- Detección automática y ligera al registrar cada salida de stock, sin bloquear la operación.
- Ayudas contextuales en lenguaje plano para los umbrales del monitor.

## 1.1.0 (2026-10-13)
- Simulador de escenarios What-if con comparador interactivo base vs simulación.
- Guardado, carga y eliminación de escenarios simulados por usuario.
- Sistema de versión visible en login, footer global, menú de perfil y reportes PDF.

## 1.0.0 (2026-10-10)
- Base estable: autenticación con roles, internacionalización es/en, series de tiempo
  con estacionalidad, lotes con lógica FEFO, reportes PDF, códigos QR,
  panel de administración, perfil de usuario y estilos centralizados.