<script lang="ts">
  import type { PageData } from './$types';
  import FormularioMovimiento from '$lib/components/FormularioMovimiento.svelte';
  import HistorialMovimientos from '$lib/components/HistorialMovimientos.svelte';
  import BotonPDF from '$lib/components/BotonPDF.svelte';
  import { _ } from 'svelte-i18n';

  import type { ActionData } from './$types';

  let { data, form }: { data: PageData; form?: ActionData } = $props();
</script>

<svelte:head>
  <title>{$_('movimientos.titulo')}: {data.producto.nombre} | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('movimientos.volver')}</span>
    </a>
    <h1>{$_('movimientos.titulo')}: {data.producto.nombre}</h1>
    <p class="text-secondary">
      {$_('movimientos.stockActualProducto')}
      <strong class={data.producto.stock_actual < data.producto.stock_minimo ? 'text-danger' : 'text-success'}>
        {data.producto.stock_actual}
      </strong>
    </p>
    <BotonPDF
      url="/api/reportes/movimientos?productoId={data.producto.id}"
      nombreArchivo="movimientos-producto-{data.producto.id}.pdf"
      texto={$_('movimientos.exportarPDFCompleto')}
      variante="secundario"
    />
  </header>

  <div class="movements-stack">
    {#if form?.error}
      <div class="alert alert-danger">{$_(form.error)}</div>
    {/if}
    <section class="card">
      <h2>{$_('movimientos.nuevoMovimiento')}</h2>
      <FormularioMovimiento 
        productoId={data.producto.id} 
        stockActual={data.producto.stock_actual} 
      />
    </section>
    
    <section class="card">
      <h2>{$_('movimientos.historial')}</h2>
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