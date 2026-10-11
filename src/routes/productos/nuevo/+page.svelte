<script lang="ts">
  import FormularioProducto from '$lib/components/FormularioProducto.svelte';
</script>

<svelte:head>
  <title>Nuevo Producto</title>
</svelte:head>

<main class="form-page">
  <a href="/productos" class="btn-back">← Volver a productos</a>
  <section class="card form-card">
    <h1>Nuevo Producto</h1>
    <p class="text-secondary">Completa los datos para agregar un producto al inventario.</p>
    <FormularioProducto accion="crear" />
  </section>
</main>

<style>
  .form-page {
    width: min(100% - 2rem, 640px);
    margin: 2rem auto;
  }

</style>