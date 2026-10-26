import db from '$lib/server/database';
import { redirect } from '@sveltejs/kit';
import { proveedoresService } from '$lib/server/services/proveedores.service';
import type { PageServerLoad } from './$types';
import type { Producto } from '$lib/types';

export const load = (async ({ params, locals }) => {
  if (!locals.usuario) throw redirect(303, '/login');

  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { producto: null, rol: locals.usuario.rol, proveedores: [] };
  }

  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(id) as Producto | undefined;

  // Solo proveedores ACTIVOS (el service filtra WHERE pr.activa = 1).
  // Se calcula solo si el producto existe, para no consultar por un id inválido.
  const proveedores = producto
    ? proveedoresService.obtenerProveedoresDelProducto(id)
    : [];

  return { producto: producto ?? null, rol: locals.usuario.rol, proveedores };
}) satisfies PageServerLoad;