# Registro de Avances

## Fase 1: Configuración Inicial - Completada el 23/09/2026

### Métricas cuantitativas
- Tamaño del proyecto (sin node_modules): ~50 KB
- node_modules: ~180 MB
- RAM consumida durante `npm run dev`: ~350 MB
- Tiempo de inicio del servidor: ~800 ms

### Métricas cualitativas
- Instalación clara y sin errores
- Cortafuegos fue el único obstáculo inicial
- El servidor arranca rápido

### Commits realizados
- feat: inicialización del proyecto con SvelteKit, Chart.js y better-sqlite3
- docs: README inicial con descripción del proyecto

## Fase 2: Diseño de Base de Datos - Completada el [FECHA]

### Métricas cuantitativas
- Tablas creadas: 3 (productos, movimientos, predicciones)
- Índices creados: 3
- Tamaño de database.db inicial: ~20 KB
- Tiempo de inicialización: <100ms

### Métricas cualitativas
- SQLite es extremadamente rápido y no consume RAM extra.
- La inicialización automática es muy conveniente.

### Commits realizados
- feat: diseño e inicialización de base de datos SQLite



## Fase 4: Registro de Movimientos - Completada el 28/09/2026

### Métricas cuantitativas
- Archivos creados: 5 (movimientos.service.ts, FormularioMovimiento.svelte, HistorialMovimientos.svelte, [id]/movimientos/+page.server.ts, [id]/movimientos/+page.svelte)
- Transacciones SQLite implementadas: 1
- Validaciones de stock: 1 (prevención de stock negativo)
- Tiempo de respuesta del formulario: <500ms

### Métricas cualitativas
- La arquitectura de servicio aísla la lógica de negocio de las rutas.
- Las transacciones garantizan integridad de datos.
- La interfaz es clara y muestra el historial en tiempo real.
- Se mejoró la UX con validación dinámica en el frontend (entradas sin límite, salidas limitadas al stock).

### Commits realizados
- feat: registro de movimientos con transacciones y actualización automática de stock
- feat: correccion de ruta de creacion y mejora de accesibilidad en formulario de movimientos

### Próximos pasos
- Fase 5: Sistema de Predicción