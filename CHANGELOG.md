# Changelog de StockPredict Pro

Formato: versión semántica MAYOR.MENOR.PARCHES.
Regla del proyecto: el cambio de versión viaja en el mismo commit que la funcionalidad.

## 1.4.0 (2026.10.18)
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