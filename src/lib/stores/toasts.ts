import { writable } from 'svelte/store';

export type TipoToast = 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  mensaje: string;
  tipo: TipoToast;
  creadoEn: number;
}

const DURACION_MS = 4500;

function crearStoreToasts() {
  const { subscribe, update } = writable<Toast[]>([]);

  function agregar(mensaje: string, tipo: TipoToast = 'success'): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, mensaje, tipo, creadoEn: Date.now() };

    update(lista => [...lista, toast]);

    // Auto eliminación tras 4.5 segundos
    setTimeout(() => {
      update(lista => lista.filter(t => t.id !== id));
    }, DURACION_MS);

    return id;
  }

  function eliminar(id: string): void {
    update(lista => lista.filter(t => t.id !== id));
  }

  function limpiar(): void {
    update(() => []);
  }

  return { subscribe, agregar, eliminar, limpiar };
}

export const toasts = crearStoreToasts();

/**
 * API pública para mostrar un toast desde cualquier parte de la aplicación.
 *
 * @example
 * mostrarToast('Producto creado correctamente', 'success');
 * mostrarToast('Se detectaron 3 anomalías nuevas', 'info');
 */
export function mostrarToast(mensaje: string, tipo: TipoToast = 'success'): void {
  toasts.agregar(mensaje, tipo);
}