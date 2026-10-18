<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  
  let modalAbierto = $state(false);
  let modoEdicion = $state(false);
  
  let idEditar = $state(0);
  let nombre = $state('');
  let tipo = $state('almacen');
  let direccion = $state('');
  let activa = $state(true);

  // Detectar de dónde vino el usuario
  const desdeDashboard = $derived($page.url.searchParams.get('from') === 'dashboard');
  const urlRetorno = $derived(desdeDashboard ? '/dashboard' : '/admin');

  function abrirModalCrear() {
    modoEdicion = false;
    idEditar = 0;
    nombre = '';
    tipo = 'almacen';
    direccion = '';
    activa = true;
    modalAbierto = true;
  }

  function abrirModalEditar(ubicacion: any) {
    modoEdicion = true;
    idEditar = ubicacion.id;
    nombre = ubicacion.nombre;
    tipo = ubicacion.tipo;
    direccion = ubicacion.direccion || '';
    activa = ubicacion.activa === 1;
    modalAbierto = true;
  }

  function cerrarModal() {
    modalAbierto = false;
  }

  async function eliminarUbicacion(id: number, nombre: string) {
    if (confirm(`¿Estás seguro de que deseas eliminar la ubicación "${nombre}"? Esta acción no se puede deshacer.`)) {
      const formData = new FormData();
      formData.append('id', String(id));
    
      const res = await fetch('?/eliminar', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar la ubicación');
      }
    }
  }
  // Tipado correcto para SvelteKit enhance
  const handleSubmit: SubmitFunction = () => {
    return async ({ update }) => {
      cerrarModal();
      // Mantener el parámetro 'from' en la URL después de la actualización
      const fromParam = $page.url.searchParams.get('from');
      if (fromParam) {
        const nuevaUrl = new URL($page.url);
        nuevaUrl.searchParams.set('from', fromParam);
        window.history.replaceState({}, '', nuevaUrl.toString());
      }
      await update();
    };
  };
</script>

<svelte:head>
  <title>{$_('ubicaciones.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href={urlRetorno} class="btn-back">
      <span>←</span>
      <span>{desdeDashboard ? $_('ubicaciones.volverDashboard') : $_('ubicaciones.volver')}</span>
    </a>
    <div class="header-actions">
      <h1>{$_('ubicaciones.titulo')}</h1>
      <button class="btn btn-primary" type="button" onclick={abrirModalCrear}>
        {$_('ubicaciones.nueva')}
      </button>
    </div>
    <p class="text-secondary">{$_('ubicaciones.descripcion')}</p>
  </header>

  {#if form?.success === 'ubicaciones.creado'}
    <div class="alert alert-success">✅ {$_('ubicaciones.creado')}</div>
  {:else if form?.success === 'ubicaciones.actualizado'}
    <div class="alert alert-success">✅ {$_('ubicaciones.actualizado')}</div>
  {:else if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <section class="card">
    {#if data.ubicaciones.length === 0}
      <p class="text-secondary">{$_('ubicaciones.sinUbicaciones')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('ubicaciones.nombre')}</th>
              <th>{$_('ubicaciones.tipo')}</th>
              <th>{$_('ubicaciones.direccion')}</th>
              <th>{$_('ubicaciones.estado')}</th>
              <th>{$_('ubicaciones.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.ubicaciones as ubicacion}
              <tr>
                <td><strong>{ubicacion.nombre}</strong></td>
                <td>
                  <span class="badge badge-info">
                    {ubicacion.tipo === 'almacen' ? $_('ubicaciones.tipoAlmacen') : 
                     ubicacion.tipo === 'tienda' ? $_('ubicaciones.tipoTienda') : $_('ubicaciones.tipoCentro')}
                  </span>
                </td>
                <td class="text-secondary">{ubicacion.direccion || '—'}</td>
                <td>
                  <span class="badge" class:badge-success={ubicacion.activa === 1} class:badge-danger={ubicacion.activa === 0}>
                    {ubicacion.activa === 1 ? $_('comun.activo') : $_('comun.inactivo')}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-sm btn-secondary" type="button" onclick={() => abrirModalEditar(ubicacion)}>
                      {$_('botones.editar')}
                    </button>
                    
                    {#if ubicacion.id !== 1}
                      <button 
                        class="btn btn-sm btn-danger" 
                        type="button" 
                        aria-label={$_('botones.eliminar')}
                        title={$_('botones.eliminar')}
                        onclick={() => eliminarUbicacion(ubicacion.id, ubicacion.nombre)}
                      >
                        🗑️
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</main>

{#if modalAbierto}
  <!-- Modal accesible: role="dialog" y cierre al hacer clic en el backdrop -->
  <div 
    class="modal-backdrop" 
    role="dialog" 
    aria-modal="true"
    aria-labelledby="modal-title"
    onclick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
    onkeydown={(e) => { if (e.key === 'Escape') cerrarModal(); }}
    tabindex="-1"
  >
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="modal-title">{modoEdicion ? $_('ubicaciones.editar') : $_('ubicaciones.nueva')}</h2>
        <button class="modal-close" type="button" aria-label={$_('botones.cancelar')} onclick={cerrarModal}>×</button>
      </header>

      <form method="POST" action="?/{modoEdicion ? 'actualizar' : 'crear'}" use:enhance={handleSubmit} class="form-stack">
        {#if modoEdicion}
          <input type="hidden" name="id" value={idEditar} />
        {/if}

        <div class="input-group">
          <label for="nombre" class="label">{$_('ubicaciones.nombre')}</label>
          <input id="nombre" type="text" name="nombre" bind:value={nombre} required class="input-field" />
        </div>

        <div class="input-group">
          <label for="tipo" class="label">{$_('ubicaciones.tipo')}</label>
          <select id="tipo" name="tipo" bind:value={tipo} class="input-field" required>
            <option value="almacen">{$_('ubicaciones.tipoAlmacen')}</option>
            <option value="tienda">{$_('ubicaciones.tipoTienda')}</option>
            <option value="centro_distribucion">{$_('ubicaciones.tipoCentro')}</option>
          </select>
        </div>

        <div class="input-group">
          <label for="direccion" class="label">{$_('ubicaciones.direccion')}</label>
          <input id="direccion" type="text" name="direccion" bind:value={direccion} class="input-field" />
        </div>

        {#if modoEdicion}
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" name="activa" bind:checked={activa} />
              <span>{$_('ubicaciones.activa')}</span>
            </label>
          </div>
        {/if}

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={cerrarModal}>
            {$_('botones.cancelar')}
          </button>
          <button type="submit" class="btn btn-primary">
            {$_('botones.guardar')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  

  .table-container {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .data-table th {
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
  }

  .badge-info {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .badge-success {
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .badge-danger {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: var(--bg-card);
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    padding: 1.5rem;
    box-shadow: var(--shadow-popover);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: var(--font-size-xl);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .checkbox-group {
    padding: 0.75rem;
    background: var(--bg-secondary);
    border-radius: 6px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-weight: var(--font-weight-medium);
  }
</style>