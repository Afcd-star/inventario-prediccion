<script lang="ts">
  import type { PageData } from './$types';
  import type { Producto } from '$lib/types';
  import CodigoQR from '$lib/components/CodigoQR.svelte';

  let { data }: { data: { producto: Producto } } = $props();
</script>

<svelte:head>
  <title>QR: {data.producto.nombre} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>Volver a productos</span>
    </a>
    <h1>Código QR: {data.producto.nombre}</h1>
    <p class="text-secondary">Imprime este código y pégalo en el producto físico.</p>
  </header>

  <div class="qr-display">
    <CodigoQR valor={data.producto.id.toString()} tamano={250} />
  </div>

  <div class="qr-actions">
    <button class="btn btn-primary" onclick={() => window.print()}>
      🖨️ Imprimir Etiqueta
    </button>
  </div>
</main>

<style>
  .qr-display {
    display: flex;
    justify-content: center;
    margin: 2rem 0;
  }

  .qr-actions {
    display: flex;
    justify-content: center;
    margin-top: 2rem;
  }

  @media print {
    .btn-back,
    .btn {
      display: none;
    }
    .page-container {
      max-width: 100%;
    }
  }
</style>