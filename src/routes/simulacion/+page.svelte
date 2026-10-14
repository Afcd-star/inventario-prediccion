<script lang="ts">
  import type { PageData } from './$types';
  import { _ } from 'svelte-i18n';
  import SimuladorWhatIf from '$lib/components/SimuladorWhatIf.svelte';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>{$_('simulacion.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('dashboard.titulo')}</span>
    </a>
    <h1>🧪 {$_('simulacion.titulo')}</h1>
    <p class="text-secondary">{$_('simulacion.subtitulo')}</p>
  </header>

  <div class="selector-card card">
    <form method="GET" action="/simulacion" class="selector-form">
      <label for="selector-producto" class="label">{$_('simulacion.selector')}</label>
      <select
  id="selector-producto"
  name="producto"
  class="input-field"
  onchange={(event) => event.currentTarget.form?.requestSubmit()}
  disabled={data.productos.length === 0}
>
  <option value="">No hay ningún producto seleccionado aún</option>
  {#each data.productos as producto}
    <option 
      value={producto.id}
      selected={producto.id === data.productoSeleccionado}
    >
      {producto.nombre}
    </option>
  {/each}
</select>
    </form>
  </div>

  {#if form?.success === 'escenario_guardado'}
    <div class="alert alert-success">💾 {$_('simulacion.guardadoExito')}</div>
  {:else if form?.success === 'escenario_eliminado'}
    <div class="alert alert-success">🗑️ {$_('simulacion.eliminadoExito')}</div>
  {:else if form?.error}
    <div class="alert alert-danger">⚠️ {form.error}</div>
  {/if}

  {#if data.productos.length === 0}
    <div class="card">
      <p class="text-secondary">{$_('dashboard.sinProductos')}</p>
    </div>
  {:else if !data.productoSeleccionado}
    <div class="card">
      <p class="text-secondary">⚠️ Noy hay ningún producto selecciondado aún</p>
    </div>
  {:else if data.coeficientes}
    <SimuladorWhatIf coeficientes={data.coeficientes} escenarios={data.escenarios} />
  {:else}
    <div class="card">
      <p class="text-secondary">⚠️ {$_('simulacion.sinDatos')}</p>
    </div>
  {/if}
</main>

<style>
  .selector-card {
    margin-bottom: 1.5rem;
  }

  .selector-form {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .selector-form .input-field {
    flex: 1 1 320px;
    max-width: 480px;
  }

  @media (max-width: 600px) {
    .selector-form {
      align-items: stretch;
      flex-direction: column;
    }

    .selector-form .input-field {
      max-width: none;
    }
  }
</style>