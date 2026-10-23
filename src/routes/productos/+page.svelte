<script lang="ts">
  import type { PageData } from './$types';
  import TablaProductos from '$lib/components/TablaProductos.svelte';
  import { _ } from 'svelte-i18n';
  import { mostrarToast } from '$lib/stores/toasts';
  import MenuExportar from '$lib/components/exportacion/MenuExportar.svelte';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();

  // Mostrar toasts de éxito
  $effect(() => {
    if (form?.success === 'producto_creado') {
      mostrarToast($_('productos.creado'), 'success');
    } else if (form?.success === 'producto_eliminado') {
      mostrarToast($_('productos.eliminado'), 'success');
    }
  });

  const opcionesExportar = $derived([
    { etiqueta: $_('exportacion.productosCSV'), url: '/api/exportar/productos' },
    { etiqueta: $_('exportacion.productosExcel'), url: '/api/exportar/productos?formato=xlsx' },
    { etiqueta: $_('exportacion.movimientosCSV'), url: '/api/exportar/movimientos' },
    { etiqueta: $_('exportacion.movimientosExcel'), url: '/api/exportar/movimientos?formato=xlsx' }
  ]);
  
</script>

<svelte:head>
  <title>{$_('productos.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container products-page">
  <header class="page-header-flex">
    <h1>{$_('productos.titulo')}</h1>
    <div class="header-actions">
      {#if data.rol === 'admin'}
        <a href="/productos/importar" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;" aria-hidden="true">
            <path d="M18,9h-2c-0.6,0-1,0.4-1,1s0.4,1,1,1h2c0.6,0,1,0.4,1,1v7c0,0.6-0.4,1-1,1H6c-0.6,0-1-0.4-1-1v-7c0-0.6,0.4-1,1-1h2  c0.6,0,1-0.4,1-1S8.6,9,8,9H6c-1.7,0-3,1.3-3,3v7c0,1.7,1.3,3,3,3h12c1.7,0,3-1.3,3-3v-7C21,10.3,19.7,9,18,9z M8.3,14.7l3,3  c0.2,0.2,0.4,0.3,0.7,0.3c0.3,0,0.5-0.1,0.7-0.3l3-3c0.4-0.4,0.4-1,0-1.4c-0.4-0.4-1-0.4-1.4,0L13,14.6V3c0-0.6-0.4-1-1-1  s-1,0.4-1,1v11.6l-1.3-1.3c-0.4-0.4-1-0.4-1.4,0C7.9,13.7,7.9,14.3,8.3,14.7z"></path>
          </svg>
          {$_('productos.importar')}
        </a>

        <MenuExportar opciones={opcionesExportar} />
      {/if}

      <a href="/productos/nuevo" class="btn btn-primary">
        <span style="margin-right: 0.5rem;">+</span>
        {$_('productos.nuevo')}
      </a>
    </div>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <!-- Buscador -->
  <div class="search-container">
    <form method="GET" action="/productos" class="search-form">
      <input
        type="text"
        name="q"
        placeholder={$_('productos.buscarPlaceholder')}
        value={data.busqueda}
        class="input-field search-input"
      />
      <button type="submit" class="btn btn-primary">{$_('productos.buscar')}</button>
      {#if data.busqueda}
        <a href="/productos" class="btn btn-secondary">{$_('productos.limpiar')}</a>
      {/if}
    </form>
  </div>

  <TablaProductos productos={data.productos} />
</main>

<style>
  .products-page {
    max-width: 1600px;
  }

  .page-header-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem; /* Un poco más de espacio entre los botones */
  }

  .search-container {
    margin-bottom: 1.5rem;
  }

  .search-form {
    display: flex;
    gap: 0.5rem;
  }

  .search-input {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 600px) {
    .page-header-flex {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.75rem;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions .btn {
      flex: 1;
      justify-content: center;
    }

    .search-form {
      flex-wrap: wrap;
    }

    .search-input {
      flex-basis: 100%;
    }

    :global(.btn) {
      padding: 0.65rem 1rem;
      font-size: var(--font-size-sm);
    }
  }
</style>