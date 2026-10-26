<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();

  let modalAbierto = $state(false);
  let modoEdicion = $state(false);
  let idEditar = $state(0);
  let nombre = $state('');
  let contacto = $state('');
  let email = $state('');
  let telefono = $state('');
  let tiempoEntrega = $state('');
  let notas = $state('');
  let activa = $state(true);

  $effect(() => {
    if (form?.success === 'proveedores.creado') mostrarToast($_('proveedores.creado'), 'success');
    else if (form?.success === 'proveedores.actualizado') mostrarToast($_('proveedores.actualizado'), 'success');
    else if (form?.success === 'proveedores.eliminado') mostrarToast($_('proveedores.eliminado'), 'success');
  });

  function abrirModalCrear() {
    modoEdicion = false;
    idEditar = 0;
    nombre = ''; contacto = ''; email = ''; telefono = '';
    tiempoEntrega = ''; notas = ''; activa = true;
    modalAbierto = true;
  }

  function abrirModalEditar(p: any) {
    modoEdicion = true;
    idEditar = p.id;
    nombre = p.nombre;
    contacto = p.contacto || '';
    email = p.email || '';
    telefono = p.telefono || '';
    tiempoEntrega = p.tiempo_entrega_dias != null ? String(p.tiempo_entrega_dias) : '';
    notas = p.notas || '';
    activa = p.activa === 1;
    modalAbierto = true;
  }

  function cerrarModal() { modalAbierto = false; }

  // Cerrar modal + re-fetch de la lista tras crear/actualizar (sin reload duro).
  const handleSubmit: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type === 'redirect') mostrarToast($_('proveedores.creado'), 'success');
       cerrarModal();
       await update();
     };
   };
</script>

<svelte:head>
  <title>{$_('proveedores.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>{$_('proveedores.volver')}</span>
    </a>
    <div class="header-actions">
      <h1>{$_('proveedores.titulo')}</h1>
      {#if data.rol === 'admin'}
        <button class="btn btn-primary" type="button" onclick={abrirModalCrear}>
          {$_('proveedores.nuevo')}
        </button>
      {/if}
    </div>
    <p class="text-secondary">{$_('proveedores.descripcion')}</p>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  <section class="card">
    {#if data.proveedores.length === 0}
      <p class="text-secondary">{$_('proveedores.sinProveedores')}</p>
    {:else}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>{$_('proveedores.nombre')}</th>
              <th>{$_('proveedores.contacto')}</th>
              <th>{$_('proveedores.plazo')}</th>
              <th>{$_('proveedores.productosAsociados')}</th>
              <th>{$_('proveedores.estado')}</th>
              <th>{$_('proveedores.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.proveedores as p}
              <tr>
                <td>
                  <a href="/proveedores/{p.id}" class="product-name">{p.nombre}</a>
                </td>
                <td class="text-secondary">
                  {p.contacto || p.email || p.telefono || '—'}
                </td>
                <td>
                  {p.tiempo_entrega_dias != null
                    ? $_('proveedores.plazoDias', { values: { dias: p.tiempo_entrega_dias } })
                    : '—'}
                </td>
                <td>{p.productos_asociados}</td>
                <td>
                  <span class="badge" class:badge-success={p.activa === 1} class:badge-danger={p.activa === 0}>
                    {p.activa === 1 ? $_('comun.activo') : $_('comun.inactivo')}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 0.5rem;">
                    <a href="/proveedores/{p.id}" class="btn btn-sm btn-secondary">
                      {$_('proveedores.verDetalle')}
                    </a>
                    {#if data.rol === 'admin'}
                      <button class="btn btn-sm btn-secondary" type="button" onclick={() => abrirModalEditar(p)}>
                        {$_('botones.editar')}
                      </button>
                      <form method="POST" action="?/eliminar" use:enhance={() => async ({ result, update }) => {
                        if (result.type === 'failure' && result.data?.error) {
                          // El service lanzó "tiene productos asociados": mostrarlo sin cerrar nada.
                          await update();
                          return;
                        }
                        await update();
                      }}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          class="btn btn-sm btn-danger"
                          aria-label={$_('botones.eliminar')}
                          title={$_('botones.eliminar')}
                          onclick={(e) => { if (!confirm($_('proveedores.confirmarEliminar', { values: { nombre: p.nombre } }))) e.preventDefault(); }}
                        >
                          🗑️
                        </button>
                      </form>
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
        <h2 id="modal-title">{modoEdicion ? $_('proveedores.editar') : $_('proveedores.nuevo')}</h2>
        <button class="modal-close" type="button" aria-label={$_('botones.cancelar')} onclick={cerrarModal}>×</button>
      </header>

      <form method="POST" action="?/{modoEdicion ? 'actualizar' : 'crear'}" use:enhance={handleSubmit} class="modal-form">
        <div class="modal-body">
          {#if modoEdicion}
            <input type="hidden" name="id" value={idEditar} />
          {/if}

          <div class="input-group">
            <label for="nombre" class="label">{$_('proveedores.nombre')}</label>
            <input id="nombre" type="text" name="nombre" bind:value={nombre} required class="input-field" />
          </div>

          <div class="input-group">
            <label for="contacto" class="label">{$_('proveedores.contacto')}</label>
            <input id="contacto" type="text" name="contacto" bind:value={contacto} class="input-field" />
          </div>

          <div class="input-group">
            <label for="email" class="label">{$_('proveedores.email')}</label>
            <input id="email" type="email" name="email" bind:value={email} class="input-field" />
          </div>

          <div class="input-group">
            <label for="telefono" class="label">{$_('proveedores.telefono')}</label>
            <input id="telefono" type="tel" name="telefono" bind:value={telefono} class="input-field" />
          </div>

          <div class="input-group">
            <label for="tiempo_entrega_dias" class="label">{$_('proveedores.plazo')}</label>
            <input id="tiempo_entrega_dias" type="number" name="tiempo_entrega_dias" min="0" step="1" bind:value={tiempoEntrega} class="input-field" />
            <span class="text-secondary text-sm">{$_('proveedores.plazoHint')}</span>
          </div>

          <div class="input-group">
            <label for="notas" class="label">{$_('proveedores.notas')}</label>
            <textarea id="notas" name="notas" bind:value={notas} rows="3" class="input-field"></textarea>
          </div>

          {#if modoEdicion}
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" name="activa" bind:checked={activa} />
                <span>{$_('proveedores.activa')}</span>
              </label>
            </div>
          {/if}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={cerrarModal}>{$_('botones.cancelar')}</button>
          <button type="submit" class="btn btn-primary">{$_('botones.guardar')}</button>
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

  .data-table th, .data-table td { 
    padding: 0.75rem 1rem; 
    text-align: left; 
    border-bottom: 1px solid var(--border-color); 
  }

  .data-table th { 
    font-weight: var(--font-weight-semibold); 
    color: var(--text-secondary); 
    font-size: var(--font-size-sm); 
  }

  .product-name { 
    font-weight: var(--font-weight-semibold); 
    color: var(--accent-primary); 
    text-decoration: none; 
  }

  .product-name:hover { 
    text-decoration: underline; 
  }

  .badge { 
    padding: 0.25rem 0.5rem; 
    border-radius: 4px; 
    font-size: var(--font-size-xs); 
    font-weight: var(--font-weight-medium); 
  }

  .badge-success { 
    background: var(--status-success-bg); 
    color: var(--status-success-text); 
  }

  .badge-danger { 
    background: var(--status-danger-bg); 
    color: var(--status-danger-text); 
  }

  .text-sm { 
    font-size: var(--font-size-sm); 
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
    /* Tres bloques: header fijo + body scrolleable + footer fijo.
       max-height limita al viewport (el 2rem compensa el padding del backdrop);
       overflow:hidden + border-radius evitan que el scroll se coma las esquinas. */
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 2rem);
    overflow: hidden;
    box-shadow: var(--shadow-popover);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;                 /* nunca se scrollea: el ✕ de cerrar siempre visible */
    padding: 1.5rem 1.5rem 0;
  }
  
  /* El form es el contenedor flex que reparte altura entre body y acciones.
     min-height:0 es CRÍTICO: sin él, un flex item con overflow no se encoge por
     debajo de su contenido y el scroll no se activa (bug clásico de flexbox). */
  .modal-form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .modal-body {
    flex: 1;
    min-height: 0;                  /* ídem: permite que el body se encoja y scrollee */
    overflow-y: auto;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;                      /* reemplaza el espaciado que daba form-stack */
  }
  
  .modal-close { 
    background: none; 
    border: none; 
    font-size: 1.5rem; 
    cursor: pointer; 
    color: var(--text-secondary); 
  }
  
  .modal-header h2 { 
    margin: 0; 
    font-size: var(--font-size-xl); 
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-shrink: 0;                 /* footer fijo: Guardar/Cancelar siempre a la vista */
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid var(--border-color);
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