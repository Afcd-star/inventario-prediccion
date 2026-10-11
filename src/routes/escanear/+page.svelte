<script lang="ts">
  import EscanerQR from '$lib/components/EscanerQR.svelte';
</script>

<svelte:head>
  <title>Escanear QR | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>Volver al Dashboard</span>
    </a>
    <h1>Escaneo Rápido</h1>
    <p class="text-secondary">Escanea el código QR de un producto para gestionar sus movimientos.</p>
  </header>

  <div style:maxWidth="400px" style:margin="0 auto">
    <EscanerQR />
  </div>
</main>