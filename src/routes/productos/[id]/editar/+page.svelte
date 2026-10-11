<script lang="ts">
  import type { PageData } from './$types';
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';

  // Tipado explícito para asegurar que TypeScript sepa qué hay dentro de 'data'
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Editar Producto</title>
</svelte:head>

<main class="form-page">
  <a href="/productos" class="btn-back">← Volver a productos</a>
  {#if data.producto}
    <section class="card form-card">
      <h1>Editar Producto</h1>
      <p class="text-secondary">Actualiza la información de {data.producto.nombre}.</p>
      <FormularioProducto producto={data.producto} accion="editar" />
    </section>
  {:else}
    <p class="alert alert-danger">Producto no encontrado.</p>
  {/if}
</main>

<style>
  .form-page {
    width: min(100% - 2rem, 640px);
    margin: 2rem auto;
  }

</style>