import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
  return {
    usuario: locals.usuario
  };
}) satisfies LayoutServerLoad;