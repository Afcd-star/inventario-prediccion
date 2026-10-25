# Roadmap de StockPredict Pro

Mapa de fases, estado y deudas técnicas del proyecto. El detalle de cada release se encuentra en
[`CHANGELOG.md`](./CHANGELOG.md); este documento describe qué se ha construido, qué está en pausa
y qué queda por hacer.

## Fases

| Fase | Ámbito | Estado |
| --- | --- | --- |
| 1–12 | Internacionalización, series de tiempo, lotes/FEFO, simulación, anomalías, auditoría, multi-ubicación, API/webhooks, notificaciones, import/export, reportes y refactorización del módulo de datos. | Completadas (hasta v1.10.0) |
| 13 | Visualización histórica: motor de series, componente de gráfico reutilizable, dashboard a pestañas, ficha de producto e integridad de transferencias. | Completada (v1.11.0) |
| 14 | Resiliencia offline / PWA. | En pausa (ver habilitadores) |
| 15 | Ecosistema de proveedores y órdenes de compra. | Planificada |
| 16 | Identidad visual y sistema de iconos SVG (refactorización). | Planificada |
| 17 | Reportes avanzados y analítica de negocio. | Planificada |
| 18 | Mejora del modelo predictivo (estadística clásica, sin GPU). | Planificada |

## Fase 14 — habilitadores antes de retomarla

La fase offline/PWA está en pausa de forma deliberada. Antes de codearla conviene resolver dos
dependencias estructurales, descritas aquí para no tener que re-derivarlas al retomar el trabajo:

- **Despliegue con HTTPS.** El Service Worker y la instalación como aplicación requieren un
  entorno de producción con HTTPS. Hoy el proyecto usa `@sveltejs/adapter-auto`, que no emite un
  artefacto desplegable sin plataforma detectada; al reanudar la fase habrá que elegir un adapter
  (`adapter-node`, `adapter-cloudflare` o `adapter-vercel`). Esto también desbloquea las
  notificaciones push, pendientes desde v1.7.0 por la misma razón.
- **Reconciliación de stock.** El modo offline introduce dos fuentes de verdad (la base de datos
  del servidor y el almacenamiento local del cliente). Conviene disponer antes de un chequeo que
  compare `productos.stock_actual` con la suma de `lotes.cantidad_actual` por producto y alerte
  discrepancias, de modo que cualquier divergencia introducida por la sincronización sea visible
  en lugar de silenciosa.

El diseño de la sincronización y de la autenticación sin conexión no se ha iniciado; requiere
revisar el flujo de sesión y los endpoints de movimientos antes de implementarlo.

## Deudas técnicas

| Identificador | Descripción | Fase destino |
| --- | --- | --- |
| D1 | `productos.eliminar` sin verificación de rol ni transacción atómica. | 16 |
| D2 | Reconciliación `productos.stock_actual` ↔ `SUM(lotes.cantidad_actual)`. | 14 (habilitador) |
| D3 | Política de `lote_id = NULL` en transferencias (hoy se rechaza). | Decisión de dominio |
| D4 | Recepción parcial frente a total obligatoria en transferencias. | Decisión de dominio |
| D8 | Unificar la carga de Chart.js (estática en dashboard, dinámica en el componente). | 17 |
| D9 | Tipo de movimiento dedicado para devoluciones parciales (`transferencia_devuelta`). | 17 |
| D10 | Paridad entre el gráfico y la tabla de predicciones persistida. | 17 |
| D16 | Elegir adapter de producción y validar la carga del esquema en ese entorno. | 14 (habilitador) |

D3 y D4 son decisiones de negocio (cómo debe comportarse una transferencia en casos límite), no
defectos; se resolverán cuando se defina la política de lotes del proyecto.

## Consideraciones de rendimiento

El desarrollo se realiza en un portátil con 8 GB de RAM y gráficos integrados. Las fases 15, 16 y
17.1–17.4 no dependen de mayor hardware: sus cálculos se ejecutan en el servidor (SQLite agrega
con rapidez) y el cliente solo representa series resumidas, siguiendo el patrón ya validado en la
fase 13. La fase 14 (precachado y almacenamiento local), la 17.5 (tareas programadas nocturnas) y
la 18 (entrenamiento de modelos) se benefician de un equipo más potente o cambian de enfoque según
los recursos disponibles; la 18 se plantea como cálculo precomputado nocturno, viable incluso en
el hardware actual.

## Documentos históricos

[`REGISTRO.md`](./REGISTRO.md) y [`Estructura de Archivos Principal.md`](./Estructura%20de%20Archivos%20Principal.md)
son registros de etapas tempranas del proyecto. Se conservan como referencia del punto de partida;
la descripción vigente de fases y estado es la de este documento.