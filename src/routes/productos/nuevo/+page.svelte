<script lang="ts">
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';
</script>

<svelte:head>
  <a href="/dashboard" style:padding="0.5rem 1rem" style:background="#10b981" style:color="white" style:border="none" style:borderRadius="6px" style:cursor="pointer" style:textDecoration="none" style:fontWeight="600">
  Ir al Dashboard
  </a>
  <title>Nuevo Producto</title>
</svelte:head>

<main style:maxWidth="500px" style:margin="2rem auto" style:padding="0 1rem" style:fontFamily="sans-serif">
  <h1 style:marginBottom="1.5rem">Nuevo Producto</h1>
  <FormularioProducto accion="crear" />
</main>