<script lang="ts">
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';
</script>

<svelte:head>
  <title>Nuevo Producto</title>
</svelte:head>

<main style:maxWidth="500px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <h1 style:marginBottom="1.5rem">Nuevo Producto</h1>
  <FormularioProducto accion="crear" />
</main>