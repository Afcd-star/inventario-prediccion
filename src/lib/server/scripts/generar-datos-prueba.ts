// Script de prueba: genera 30 días de ventas ficticias para el simulador.
// Importa sqlite.ts (no database.ts) porque sqlite.ts no tiene imports
// específicos de Vite y por tanto funciona con npx tsx sin problemas.
import db from '../sqlite';
import { prediccionService } from '../prediccion.service';

// ID del producto: se pasa como argumento. Ej: npx tsx .../generar-datos-prueba.ts 3
const productoId = Number(process.argv[2] ?? 1);

const producto = db.prepare(
  'SELECT id, created_at FROM productos WHERE id = ?'
).get(productoId) as { id: number; created_at: string } | undefined;
if (!producto) {
  console.error(`❌ No existe un producto con ID ${productoId}.`);
  process.exit(1);
}

const insertar = db.prepare(`
  INSERT INTO movimientos (producto_id, tipo, cantidad, fecha, notas)
  VALUES (?, 'salida', ?, ?, 'Dato de prueba generado automáticamente')
`);

const hoy = new Date();
const fechaMasAntigua = new Date(hoy);
fechaMasAntigua.setDate(fechaMasAntigua.getDate() - 30);

const generar = db.transaction((id: number) => {
  db.prepare(`
    DELETE FROM movimientos
    WHERE producto_id = ? AND notas = 'Dato de prueba generado automáticamente'
  `).run(id);

  // El simulador ignora movimientos anteriores a la creación del producto.
  db.prepare(`
    UPDATE productos
    SET created_at = ?
    WHERE id = ? AND date(created_at) > date(?)
  `).run(fechaMasAntigua.toISOString(), id, fechaMasAntigua.toISOString());

  for (let diasAtras = 30; diasAtras >= 1; diasAtras--) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);

    // Patrón semanal intencional: más ventas viernes y sábado
    const diaSemana = fecha.getDay();
    const base = 2 + Math.floor(Math.random() * 5);
    const extra = diaSemana === 5 || diaSemana === 6 ? 4 : 0;

    insertar.run(id, base + extra, fecha.toISOString());
  }
});

generar(productoId);
prediccionService.calcularParaProducto(productoId);
console.log(`🎉 30 días de ventas generados para el producto ${productoId}.`);
console.log('📈 Predicciones y tendencias recalculadas para el producto.');
if (new Date(producto.created_at) > fechaMasAntigua) {
  console.log('📅 Se retrocedió la fecha de creación del producto para que el simulador cuente el historial de prueba.');
}
console.log('Ya puedes entrar a /simulacion y probar el simulador.');