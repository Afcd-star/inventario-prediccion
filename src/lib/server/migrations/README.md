# Migraciones de esquema

Cada archivo es una migración que se aplicó una única vez a bases de datos
que ya existían antes del cambio. Están numeradas en orden de creación.

* No se ejecutan al iniciar el servidor: nada las importa.
* Las instalaciones nuevas no las necesitan: schema.sql contiene el esquema completo.
* Para aplicarlas a una base de datos antigua, ejecuta el archivo con npx tsx.

## Orden

1. 001_series_tiempo.ts: tendencia, volatilidad, patrones y prediccion_30_dias en predicciones.
2. 002_lotes.ts: tabla lotes y campo lote_id en movimientos.