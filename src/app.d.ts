// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      usuario?: {
        id: number;
        nombre: string;
        email: string;
        rol: 'admin' | 'empleado';
      };
      preSesionUsuarioId?: number;
      preferencias?: {
        idioma_preferido: string;
        tema_preferido: string;
      };
    }
  }
}

export {};