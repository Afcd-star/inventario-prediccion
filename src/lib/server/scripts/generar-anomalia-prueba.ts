// Script de prueba Fase 5: inyecta 3 días de ventas anómalas
// y dispara el motor de detección para verificar que crea una anomalía.
import db from '../database';
import { anomaliasService } from '../services/anomalias.service';

const productoId = Number(process.argv[2] ?? 1);

const existe = db.prepare('SELECT id FROM productos WHERE id = ?').get(productoId);
if (!existe) {
  console.error(`❌ No existe un producto con ID ${productoId}.`);
  process.exit(1);
}

const insertar = db.prepare(`
  INSERT INTO movimientos (producto_id, tipo, cantidad, fecha, notas)
  VALUES (?, 'salida', ?, ?, 'Venta anómala de prueba')
`);

const inyectar = db.transaction(() => {
  db.prepare(`
    DELETE FROM movimientos
    WHERE producto_id = ? AND notas = 'Venta anómala de prueba'
  `).run(productoId);

  for (let diasAtras = 3; diasAtras >= 1; diasAtras--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    insertar.run(productoId, 45, fecha.toISOString());
  }
});

inyectar();
console.log('💉 3 días de ventas anómalas (45 unidades por día) inyectados.');

const anomalia = anomaliasService.detectarParaProducto(productoId);
if (anomalia) {
  console.log(`🚨 Anomalía creada: tipo ${anomalia.tipo}, desviación promedio ${anomalia.desviacion_promedio.toFixed(1)}%, z máx ${anomalia.z_score_max.toFixed(2)}`);
  console.log(`📋 Pendientes actuales: ${anomaliasService.contarPendientes()}`);
} else {
  console.log('ℹ️ No se detectó anomalía nueva.');
  console.log('   Revisa: (1) que el producto tenga 14+ días de historial,');
  console.log('   (2) que no exista ya una anomalía con esta misma fecha de inicio.');
}