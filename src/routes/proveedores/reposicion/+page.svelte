<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import type { PageData } from './$types';
  import type { SugerenciaReposicion } from '$lib/types';
  import BotonOC from '$lib/components/BotonOC.svelte';

  let { data }: { data: PageData } = $props();

  // Formatter de moneda coherente con /reportes y ficha de proveedor.
  const MAPA_LOCALE_INTL: Record<string, string> = { es: 'es-ES', en: 'en-US' };
  const localeIntl = $derived(MAPA_LOCALE_INTL[$locale ?? 'es'] ?? 'es-ES');
  const moneda = $derived(new Intl.NumberFormat(localeIntl, { style: 'currency', currency: 'EUR' }));

  // ── Modal "Ver otros proveedores". Read-only: guarda la sugerencia completa para acceder
  //    al ranking (.proveedores) sin round-trip. Sin bind en el each → no aplica
  //    each_item_invalid_assignment de runes mode. ──
  let modalOtrosAbierto = $state(false);
  let sugerenciaSeleccionada = $state<SugerenciaReposicion | null>(null);

  function abrirOtros(sugerencia: SugerenciaReposicion) {
    sugerenciaSeleccionada = sugerencia;
    modalOtrosAbierto = true;
  }
  function cerrarOtros() { modalOtrosAbierto = false; }

  // ── Selección para OC (Fase 15.5). Set de producto_id marcados. Efímero (A+): se pierde
  //    al recargar, coherente con que la OC no se persiste. M4: marcar una fila = pedir al
  //    proveedor RECOMENDADO de esa fila con su q_sugerida. M5: filas sin proveedor no se
  //    pueden marcar. ──
  let seleccion = $state<Set<number>>(new Set());
  
  function toggleSeleccion(productoId: number) {
    const nuevo = new Set(seleccion);
    if (nuevo.has(productoId)) nuevo.delete(productoId);
    else nuevo.add(productoId);
    seleccion = nuevo;   // reasigno para que Svelte note el cambio de Set (inmutabilidad)
  }
  // Líneas del payload: para cada producto marcado, el par recomendado + su q_sugerida.
  const lineasOC = $derived(
    data.sugerencias
      .filter(s => seleccion.has(s.producto_id) && s.proveedor_recomendado_id != null && s.q_sugerida != null)
      .map(s => ({
        producto_id: s.producto_id,
        proveedor_id: s.proveedor_recomendado_id!,
        cantidad: s.q_sugerida!
      }))
  );
      // Resumen del confirm (M6): "Vas a generar N OCs: ProvA, ProvB". N = proveedores únicos.
  const resumenOC = $derived.by(() => {
    const marcadas = data.sugerencias.filter(s => seleccion.has(s.producto_id));
    const proveedores = [...new Set(marcadas.map(s => s.proveedor_recomendado_nombre).filter((x): x is string => x != null))];
    return {
      nOCs: proveedores.length,
      nombres: proveedores.join(', '),
      mensaje: proveedores.length === 0
        ? ''
        : $_('oc.confirmando', { values: { n: proveedores.length, proveedores: proveedores.join(', ') } })
    };
  });
  const nombreArchivoOC = $derived(
    `orden_compra_${new Date().toISOString().split('T')[0]}.pdf`
  );
</script>

<svelte:head>
  <title>{$_('reposicion.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/proveedores" class="btn-back">
      <span>←</span>
      <span>{$_('reposicion.volver')}</span>
    </a>
    <div class="header-actions">
      <h1>{$_('reposicion.titulo')}</h1>
    </div>
    <p class="text-secondary">{$_('reposicion.descripcion')}</p>
  </header>

  <!-- Aviso A+ (patrón stale-while-error): honesto sobre su límite, no oculto. -->
  <div class="alert alert-info reposicion-hint">
    ℹ️ {$_('reposicion.avisoLimite')}
  </div>

  {#if data.sugerencias.length === 0}
    <section class="card estado-vacio">
      <p class="text-secondary">{$_('reposicion.sinSugerencias')}</p>
      <a href="/proveedores" class="btn btn-secondary">{$_('reposicion.volver')}</a>
    </section>
  {:else}
    <section class="card">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-seleccion" aria-label={$_('oc.seleccionar')}></th>
              <th>{$_('reposicion.colProducto')}</th>
              <th>{$_('reposicion.colStock')}</th>
              <th>{$_('reposicion.colDias')}</th>
              <th>{$_('reposicion.colProveedor')}</th>
              <th>{$_('reposicion.colPlazo')}</th>
              <th>{$_('reposicion.colCosto')}</th>
              <th>{$_('reposicion.colCantidad')}</th>
              <th>{$_('reposicion.acciones')}</th>
            </tr>
          </thead>
          <tbody>
            {#each data.sugerencias as sug (sug.producto_id)}
              <tr>
                <td class="col-seleccion">
                  {#if sug.proveedor_recomendado_id != null && sug.q_sugerida != null}
                    <input
                      type="checkbox"
                      checked={seleccion.has(sug.producto_id)}
                      onchange={() => toggleSeleccion(sug.producto_id)}
                      aria-label={$_('oc.seleccionarProducto', { values: { producto: sug.producto_nombre } })}
                    />
                  {:else}
                    <input type="checkbox" disabled title={$_('reposicion.sinProveedor')} aria-label={$_('oc.noDisponible')} />
                  {/if}
                </td>
                <td>
                  <a href="/productos/{sug.producto_id}" class="product-name">{sug.producto_nombre}</a>
                  {#if sug.bajo_minimo}
                    <span class="badge badge-danger">{$_('reposicion.badgeBajoMinimo')}</span>
                  {/if}
                </td>
                <td>
                  <span class:text-danger={sug.bajo_minimo}>{sug.stock_actual}</span>
                  <span class="text-secondary"> / {sug.stock_minimo}</span>
                </td>
                <td>{sug.dias_hasta_agotar != null ? sug.dias_hasta_agotar : '—'}</td>
                <td>
                  {#if sug.proveedor_recomendado_nombre}
                    <a href="/proveedores/{sug.proveedor_recomendado_id}" class="product-name">
                      {sug.proveedor_recomendado_nombre}
                    </a>
                  {:else}
                    <span class="text-secondary">{$_('reposicion.sinProveedor')}</span>
                  {/if}
                </td>
                <!-- Lead-time DESTACADO (Opción 2): criterio de orden y lo que compara el usuario. -->
                <td class="plazo-destacado">
                  {#if sug.lead_time_efectivo != null}
                    {$_('proveedores.plazoDias', { values: { dias: sug.lead_time_efectivo } })}
                  {:else}
                    <span class="text-secondary">{$_('reposicion.plazoNoRegistrado')}</span>
                  {/if}
                </td>
                <td class="text-secondary">
                  {sug.costo_unitario != null ? moneda.format(sug.costo_unitario) : '—'}
                </td>
                <td><strong>{sug.q_sugerida != null ? sug.q_sugerida : '—'}</strong></td>
                <td>
                  {#if sug.proveedores.length > 1}
                    <button type="button" class="btn btn-sm btn-secondary" onclick={() => abrirOtros(sug)}>
                      {$_('reposicion.verOtros')}
                    </button>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if seleccion.size > 0}
        <div class="barra-oc">
          <span class="text-secondary text-sm">
            {$_('oc.seleccionados', { values: { n: seleccion.size } })}
            {#if resumenOC.nOCs > 0}
              · {$_('oc.ocAGenerar', { values: { n: resumenOC.nOCs } })}
            {/if}
          </span>
          <BotonOC
            lineas={lineasOC}
            mensajeConfirm={resumenOC.mensaje}
            nombreArchivo={nombreArchivoOC}
            variante="primario"
          />
        </div>
      {/if}
    </section>
  {/if}
</main>

{#if modalOtrosAbierto && sugerenciaSeleccionada}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="otros-title"
    onclick={(e) => { if (e.target === e.currentTarget) cerrarOtros(); }}
    onkeydown={(e) => { if (e.key === 'Escape') cerrarOtros(); }}
    tabindex="-1"
  >
    <!-- MODAL ANCHO DESDE EL INICIO (absorbe A1): tabla de 5 columnas necesita ~720 px. -->
    <div class="modal-content modal-content--wide">
      <header class="modal-header">
        <h2 id="otros-title">
          {$_('reposicion.modalTitulo', { values: { producto: sugerenciaSeleccionada.producto_nombre } })}
        </h2>
        <button class="modal-close" type="button" aria-label={$_('botones.cancelar')} onclick={cerrarOtros}>×</button>
      </header>

      <div class="modal-body">
        <p class="text-secondary text-sm">{$_('reposicion.modalHint')}</p>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>{$_('proveedores.nombre')}</th>
                <th>{$_('proveedores.plazoOverride')}</th>
                <th>{$_('proveedores.costoUnitario')}</th>
                <th>{$_('reposicion.colCantidad')}</th>
                <th>{$_('proveedores.pedidoMinimo')}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Orden traído por el service: lead-time ASC, costo desempate, nulls al fondo.
                   Recomendado = primera fila (posición, no badge — sin interpretación). -->
              {#each sugerenciaSeleccionada.proveedores as prov (prov.proveedor_id)}
                <tr>
                  <td>
                    <a href="/proveedores/{prov.proveedor_id}" class="product-name">{prov.proveedor_nombre}</a>
                  </td>
                  <td class="plazo-destacado">
                    {#if prov.lead_time_efectivo != null}
                      {$_('proveedores.plazoDias', { values: { dias: prov.lead_time_efectivo } })}
                    {:else}
                      <span class="text-secondary">{$_('reposicion.plazoNoRegistrado')}</span>
                    {/if}
                  </td>
                  <td class="text-secondary">{moneda.format(prov.costo_unitario)}</td>
                  <td><strong>{prov.q_sugerida}</strong></td>
                  <td>{prov.pedido_minimo != null ? prov.pedido_minimo : '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick={cerrarOtros}>{$_('botones.cancelar')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header { 
    margin-bottom: 1.5rem; 
   }

  .header-actions { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    width: 100%; 
  }

  .estado-vacio { 
    text-align: center; 
    padding: 3rem 1.5rem; 
    display: grid; gap: 1rem; 
    justify-items: center; 
  }
  
  .reposicion-hint { 
    margin-bottom: 1.5rem; 
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
  
  .badge-danger { 
    background: var(--status-danger-bg); 
    color: var(--status-danger-text); 
   }

  .text-sm { 
    font-size: var(--font-size-sm); 
  }

  .text-danger { 
    color: var(--status-danger-text, var(--accent-danger)); 
  }

  .plazo-destacado { 
    font-weight: var(--font-weight-bold); 
    color: var(--accent-primary); 
 }

  /* Modales: patrón scroll soldado (header fijo + body scrolleable + footer fijo). */
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
  /* Clave modificadora para tablas anchas (A1 absorbido): ensancha SOLO este modal. */
  .modal-content--wide { 
    max-width: 720px; 
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

  .col-seleccion { 
    width: 2.5rem; 
    text-align: center; 
  }

  .col-seleccion input[type="checkbox"] { 
    width: 1.1rem; height: 1.1rem; 
    cursor: pointer; 
    accent-color: var(--accent-primary); }

  .col-seleccion input[type="checkbox"]:disabled { 
    cursor: not-allowed; 
    opacity: 0.4; 
  }

  .barra-oc {
    display: flex; 
    justify-content: space-between; 
    align-items: center; gap: 1rem;
    margin-top: 1rem; 
    padding-top: 1rem; 
    border-top: 1px solid var(--border-color);
    flex-wrap: wrap;
  }
</style>