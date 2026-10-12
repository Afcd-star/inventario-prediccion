<script lang="ts">
  import type { Producto } from '$lib/types';
  import { _ } from 'svelte-i18n';

  interface Props {
    producto?: Producto;
    accion: 'crear' | 'editar';
  }

  let { producto, accion }: Props = $props();

  // $derived le dice a Svelte que esto se recalcula si 'accion' cambia
  const esEdicion = $derived(accion === 'editar');
  let stock = $state(0);
</script>

<form method="POST" action="?/{accion}" class="product-form">
  <div class="form-field">
    <label for="nombre">{$_('productos.nombre')}</label>
    <input
      id="nombre"
      type="text"
      name="nombre"
      value={producto?.nombre ?? ''}
      required
    />
  </div>

  <div class="form-field">
    <label for="precio">{$_('productos.precio')}</label>
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
      {#if esEdicion}
        <label for="stockActual">{$_('productos.stockActual')}</label>
        <output id="stockActual" class="stock-value">{producto?.stock_actual ?? 0}</output>
      {:else}
        <label for="stock">{$_('productos.stockActual')}</label>
        <input id="stock" type="number" name="stock" min="0" bind:value={stock} required />
      {/if}
    </div>
    <div class="form-field">
      <label for="minimo">{$_('productos.stockMinimo')}</label>
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

  {#if esEdicion}
    <div class="form-field">
      <label for="stock">{$_('productos.agregarStock')}</label>
      <input id="stock" type="number" name="stock" min="0" bind:value={stock} required />
    </div>
  {/if}

  {#if stock > 0}
    <div class="form-field">
      <label for="numero_lote">{$_('productos.numeroLote')}</label>
      <input id="numero_lote" type="text" name="numero_lote" required />
    </div>
    <div class="form-field">
      <label for="fecha_caducidad">{$_('productos.fechaCaducidad')}</label>
      <input id="fecha_caducidad" type="date" name="fecha_caducidad" required />
    </div>
  {/if}

  <div class="form-actions">
    <a href="/productos" class="btn btn-secondary">
      {$_('botones.cancelar')}
    </a>
    <button type="submit" class="btn btn-primary">
      {esEdicion ? $_('productos.guardarCambios') : $_('productos.crearProducto')}
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

  .stock-value {
    display: block;
    min-height: 2.75rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-primary);
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