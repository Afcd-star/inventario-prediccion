<script lang="ts">
  import type { PageData } from './$types';
  import FormularioMovimiento from '$lib/components/FormularioMovimiento.svelte';
  import HistorialMovimientos from '$lib/components/HistorialMovimientos.svelte';
  import BotonPDF from '$lib/components/BotonPDF.svelte';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Movimientos: {data.producto.nombre} | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>Volver a productos</span>
    </a>
    <h1>Movimientos: {data.producto.nombre}</h1>
    <p class="text-secondary">
      Stock actual: 
      <strong class={data.producto.stock_actual < data.producto.stock_minimo ? 'text-danger' : 'text-success'}>
        {data.producto.stock_actual}
      </strong>
      {data.producto.unidad_medida}
    </p>
    <BotonPDF
      url="/api/reportes/movimientos?productoId={data.producto.id}"
      nombreArchivo="movimientos-producto-{data.producto.id}.pdf"
      texto="Exportar movimientos PDF"
      variante="secundario"
    />
  </header>

  <div class="movements-stack">
    <section class="card">
      <h2>Nuevo Movimiento</h2>
      <FormularioMovimiento 
        productoId={data.producto.id} 
        stockActual={data.producto.stock_actual} 
      />
    </section>
    
    <section class="card">
      <h2>Historial</h2>
      <HistorialMovimientos movimientos={data.movimientos} />
    </section>
  </div>
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .btn-back {
    display: inline-flex;
    margin-bottom: 1.5rem;
  }

  .movements-stack {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

</style>