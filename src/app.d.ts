// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Locals {
      usuario: {
        id: number;
        nombre: string;
        email: string;
        rol: 'admin' | 'empleado';
      } | undefined;
    }
  }
}
export {};