<script lang="ts">
  import EscanerQR from '$lib/components/EscanerQR.svelte';
  import { _ } from 'svelte-i18n';
</script>

<svelte:head>
  <title>{$_('escanear.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('escanear.volver')}</span>
    </a>
    <h1>{$_('escanear.titulo')}</h1>
    <p class="text-secondary">{$_('escanear.subtitulo')}</p>
  </header>

  <div style:maxWidth="400px" style:margin="0 auto">
    <EscanerQR />
  </div>
</main>