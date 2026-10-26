<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import type { PageData } from './$types';
  import GraficoTendencias from '$lib/components/graficos/GraficoTendencias.svelte';

  let { data }: { data: PageData } = $props();
  const p = $derived(data.producto);

  // Mapeo locale corto (svelte-i18n) → BCP-47 válido para Intl (mismo patrón que /reportes).
  const MAPA_LOCALE_INTL: Record<string, string> = { es: 'es-ES', en: 'en-US' };
  const localeIntl = $derived(MAPA_LOCALE_INTL[$locale ?? 'es'] ?? 'es-ES');
  const moneda = $derived(new Intl.NumberFormat(localeIntl, { style: 'currency', currency: 'EUR' }));

  const stockBajo = $derived(p != null && p.stock_actual <= p.stock_minimo);
</script>

<svelte:head>
  <title>{p ? p.nombre : $_('producto.noEncontrado')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('producto.volver')}</span>
    </a>
  </header>

  {#if !p}
    <section class="card estado-vacio">
      <p class="text-secondary">{$_('producto.noEncontrado')}</p>
      <a href="/productos" class="btn btn-secondary">{$_('producto.volver')}</a>
    </section>
  {:else}
    <section class="card ficha-header">
      <div class="ficha-titulo">
        <h1>{p.nombre}</h1>
        <span class="badge" class:badge-danger={stockBajo} class:badge-success={!stockBajo}>
          {stockBajo ? $_('producto.badgeBajo') : $_('producto.badgeOk')}
        </span>
      </div>
      <div class="ficha-metricas">
        <div class="metrica-mini">
          <span class="metrica-label">{$_('producto.precio')}</span>
          <span class="metrica-valor">{moneda.format(p.precio)}</span>
        </div>
        <div class="metrica-mini">
          <span class="metrica-label">{$_('producto.stock')}</span>
          <span class="metrica-valor" class:text-danger={stockBajo}>{p.stock_actual}</span>
        </div>
        <div class="metrica-mini">
          <span class="metrica-label">{$_('producto.minimo')}</span>
          <span class="metrica-valor">{p.stock_minimo}</span>
        </div>
      </div>
    </section>

    <!-- Hub de navegación: enlaza a las subrutas EXISTENTES (no duplica sus forms).
         Opción A: sin botón Eliminar (ese vive en la tabla /productos). -->
    <section class="card subrutas">
      <h2>{$_('producto.acciones')}</h2>
      <div class="acciones-grid">
        <a href="/productos/{p.id}/movimientos" class="btn btn-primary">📦 {$_('producto.verMovimientos')}</a>
        <a href="/productos/{p.id}/lotes" class="btn btn-secondary">🏷️ {$_('producto.verLotes')}</a>
        <a href="/productos/{p.id}/editar" class="btn btn-secondary">✏️ {$_('producto.editar')}</a>
        <a href="/productos/{p.id}/qr" class="btn btn-secondary">🔳 {$_('producto.verQR')}</a>
      </div>
    </section>

    <!-- Proveedores que surten ESTE producto (solo activos). La asociación se gestiona
    desde la ficha del proveedor (/proveedores/[id]); aquí es lectura + click-through. -->
    <section class="card proveedores-ficha">
      <h2>{$_('producto.proveedores')}</h2>
      {#if data.proveedores.length === 0}
        <p class="text-secondary">{$_('producto.proveedoresVacio')}</p>
      {:else}
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>{$_('proveedores.nombre')}</th>
                <th>{$_('proveedores.contacto')}</th>
                <th>{$_('proveedores.costoUnitario')}</th>
                <th>{$_('proveedores.plazo')}</th>
                <th>{$_('proveedores.pedidoMinimo')}</th>
              </tr>
            </thead>
            <tbody>
              {#each data.proveedores as prov}
                <tr>
                  <td>
                    <a href="/proveedores/{prov.proveedor_id}" class="product-name">{prov.nombre}</a>
                  </td>
                  <td class="text-secondary">
                    {prov.email || prov.telefono || prov.contacto || '—'}
                  </td>
                  <td>{moneda.format(prov.costo_unitario)}</td>
                  <td>
                    {prov.tiempo_entrega_efectivo != null
                      ? $_('proveedores.plazoDias', { values: { dias: prov.tiempo_entrega_efectivo } })
                      : '—'}
                  </td>
                  <td>{prov.pedido_minimo != null ? prov.pedido_minimo : '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <!-- Tendencia temporal de ESTE producto (cierre Fase 13). Fetch lazy al montar la ficha. -->
    <GraficoTendencias
      ambito={p.id}
      titulo={$_('tendencias.tituloProducto')}
      rangoInicial="30d"
    />
  {/if}
</main>

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
    margin-bottom: 1.25rem; 
  }

  .ficha-titulo h1 { 
    margin: 0; 
    font-size: 1.6rem; 
  }

  .ficha-metricas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
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
    font-size: 1.4rem; 
    font-weight: var(--font-weight-bold); 
    color: var(--text-primary); 
  }

  .text-danger { 
    color: var(--status-danger-text, var(--accent-danger)); 
  }

  .acciones-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .subrutas {
    margin-bottom: 1.5rem;
  }

  .proveedores-ficha { 
    margin-bottom: 1.5rem; 
  }

  .table-container { 
    overflow-x: auto; 
    margin-top: 0.75rem; 
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

  .product-name { 
    font-weight: var(--font-weight-semibold); 
    color: var(--accent-primary); 
    text-decoration: none; 
  }

  .product-name:hover { 
    text-decoration: underline; 
  }
</style>