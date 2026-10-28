<script lang="ts">
  import { enhance } from '$app/forms';
  import { _, locale } from 'svelte-i18n';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
  const p = $derived(data.proveedor);

  const MAPA_LOCALE_INTL: Record<string, string> = { es: 'es-ES', en: 'en-US' };
  const localeIntl = $derived(MAPA_LOCALE_INTL[$locale ?? 'es'] ?? 'es-ES');
  const moneda = $derived(new Intl.NumberFormat(localeIntl, { style: 'currency', currency: 'EUR' }));

  type FilaBorrador = {
    producto_id: number;
    producto_nombre: string;
    costo_unitario: string;        // string porque bind:value en <input type=number> coacciona ''→0
    tiempo_entrega_dias: string;   //    y necesitamos distinguir "" (hereda global) de "0"
    pedido_minimo: string;
  };

  let filas = $state<FilaBorrador[]>([]);

  $effect(() => {
    // Resincronización: tras update() post-guardado, data.productosAsociados trae el estado
    // persistido (incluidos los ids de asociación nuevos, irrelevantes para el diff). El
    // borrador se resetea a la fuente de verdad. Limitación conocida: un refetch externo
    // descartaría edits no guardados; en esta ficha el único refetch es post-guardado, así
    // que no ocurre en la práctica.
    filas = data.productosAsociados.map(a => ({
      producto_id: a.producto_id,
      producto_nombre: a.producto_nombre,
      costo_unitario: String(a.costo_unitario),
      tiempo_entrega_dias: a.tiempo_entrega_override != null ? String(a.tiempo_entrega_override) : '',
      pedido_minimo: a.pedido_minimo != null ? String(a.pedido_minimo) : ''
    }));
  });

  // Catálogo NO asociado aún (para el dropdown de añadir): derivados del array local, no del
  // server, para que al añadir una fila el producto desaparezca del selector sin round-trip.
  const noAsociados = $derived(
    data.catalogo.filter(c => !filas.some(f => f.producto_id === c.id))
  );
  let productoAElegir = $state(0);

  function agregarFila() {
    if (!productoAElegir) return;
    const cat = data.catalogo.find(c => c.id === productoAElegir);
    if (!cat) return;
    filas = [...filas, { producto_id: cat.id, producto_nombre: cat.nombre, costo_unitario: '', tiempo_entrega_dias: '', pedido_minimo: '' }];
    productoAElegir = 0;
  }

  function quitarFila(productoId: number) {
    filas = filas.filter(f => f.producto_id !== productoId);
  }

  // ── Cabecera: modal de editar (duplicado deliberado del de la lista; mismo service) ──
  let modalCabecera = $state(false);
  let cNombre = $state(''); let cContacto = $state(''); let cEmail = $state('');
  let cTelefono = $state(''); let cPlazo = $state(''); let cNotas = $state(''); let cActiva = $state(true);

  function abrirEditarCabecera() {
    if (!p) return;
    cNombre = p.nombre; cContacto = p.contacto || ''; cEmail = p.email || '';
    cTelefono = p.telefono || ''; cPlazo = p.tiempo_entrega_dias != null ? String(p.tiempo_entrega_dias) : '';
    cNotas = p.notas || ''; cActiva = p.activa === 1;
    modalCabecera = true;
  }

  // ── Métricas derivadas de la ficha (valor a COSTO, no a venta: cuánto dinero hay en
  //    productos que surte este proveedor). ──
  const metricas = $derived.by(() => {
    const asocs = data.productosAsociados;
    const valorCosto = asocs.reduce((acc, a) => acc + a.stock_actual * a.costo_unitario, 0);
    const plazos = asocs.map(a => a.tiempo_entrega_efectivo).filter((x): x is number => x != null);
    const plazoProm = plazos.length ? Math.round(plazos.reduce((a, b) => a + b, 0) / plazos.length) : null;
    return { productos: asocs.length, valorCosto, plazoProm };
  });

  // Toasts: reasociar/actualizar retornan success (idempotentes / edición en página) → $effect.
  $effect(() => {
    if (form?.success === 'proveedores.asociacionesGuardadas')
      mostrarToast($_('proveedores.asociacionesGuardadas'), 'success');
    else if (form?.success === 'proveedores.actualizado')
      mostrarToast($_('proveedores.actualizado'), 'success');
  });
</script>

<svelte:head>
  <title>{p ? p.nombre : $_('proveedores.noEncontrado')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/proveedores" class="btn-back">
      <span>←</span>
      <span>{$_('proveedores.volverLista')}</span>
    </a>
  </header>

  {#if form?.error}
    <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
  {/if}

  {#if !p}
    <section class="card estado-vacio">
      <p class="text-secondary">{$_('proveedores.noEncontrado')}</p>
      <a href="/proveedores" class="btn btn-secondary">{$_('proveedores.volverLista')}</a>
    </section>
  {:else}
    <!-- Cabecera read-only + métricas + botón editar -->
    <section class="card ficha-header">
      <div class="ficha-titulo">
        <h1>{p.nombre}</h1>
        <span class="badge" class:badge-success={p.activa === 1} class:badge-danger={p.activa === 0}>
          {p.activa === 1 ? $_('comun.activo') : $_('comun.inactivo')}
        </span>
        {#if data.rol === 'admin'}
          <button type="button" class="btn btn-sm btn-secondary" onclick={abrirEditarCabecera}>
            {$_('botones.editar')}
          </button>
        {/if}
      </div>
      <div class="ficha-datos">
        {#if p.contacto}<span><strong>{$_('proveedores.contacto')}:</strong> {p.contacto}</span>{/if}
        {#if p.email}<span><strong>{$_('proveedores.email')}:</strong> {p.email}</span>{/if}
        {#if p.telefono}<span><strong>{$_('proveedores.telefono')}:</strong> {p.telefono}</span>{/if}
        {#if p.tiempo_entrega_dias != null}
          <span><strong>{$_('proveedores.plazoGlobal')}:</strong> {$_('proveedores.plazoDias', { values: { dias: p.tiempo_entrega_dias } })}</span>
        {/if}
      </div>
      {#if p.notas}<p class="notas-box">{p.notas}</p>{/if}
      <div class="ficha-metricas">
        <div class="metrica-mini"><span class="metrica-label">{$_('proveedores.metricaProductos')}</span><span class="metrica-valor">{metricas.productos}</span></div>
        <div class="metrica-mini"><span class="metrica-label">{$_('proveedores.metricaValorCosto')}</span><span class="metrica-valor">{moneda.format(metricas.valorCosto)}</span></div>
        <div class="metrica-mini"><span class="metrica-label">{$_('proveedores.metricaPlazoProm')}</span><span class="metrica-valor">{metricas.plazoProm != null ? $_('proveedores.plazoDias', { values: { dias: metricas.plazoProm } }) : '—'}</span></div>
      </div>
    </section>

    <!-- Asociaciones: form en lote (reasociar). each keyed por producto_id para preservar
         los inputs editados al añadir/quitar filas. -->
    <section class="card">
      <h2>{$_('proveedores.asociacionesTitulo')}</h2>
      <p class="text-secondary text-sm">{$_('proveedores.asociacionesHint')}</p>

      <form method="POST" action="?/reasociar" use:enhance class="form-stack">
        {#if filas.length === 0}
          <p class="text-secondary">{$_('proveedores.sinAsociaciones')}</p>
        {:else}
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>{$_('transferencias.producto')}</th>
                  <th>{$_('proveedores.costoUnitario')}</th>
                  <th>{$_('proveedores.plazoOverride')}</th>
                  <th>{$_('proveedores.pedidoMinimo')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {#each filas as fila, i (fila.producto_id)}
                  <tr>
                    <td>
                      <strong>{fila.producto_nombre}</strong>
                      <input type="hidden" name="producto_id[]" value={fila.producto_id} />
                    </td>
                    <td>
                      <input type="number" name="costo_unitario[]" min="0" step="0.01"
                             bind:value={filas[i].costo_unitario} class="input-field campo-num" required
                             aria-label={$_('proveedores.costoUnitario')} />
                    </td>
                    <td>
                      <input type="number" name="tiempo_entrega_dias[]" min="0" step="1"
                             bind:value={filas[i].tiempo_entrega_dias} class="input-field campo-num"
                             placeholder={p.tiempo_entrega_dias != null ? $_('proveedores.heredaGlobal') : '—'}
                             aria-label={$_('proveedores.plazoOverride')} />
                    </td>
                    <td>
                      <input type="number" name="pedido_minimo[]" min="0" step="1"
                             bind:value={filas[i].pedido_minimo} class="input-field campo-num" aria-label={$_('proveedores.pedidoMinimo')} />
                    </td>
                    <td>
                      <button type="button" class="btn btn-sm btn-danger"
                              onclick={() => quitarFila(fila.producto_id)}
                              aria-label={$_('proveedores.quitar')} title={$_('proveedores.quitar')}>🗑️</button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- Fila de añadir (controlada por productoAElegir; no se envía, es UI de borrador) -->
        {#if data.rol === 'admin' && noAsociados.length > 0}
          <div class="anadir-fila">
            <select bind:value={productoAElegir} class="input-field" aria-label={$_('proveedores.seleccionarProducto')}>
              <option value={0}>{$_('proveedores.seleccionarProducto')}</option>
              {#each noAsociados as c}
                <option value={c.id}>{c.nombre}</option>
              {/each}
            </select>
            <button type="button" class="btn btn-sm btn-secondary" onclick={agregarFila} disabled={!productoAElegir}>
              + {$_('proveedores.anadir')}
            </button>
          </div>
        {/if}

        {#if data.rol === 'admin'}
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">{$_('proveedores.guardarAsociaciones')}</button>
          </div>
        {/if}
      </form>

      {#if data.rol === 'admin'}
        <form method="POST" action="?/eliminar" use:enhance class="form-eliminar">
          <button type="submit" class="btn btn-sm btn-danger"
                  onclick={(e) => { if (!confirm($_('proveedores.confirmarEliminar', { values: { nombre: p.nombre } }))) e.preventDefault(); }}>
            {$_('proveedores.eliminarProveedor')}
          </button>
        </form>
      {/if}
    </section>
  {/if}
</main>

{#if modalCabecera && p}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="cab-title"
    onclick={(e) => { if (e.target === e.currentTarget) modalCabecera = false; }}
    onkeydown={(e) => { if (e.key === 'Escape') modalCabecera = false; }}
    tabindex="-1"
  >
    <div class="modal-content">
      <header class="modal-header">
        <h2 id="cab-title">{$_('proveedores.editar')}</h2>
        <button
          class="modal-close"
          type="button"
          aria-label={$_('botones.cancelar')}
          onclick={() => modalCabecera = false}
        >
          ×
        </button>
      </header>

      <form
        method="POST"
        action="?/actualizar"
        use:enhance={() => async ({ result, update }) => {
          if (result.type === 'success') {
            modalCabecera = false;
          }
          await update();
        }}
        class="modal-form"
      >
        <div class="modal-body">
          <div class="input-group">
            <label for="cn" class="label">{$_('proveedores.nombre')}</label>
            <input
              id="cn"
              type="text"
              name="nombre"
              bind:value={cNombre}
              required
              class="input-field"
            />
          </div>

          <div class="input-group">
            <label for="cc" class="label">{$_('proveedores.contacto')}</label>
            <input
              id="cc"
              type="text"
              name="contacto"
              bind:value={cContacto}
              class="input-field"
            />
          </div>

          <div class="input-group">
            <label for="ce" class="label">{$_('proveedores.email')}</label>
            <input
              id="ce"
              type="email"
              name="email"
              bind:value={cEmail}
              class="input-field"
            />
          </div>

          <div class="input-group">
            <label for="ct" class="label">{$_('proveedores.telefono')}</label>
            <input
              id="ct"
              type="tel"
              name="telefono"
              bind:value={cTelefono}
              class="input-field"
            />
          </div>

          <div class="input-group">
            <label for="cp" class="label">{$_('proveedores.plazoGlobal')}</label>
            <input
              id="cp"
              type="number"
              name="tiempo_entrega_dias"
              min="0"
              step="1"
              bind:value={cPlazo}
              class="input-field"
            />
            <span class="text-secondary text-sm">{$_('proveedores.plazoHint')}</span>
          </div>

          <div class="input-group">
            <label for="cno" class="label">{$_('proveedores.notas')}</label>
            <textarea
              id="cno"
              name="notas"
              bind:value={cNotas}
              rows="3"
              class="input-field"
            ></textarea>
          </div>

          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" name="activa" bind:checked={cActiva} />
              <span>{$_('proveedores.activa')}</span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => modalCabecera = false}
          >
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
    margin-bottom: 1.5rem; 
    }
  .estado-vacio { 
    text-align: center; 
    padding: 3rem 1.5rem;
    display: grid; 
    gap: 1rem; 
    justify-items: center; 
    }
  .ficha-header { 
    margin-bottom: 1.5rem; 
    }
    
  .ficha-titulo { 
    display: flex; 
    align-items: center; 
    gap: 0.75rem; 
    flex-wrap: wrap; 
    margin-bottom: 0.75rem; 
  }

  .ficha-titulo h1 { 
    margin: 0; 
    font-size: 1.6rem; 
  }

  .ficha-datos { 
    display: flex; 
    flex-wrap: wrap; 
    gap: 1rem; 
    color: var(--text-secondary); 
    font-size: var(--font-size-sm); 
  }

  .notas-box { 
    background: var(--bg-secondary); 
    padding: 0.75rem 1rem; 
    border-radius: 6px; 
    border-left: 4px solid var(--accent-primary); 
    margin: 0.75rem 0; 
  }

  .ficha-metricas { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
    gap: 1rem; 
    margin-top: 1rem; 
  }

  .metrica-mini { 
    display: flex; 
    flex-direction: column; 
    gap: 0.25rem; 
    padding: 0.9rem 1rem; 
    border-radius: 8px; 
    background: var(--bg-secondary); 
    border: 1px solid var(--border-color); 
  }

  .metrica-label { 
    font-size: var(--font-size-sm); 
    color: var(--text-secondary); 
  }

  .metrica-valor { 
    font-size: 1.3rem; 
    font-weight: var(--font-weight-bold); 
  }

  .table-container { 
    overflow-x: auto; 
    margin: 1rem 0; 
  }

  .data-table { 
    width: 100%; 
    border-collapse: collapse; 
  }

  .data-table th, .data-table td { 
    padding: 0.6rem 0.75rem; 
    text-align: left; 
    border-bottom: 1px solid var(--border-color); 
  }

  .data-table th { 
    font-weight: var(--font-weight-semibold); 
    color: var(--text-secondary); 
    font-size: var(--font-size-sm); 
  }

  .campo-num { 
    width: 110px; 
  }

  .anadir-fila { 
    display: flex; 
    gap: 0.5rem; 
    align-items: center; 
    margin-top: 0.5rem; 
  }

  .form-eliminar { 
    margin-top: 1.5rem; 
    padding-top: 1rem; 
    border-top: 1px solid var(--border-color); 
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
    flex-shrink: 0;
    padding: 1.5rem 1.5rem 0;
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

  .modal-form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    flex-shrink: 0;
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