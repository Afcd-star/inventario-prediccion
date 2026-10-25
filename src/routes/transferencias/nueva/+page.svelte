<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();

  let origenId = $state(0);

  const productosDisponibles = $derived(
    data.productosConLotes.filter(p => p.ubicacion_id === origenId)
  );

  type ItemRow = { producto_id: string; lote_id: string; cantidad: string };
  let items = $state<ItemRow[]>([{ producto_id: '', lote_id: '', cantidad: '1' }]);

  function agregarFila() {
    items = [...items, { producto_id: '', lote_id: '', cantidad: '1' }];
  }

  function eliminarFila(index: number) {
    items = items.filter((_, i) => i !== index);
  }

  function actualizarProducto(index: number, productoId: string) {
    items[index].producto_id = productoId;
    const lote = data.productosConLotes.find(p => p.id === Number(productoId) && p.ubicacion_id === origenId);
    if (lote) {
      items[index].lote_id = String(lote.lote_id);
    }
  }
</script>

<svelte:head>
  <title>{$_('transferencias.nueva')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/transferencias" class="btn-back">
      <span>←</span>
      <span>{$_('transferencias.nueva.volver')}</span>
    </a>
    <h1>{$_('transferencias.nueva.nuevaTransferencia')}</h1>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <section class="card">
    <form
      method="POST"
      action="?/crear"
      use:enhance={() => async ({ result, update }) => {
        if (result.type === 'redirect') {
          mostrarToast($_('transferencias.creada'), 'success');
        }
      
        await update();
      }}
      class="form-stack"
    >
      <div class="form-grid">
        <div class="input-group">
          <label for="origen_id" class="label">{$_('transferencias.origen')}</label>
          <select id="origen_id" name="origen_id" bind:value={origenId} class="input-field" required>
            <option value="0">-- Seleccionar --</option>
            {#each data.ubicaciones as u}
              <option value={u.id}>{u.nombre}</option>
            {/each}
          </select>
        </div>

        <div class="input-group">
          <label for="destino_id" class="label">{$_('transferencias.destino')}</label>
          <select id="destino_id" name="destino_id" class="input-field" required>
            <option value="0">-- Seleccionar --</option>
            {#each data.ubicaciones as u}
              {#if u.id !== origenId}
                <option value={u.id}>{u.nombre}</option>
              {/if}
            {/each}
          </select>
        </div>
      </div>

      <div class="input-group">
        <div class="label">{$_('transferencias.items')}</div>
        {#if origenId === 0}
          <p class="text-secondary text-sm">Selecciona un origen primero para ver los productos disponibles.</p>
        {:else if productosDisponibles.length === 0}
          <p class="text-secondary text-sm">No hay productos con stock disponible en esta ubicación.</p>
        {:else}
          <div class="items-list">
            {#each items as item, index}
              <div class="item-row">
                <select 
                  name="producto_id[]" 
                  class="input-field" 
                  required 
                  onchange={(e) => actualizarProducto(index, e.currentTarget.value)}
                >
                  <option value="">-- Producto --</option>
                  {#each productosDisponibles as p}
                    <option value={p.id} selected={item.producto_id === String(p.id)}>
                      {p.nombre} (Lote: {p.numero_lote}, Stock: {p.cantidad_actual})
                    </option>
                  {/each}
                </select>
                
                <input type="hidden" name="lote_id[]" value={item.lote_id} />
                
                <input 
                  type="number" 
                  name="cantidad[]" 
                  min="1" 
                  value={item.cantidad} 
                  class="input-field cantidad-input" 
                  required 
                />
                
                <button type="button" class="btn btn-sm btn-danger" onclick={() => eliminarFila(index)} aria-label="Eliminar fila">
                  🗑️
                </button>
              </div>
            {/each}
          </div>
          <button type="button" class="btn btn-sm btn-secondary" onclick={agregarFila} style="margin-top: 0.5rem;">
            + Agregar otro producto
          </button>
        {/if}
      </div>

      <div class="input-group">
        <label for="notas" class="label">{$_('transferencias.notas')}</label>
        <textarea id="notas" name="notas" class="input-field" rows="3"></textarea>
      </div>

      <div class="modal-actions">
        <a href="/transferencias" class="btn btn-secondary">{$_('botones.cancelar')}</a>
        <button type="submit" class="btn btn-primary" disabled={origenId === 0}>
          {$_('transferencias.solicitar')}
        </button>
      </div>
    </form>
  </section>
</main>

<style>
  .page-header { margin-bottom: 2rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .items-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .item-row { display: flex; gap: 0.5rem; align-items: center; }
  .item-row select { flex: 2; }
  .cantidad-input { flex: 1; max-width: 100px; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  .text-sm { font-size: var(--font-size-sm); }
</style>