import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
  default: ({ cookies }) => {
    cookies.delete('sesion', { path: '/' });
    throw redirect(303, '/login');
  }
} satisfies Actions;