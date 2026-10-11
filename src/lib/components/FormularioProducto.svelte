<script lang="ts">
  import type { Producto } from '$lib/types';

  interface Props {
    producto?: Producto;
    accion: 'crear' | 'editar';
  }

  let { producto, accion }: Props = $props();

  // $derived le dice a Svelte que esto se recalcula si 'accion' cambia
  const esEdicion = $derived(accion === 'editar');
</script>

<form method="POST" action="?/{accion}" class="product-form">
  <div class="form-field">
    <label for="nombre">Nombre</label>
    <input
      id="nombre"
      type="text"
      name="nombre"
      value={producto?.nombre ?? ''}
      required
    />
  </div>

  <div class="form-field">
    <label for="precio">Precio</label>
    <input
      id="precio"
      type="number"
      name="precio"
      step="0.01"
      min="0"
      value={producto?.precio ?? 0}
      required
    />
  </div>

  <div class="stock-fields">
    <div class="form-field">
      <label for="stock">Stock Actual</label>
      <input
        id="stock"
        type="number"
        name="stock"
        min="0"
        value={producto?.stock_actual ?? 0}
        required
      />
    </div>
    <div class="form-field">
      <label for="minimo">Stock Mínimo</label>
      <input
        id="minimo"
        type="number"
        name="minimo"
        min="0"
        value={producto?.stock_minimo ?? 10}
        required
      />
    </div>
  </div>

  <div class="form-actions">
    <a href="/productos" class="btn btn-secondary">
      Cancelar
    </a>
    <button type="submit" class="btn btn-primary">
      {esEdicion ? 'Guardar Cambios' : 'Crear Producto'}
    </button>
  </div>
</form>

<style>
  .product-form {
    display: grid;
    gap: 1.25rem;
  }

  .stock-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .form-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.25rem;
  }

  @media (max-width: 480px) {
    .stock-fields {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .form-actions :global(.btn) {
      width: 100%;
    }
  }
</style>