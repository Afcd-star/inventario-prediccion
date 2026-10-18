<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  const t = $derived(data.transferencia);
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

  {#if form?.success === 'transferencias.completada'}
    <div class="alert alert-success">✅ {$_('transferencias.completada')}</div>
  {:else if form?.success === 'transferencias.cancelada'}
    <div class="alert alert-warning">⚠️ {$_('transferencias.cancelada')}</div>
  {:else if form?.error}
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

    <div class="table-container" style="margin-top: 1.5rem;">
      <table class="data-table">
        <thead>
          <tr>
            <th>{$_('transferencias.producto')}</th>
            <th>{$_('transferencias.lote')}</th>
            <th>{$_('transferencias.solicitado')}</th>
            {#if t.estado !== 'completada'}
              <th>{$_('transferencias.recibido')}</th>
            {:else}
              <th>{$_('transferencias.recibido')}</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#each t.items as item}
            <tr>
              <td>{item.producto_nombre}</td>
              <td>{item.numero_lote || 'N/A'}</td>
              <td>{item.cantidad_solicitada}</td>
              <td>
                {#if t.estado !== 'completada'}
                  <form method="POST" action="?/completar" use:enhance style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="hidden" name="transferencia_id" value={t.id} />
                    <input 
                      type="number" 
                      name="recibido_{item.id}" 
                      min="0" 
                      max={item.cantidad_solicitada} 
                      value={item.cantidad_solicitada} 
                      class="input-field" 
                      style="width: 80px;"
                      required
                    />
                  </form>
                {:else}
                  {item.cantidad_recibida || 0}
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if t.estado !== 'completada'}
      <div class="transferencia-actions">
        <form method="POST" action="?/completar" use:enhance style="display: inline;">
          <button type="submit" class="btn btn-primary">
            ✅ {$_('transferencias.confirmarRecepcion')}
          </button>
        </form>
        <form method="POST" action="?/cancelar" use:enhance style="display: inline;">
          <button type="submit" class="btn btn-danger" onclick={(event) => { if (!confirm('¿Cancelar esta transferencia? El stock regresará al origen.')) event.preventDefault(); }}>
            ❌ {$_('transferencias.cancelar')}
          </button>
        </form>
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