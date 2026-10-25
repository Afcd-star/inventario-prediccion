<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  const t = $derived(data.transferencia);

  // Toasts de éxito (el $effect lee `form`, que enhance actualiza tras el submit)
  $effect(() => {
    if (form?.success === 'transferencias.completada') {
      mostrarToast($_('transferencias.completada'), 'success');
    } else if (form?.success === 'transferencias.cancelada') {
      mostrarToast($_('transferencias.cancelada'), 'info');
    }
  });

  // Confirmación nativa i18n para el botón Cancelar.
  // e.preventDefault() en el click detiene el submit ANTES de que enhance lo intercepte.
  function confirmarCancelar(e: MouseEvent) {
    if (!confirm($_('transferencias.confirmarCancelar'))) {
      e.preventDefault();
    }
  }
</script>

<svelte:head>
  <title>Transferencia #{t.id} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/transferencias" class="btn-back">
      <span>←</span>
      <span>{$_('transferencias.volver')}</span>
    </a>
    <h1>{$_('transferencias.detalle')} #{t.id}</h1>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <section class="card">
    <div class="transferencia-header">
      <div>
        <p class="text-secondary">{$_('transferencias.origen')} → {$_('transferencias.destino')}</p>
        <h2>{t.origen_nombre} → {t.destino_nombre}</h2>
      </div>
      <span class="badge" class:badge-warning={t.estado !== 'completada'} class:badge-success={t.estado === 'completada'}>
        {t.estado === 'en_transito' ? $_('transferencias.estadoTransito') :
         t.estado === 'completada' ? $_('transferencias.estadoCompletada') : $_('transferencias.estadoPendiente')}
      </span>
    </div>

    {#if t.notas}
      <div class="notas-box">
        <strong>{$_('transferencias.notas')}:</strong> {t.notas}
      </div>
    {/if}

    {#if t.estado !== 'completada'}
      <!-- 🎯 UN SOLO form: envuelve la tabla (inputs recibido_X) Y los botones.
           Así el FormData del submit incluye las cantidades recibidas.
           El botón Cancelar apunta a ?/cancelar vía formaction (enhance lo respeta). -->
      <form method="POST" action="?/completar" use:enhance>
        <div class="table-container" style="margin-top: 1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>{$_('transferencias.producto')}</th>
                <th>{$_('transferencias.lote')}</th>
                <th>{$_('transferencias.solicitado')}</th>
                <th>{$_('transferencias.recibido')}</th>
              </tr>
            </thead>
            <tbody>
              {#each t.items as item}
                <tr>
                  <td>{item.producto_nombre}</td>
                  <td>{item.numero_lote || 'N/A'}</td>
                  <td>{item.cantidad_solicitada}</td>
                  <td>
                    <input
                      type="number"
                      name={`recibido_${item.id}`}
                      min="0"
                      max={item.cantidad_solicitada}
                      value={item.cantidad_solicitada}
                      class="input-field"
                      style="width: 80px;"
                      required
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="transferencia-actions">
          <button type="submit" class="btn btn-primary">
            ✅ {$_('transferencias.confirmarRecepcion')}
          </button>
          <button
            type="submit"
            class="btn btn-danger"
            formaction="?/cancelar"
            onclick={confirmarCancelar}
          >
            ❌ {$_('transferencias.cancelar')}
          </button>
        </div>
      </form>
    {:else}
      <!-- Estado completada: tabla de solo lectura (sin inputs, sin form) -->
      <div class="table-container" style="margin-top: 1.5rem;">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('transferencias.producto')}</th>
              <th>{$_('transferencias.lote')}</th>
              <th>{$_('transferencias.solicitado')}</th>
              <th>{$_('transferencias.recibido')}</th>
            </tr>
          </thead>
          <tbody>
            {#each t.items as item}
              <tr>
                <td>{item.producto_nombre}</td>
                <td>{item.numero_lote || 'N/A'}</td>
                <td>{item.cantidad_solicitada}</td>
                <td>{item.cantidad_recibida || 0}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>

<style>
  .page-header { margin-bottom: 2rem; }
  .transferencia-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
  .transferencia-header h2 { margin: 0.25rem 0 0; }
  .notas-box { background: var(--bg-secondary); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--accent-primary); }
  .table-container { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th, .data-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  .data-table th { font-weight: var(--font-weight-semibold); color: var(--text-secondary); font-size: var(--font-size-sm); }
  .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }
  .badge-warning { background: var(--status-warning-bg); color: var(--status-warning-text); }
  .badge-success { background: var(--status-success-bg); color: var(--status-success-text); }
  .transferencia-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
</style>