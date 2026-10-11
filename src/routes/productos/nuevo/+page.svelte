<script lang="ts">
  import type { ActionData } from './$types';
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';
  import { _ } from 'svelte-i18n';

  let { form }: { form?: ActionData } = $props();
</script>

<svelte:head>
  <title>{$_('productos.nuevo')}</title>
</svelte:head>

<main class="form-page">
  <a href="/productos" class="btn-back">← {$_('productos.volver')}</a>
  <section class="card form-card">
    <h1>{$_('productos.nuevo')}</h1>
    <p class="text-secondary">{$_('productos.completarDatos')}</p>
    {#if form?.error}
      <div class="alert alert-danger">{$_(form.error)}</div>
    {/if}
    <FormularioProducto accion="crear" />
  </section>
</main>

<style>
  .form-page {
    width: min(100% - 2rem, 640px);
    margin: 2rem auto;
  }

</style>