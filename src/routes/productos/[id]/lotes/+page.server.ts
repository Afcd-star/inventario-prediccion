import db from '$lib/server/database';
import { lotesService } from '$lib/server/lotes.service';
import type { Producto } from '$lib/types';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?')
    .get(Number(params.id)) as Producto | undefined;

  if (!producto) {
    throw redirect(303, '/productos');
  }

  const lotes = lotesService.obtenerTodosLotesProducto(producto.id).map(lote => ({
    ...lote,
    dias_restantes: lote.numero_lote.startsWith('APERTURA-')
      ? null
      : lotesService.calcularDiasRestantes(lote.fecha_caducidad)
  }));

  return { producto, lotes };
}) satisfies PageServerLoad;
