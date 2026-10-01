<script lang="ts">
  import type { PageData } from './$types';
  import TablaProductos from '$lib/components/TablaProductos.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Productos</title>
</svelte:head>

<main style:maxWidth="900px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <header style:display="flex" style:justifyContent="space-between" style:alignItems="center" style:marginBottom="1.5rem">
    <h1 style:margin="0">Gestión de Productos</h1>
    <a href="/productos/nuevo" style:padding="0.5rem 1rem" style:background="#3b82f6" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
      Nuevo Producto
    </a>
  </header>

  <TablaProductos productos={data.productos} />
</main>