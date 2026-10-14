# Migraciones de esquema

Cada archivo es una migración que se aplicó una única vez a bases de datos
que ya existían antes del cambio. Están numeradas en orden de creación.

* No se ejecutan al iniciar el servidor: nada las importa.
* Las migraciones 001, 002 y 004 se aplican al iniciar el servidor; `003` se ejecuta manualmente en bases antiguas.
* Para aplicarlas a una base de datos antigua, ejecuta el archivo con npx tsx.

## Orden

1. 001_series_tiempo.ts: tendencia, volatilidad, patrones y prediccion_30_dias en predicciones.
2. 002_lotes.ts: tabla lotes y campo lote_id en movimientos.
3. 003_escenarios.ts: tabla escenarios para simulaciones What-if.
4. 004_eliminar_unidad_medida.ts: elimina unidad_medida de productos.