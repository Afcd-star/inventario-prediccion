import db from '$lib/server/database';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Producto } from '$lib/types';

export const load = (async ({ params, locals }) => {
  // Guard de autenticación (antes ausente: el 500 por falta de +page.svelte lo ocultaba).
  if (!locals.usuario) throw redirect(303, '/login');

  // Validación dura del id: /productos/abc ya no depende de cómo SQLite trata NaN.
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { producto: null, rol: locals.usuario.rol };
  }

  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(id) as Producto | undefined;

  return { producto: producto ?? null, rol: locals.usuario.rol };
}) satisfies PageServerLoad;