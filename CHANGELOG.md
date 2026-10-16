# Changelog de StockPredict Pro

Formato: versión semántica MAYOR.MENOR.PARCHES.
Regla del proyecto: el cambio de versión viaja en el mismo commit que la funcionalidad.

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