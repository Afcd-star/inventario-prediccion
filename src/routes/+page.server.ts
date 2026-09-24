// Importamos la base de datos. 
// Solo con importarla, SvelteKit ejecutará el código de conexión e inicialización.
import db from '$lib/server/database';

export async function load() {
  // Consulta de prueba para verificar que la DB está conectada
  const result = db.prepare('SELECT COUNT(*) as count FROM productos').get();
  
  return {
    mensaje: 'Base de datos conectada exitosamente',
    productosExistentes: (result as { count: number }).count
  };
}