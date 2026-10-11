<script lang="ts">
  import type { ActionData } from './$types';
  import type { PageData } from './$types';
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';
  import { _ } from 'svelte-i18n';

  // Tipado explícito para asegurar que TypeScript sepa qué hay dentro de 'data'
  let { data, form }: { data: PageData; form?: ActionData } = $props();
</script>

<svelte:head>
  <title>{$_('productos.editar')} | StockPredict Pro</title>
</svelte:head>

<main class="form-page">
  <a href="/productos" class="btn-back">← {$_('productos.volver')}</a>
  {#if data.producto}
    <section class="card form-card">
      <h1>{$_('productos.editar')}</h1>
      <p class="text-secondary">{$_('productos.actualizarInfo', { values: { nombre: data.producto.nombre } })}</p>
      {#if form?.error}
        <div class="alert alert-danger">{$_(form.error)}</div>
      {/if}
      <FormularioProducto producto={data.producto} accion="editar" />
    </section>
  {:else}
    <p class="alert alert-danger">{$_('productos.noEncontrado')}</p>
  {/if}
</main>

<style>
  .form-page {
    width: min(100% - 2rem, 640px);
    margin: 2rem auto;
  }

</style>