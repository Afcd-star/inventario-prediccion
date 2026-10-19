<script lang="ts">
  import type { PageData } from './$types';
  import FormularioMovimiento from '$lib/components/FormularioMovimiento.svelte';
  import HistorialMovimientos from '$lib/components/HistorialMovimientos.svelte';
  import BotonPDF from '$lib/components/BotonPDF.svelte';
  import { _ } from 'svelte-i18n';
  import { mostrarToast } from '$lib/stores/toasts';

  import type { ActionData } from './$types';

  let { data, form }: { data: PageData; form?: ActionData } = $props();
  let modalMovimientoAbierto = $state(false);

  // Mostrar toasts de éxito
  $effect(() => {
    if (form?.success === 'movimiento_registrado') {
      mostrarToast($_('movimientos.registradoExito'), 'success');
    }
  });

  function cerrarModalMovimiento() {
    modalMovimientoAbierto = false;
  }

  function cerrarModalConEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') cerrarModalMovimiento();
  }
</script>

<svelte:window onkeydown={cerrarModalConEscape} />

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
    <div class="movement-header-actions">
      <BotonPDF
        url="/api/reportes/movimientos?productoId={data.producto.id}"
        nombreArchivo="movimientos-producto-{data.producto.id}.pdf"
        texto={$_('movimientos.exportarPDFCompleto')}
        variante="secundario"
      />
      <button class="btn btn-primary" type="button" onclick={() => modalMovimientoAbierto = true}>
        {$_('movimientos.nuevoMovimiento')}
      </button>
    </div>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <div class="movements-stack">
    <section class="card">
      <h2>{$_('movimientos.historial')}</h2>
      <HistorialMovimientos movimientos={data.movimientos} />
    </section>
  </div>
</main>

{#if modalMovimientoAbierto}
  <div
    class="movement-modal-backdrop"
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) cerrarModalMovimiento();
    }}
  >
    <dialog open class="movement-modal" aria-modal="true" aria-labelledby="movement-modal-title" tabindex="-1">
      <header class="movement-modal-header">
        <h2 id="movement-modal-title">{$_('movimientos.nuevoMovimiento')}</h2>
        <button class="modal-close" type="button" aria-label={$_('admin.cerrar')} onclick={cerrarModalMovimiento}>×</button>
      </header>
      <FormularioMovimiento
        productoId={data.producto.id}
        stockActual={data.producto.stock_actual}
        onSuccess={cerrarModalMovimiento}
      />
    </dialog>
  </div>
{/if}

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

  .movement-header-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .movement-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgb(15 23 42 / 65%);
  }

  .movement-modal {
    position: relative;
    place-self: center;
    margin: 0;
    width: min(100%, 600px);
    max-height: min(90vh, 800px);
    overflow: auto;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-card);
    color: var(--text-primary);
    box-shadow: var(--shadow-popover);
  }

  .movement-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .movement-modal-header h2 {
    margin: 0;
  }

  .modal-close {
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    flex: 0 0 auto;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 1.5rem;
    cursor: pointer;
  }

  @media (max-width: 600px) {
    .movement-modal {
      padding: 1rem;
    }
  }

</style>