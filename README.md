# 📦 StockPredict Pro

Sistema web de gestión de inventario para pequeñas tiendas y almacenes. Combina control de stock
por lotes y ubicaciones con un motor de predicción que estima cuándo se agotará cada producto y
recomienda la fecha de reorden, todo con trazabilidad auditável y visualización histórica.

## Características

**Inventario y lotes**
- CRUD de productos con búsqueda y filtros.
- Control por lotes con lógica FEFO (first-expired, first-out) y fechas de caducidad.
- Registro de entradas y salidas con historial completo y validación de stock.
- Importación masiva de catálogo y de stock (CSV/Excel) con previsualización editable y reporte
  de errores por fila; exportación a CSV/Excel con plantillas descargables.

**Predicción y analítica**
- Consumo promedio diario, días hasta agotarse y fecha recomendada de reorden.
- Monitor de anomalías con detección automática (z-score y desviación porcentual) y panel de
  clasificación de alertas.
- Simulador de escenarios *what-if* con comparador base vs simulación.
- Visualización histórica: series temporales rebobinadas desde los movimientos, gráficos
  interactivos con zoom y exportación a PNG, e informes multi-hoja.

**Logística multi-ubicación**
- Almacenes, tiendas y centros de distribución con stock rastreado por ubicación.
- Transferencias en tránsito con confirmación de recepción, devolución de sobrantes y
  cancelación segura.

**Seguridad y cuentas**
- Autenticación con roles (admin/empleado), sesiones persistentes con invalidación remota y 2FA
  (TOTP con códigos de recuperación).
- Rate limiting, historial de auditoría inmutable y perfil de usuario con preferencias
  sincronizadas (idioma y tema).

**Tiempo real e integración**
- Notificaciones automáticas con streaming SSE y contador en vivo en el navbar.
- API pública RESTful con claves de acceso por scopes y webhooks con reintentos.

**Experiencia**
- Internacionalización español/inglés, modo claro/oscuro, sistema de toasts y diseño responsivo
  con variables CSS centralizadas.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Framework | SvelteKit (Svelte 5, runes) |
| Lenguaje | TypeScript |
| Base de datos | SQLite (`better-sqlite3`) |
| Gráficos | Chart.js (carga dinámica, SSR-safe) |
| i18n | svelte-i18n |
| Exportación | SheetJS (carga diferida), generación de PDF |

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

```bash
npm install
npm run dev

La aplicación levanta un servidor local. La base de datos SQLite (`database.db`) se crea e inicializa automáticamente con sus migraciones al primer arranque.

## Primer usuario

Este repositorio no publica credenciales ni base de datos. Al arrancar con una base de datos
vacía (primer `npm run dev`, o un clon nuevo), el sistema crea automáticamente un usuario
administrador:

- Si defines `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `.env`, se usa ese par.
- Si no, se crean credenciales por defecto (`admin@stockpredict.local` / `CHANGE_ME_admin`) y la
  consola emite un aviso para que las cambies.

En cualquier caso, cámbiala desde **Perfil → Cambiar contraseña** tras el primer acceso. La gestión
de usuarios y roles se realiza desde el Panel de Administración.

> La creación del administrador es idempotente: si la tabla de usuarios ya tiene registros (por
> ejemplo, porque creaste usuarios desde el panel), el sistema no crea ni sobrescribe ninguno.

## Scripts

|Comando|Descripción|
|---|---|
|`npm run dev`|Servidor de desarrollo.|
|`npm run build`|Compilación de producción.|
|`npm run preview`|Previsualización local del build de producción.|
|`npm run check`|Verificación de tipos y avisos del compilador de Svelte.|

## Documentación

- [`CHANGELOG.md`](./CHANGELOG.md) — historial detallado de releases.
- [`ROADMAP.md`](./ROADMAP.md) — fases del proyecto, estado actual y deudas técnicas.
- [`REGISTRO.md`](./REGISTRO.md) y [`Estructura de Archivos Principal.md`](./Estructura%20de%20Archivos%20Principal.md) — registros históricos de etapas tempranas, conservados como referencia.

## Estado del proyecto

El sistema se encuentra en desarrollo activo y es funcional de punta a punta en entorno local. El despliegue en producción (y con ello el modo offline/PWA y las notificaciones push, que requieren HTTPS) está planificado; ver la sección de habilitadores en `ROADMAP.md`.