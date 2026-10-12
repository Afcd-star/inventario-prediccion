<script lang="ts">
  import type { PageData } from './$types';
  import TablaProductos from '$lib/components/TablaProductos.svelte';
  import { _ } from 'svelte-i18n';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>{$_('productos.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container products-page">
  <header class="page-header-flex">
    <h1>{$_('productos.titulo')}</h1>
    <div class="header-actions">
      <a href="/productos/nuevo" class="btn btn-primary">{$_('productos.nuevo')}</a>
    </div>
  </header>

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

  <!-- Mensajes de feedback -->
  {#if form?.success === 'producto_creado'}
    <div class="alert alert-success">
      ✅ {$_('productos.creado')}
    </div>
  {:else if form?.success === 'producto_eliminado'}
    <div class="alert alert-danger">
      ️ {$_('productos.eliminado')}
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">{$_(form.error)}</div>
  {/if}

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
    gap: 0.5rem;
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