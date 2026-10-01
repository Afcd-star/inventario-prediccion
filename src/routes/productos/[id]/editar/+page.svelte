<script lang="ts">
  import type { PageData } from './$types';
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';

  // Tipado explícito para asegurar que TypeScript sepa qué hay dentro de 'data'
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Editar Producto</title>
</svelte:head>

<main style:maxWidth="500px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <h1 style:marginBottom="1.5rem">Editar Producto</h1>

  {#if data.producto}
    <FormularioProducto producto={data.producto} accion="editar" />
  {:else}
    <p style:color="#ef4444">Producto no encontrado.</p>
    <a href="/productos" style:color="#3b82f6" style:textDecoration="none">Volver a la lista</a>
  {/if}
</main>