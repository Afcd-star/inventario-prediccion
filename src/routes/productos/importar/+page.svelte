<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { tick } from 'svelte';
  import Papa from 'papaparse';
  import { mostrarToast } from '$lib/stores/toasts';
  import { parsearArchivo } from '$lib/utils/parseoArchivos';
  import TablaPreview from '$lib/components/importacion/TablaPreview.svelte';
  import ResumenImportacion from '$lib/components/importacion/ResumenImportacion.svelte';
  import type { ColumnaPreview, ModoImportacion, ResultadoImportacion } from '$lib/types';

  const COLUMNAS_REQUERIDAS = ['nombre', 'precio', 'stock_minimo'];

  let archivoSeleccionado = $state<File | null>(null);
  let filasParseadas = $state<Array<Record<string, string>>>([]);
  let erroresParseo = $state<string[]>([]);
  let modoImportacion = $state<ModoImportacion>('crear');
  let importando = $state(false);
  let resultado = $state<ResultadoImportacion | null>(null);

  let inputArchivo = $state<HTMLInputElement | null>(null);
  let previewRef = $state<HTMLElement | null>(null);
  let resultadoRef = $state<HTMLElement | null>(null);

  const columnas = $derived<ColumnaPreview[]>([
    { clave: 'nombre', etiqueta: $_('importacion.colNombre') },
    { clave: 'descripcion', etiqueta: $_('importacion.colDescripcion') },
    { clave: 'precio', etiqueta: $_('importacion.colPrecio'), tipo: 'numero', paso: '0.01' },
    { clave: 'stock_minimo', etiqueta: $_('importacion.colStockMinimo'), tipo: 'numero' }
  ]);

  async function handleArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    archivoSeleccionado = archivo;
    erroresParseo = [];
    filasParseadas = [];
    resultado = null;

    const { filas, errores } = await parsearArchivo(archivo, COLUMNAS_REQUERIDAS);
    erroresParseo = errores;
    filasParseadas = filas;

    if (filas.length > 0) {
      mostrarToast(`${$_('importacion.previsualizacion')}: ${filas.length} ${$_('importacion.filas')}`, 'success');
      await tick();
      previewRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validarFila(fila: Record<string, string>): string[] {
    const errores: string[] = [];

    if (!fila.nombre || fila.nombre.trim().length === 0) {
      errores.push($_('importacion.errNombreVacio'));
    }

    const precio = Number(fila.precio);
    if (isNaN(precio) || precio < 0) {
      errores.push($_('importacion.errPrecioInvalido'));
    }

    const stockMinimo = Number(fila.stock_minimo);
    if (isNaN(stockMinimo) || stockMinimo < 0 || !Number.isInteger(stockMinimo)) {
      errores.push($_('importacion.errStockMinInvalido'));
    }

    return errores;
  }

  function editarCelda(indice: number, campo: string, valor: string) {
    filasParseadas[indice] = { ...filasParseadas[indice], [campo]: valor };
  }

  async function confirmarImportacion() {
    if (filasParseadas.length === 0) {
      mostrarToast($_('importacion.sinDatos'), 'error');
      return;
    }

    importando = true;
    resultado = null;

    try {
      const res = await fetch('/api/importar/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filas: filasParseadas,
          modo: modoImportacion,
          nombreArchivo: archivoSeleccionado?.name || 'importacion.csv'
        })
      });

      if (!res.ok) {
        let mensaje = `${$_('importacion.errorImportacion')} (${res.status})`;
        try {
          const errorData = await res.json();
          mensaje = errorData.message || errorData.data?.message || mensaje;
        } catch {
          /* body no-JSON */
        }
        throw new Error(mensaje);
      }

      const responseData = await res.json();
      const importResult = responseData.data as ResultadoImportacion;
      resultado = importResult;

      if (importResult.errores.length === 0 && importResult.exitosas + importResult.actualizadas > 0) {
        mostrarToast(
          `${importResult.exitosas} ${$_('importacion.productosCreados')}, ${importResult.actualizadas} ${$_('importacion.productosActualizados')}`,
          'success'
        );
        filasParseadas = [];
        archivoSeleccionado = null;
        if (inputArchivo) inputArchivo.value = '';
      } else {
        mostrarToast(`${$_('importacion.errores')}: ${importResult.errores.length}`, 'warning');
      }

      await tick();
      resultadoRef?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error: any) {
      mostrarToast(error.message || 'Error al importar', 'error');
    } finally {
      importando = false;
    }
  }

  function descargarPlantilla(formato: 'csv' | 'xlsx') {
    window.location.href = `/api/plantillas/productos?formato=${formato}`;
  }

  function descargarReporteErrores() {
    if (!resultado || resultado.errores.length === 0) return;
    const csv = Papa.unparse(resultado.errores);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_importacion.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>{$_('importacion.tituloProductos')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('productos.volver')}</span>
    </a>

    <nav class="import-tabs" aria-label="Tipos de importación">
      <a href="/productos/importar" class="import-tab import-tab-active">
        {$_('productos.importar')}
      </a>
      <a href="/productos/importar-stock" class="import-tab">
        {$_('productos.importarStock')}
      </a>
    </nav>

    <h1>📥 {$_('importacion.tituloProductos')}</h1>
    <span class="badge badge-info badge-modalidad">📥 {$_('importacion.badgeCatalogo')}</span>
    <p class="text-secondary">{$_('importacion.subtituloProductos')}</p>
  </header>

  <section class="card">
    <h2>1. {$_('importacion.seleccionarArchivo')}</h2>
    <div class="upload-area">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        bind:this={inputArchivo}
        onchange={handleArchivo}
        id="archivo-csv"
        class="hidden"
      />
      <label for="archivo-csv" class="upload-label">
        <span class="upload-icon">📁</span>
        <span class="upload-text">
          {archivoSeleccionado ? archivoSeleccionado.name : $_('importacion.seleccionarArchivoTexto')}
        </span>
      </label>
      <button onclick={() => descargarPlantilla('csv')} class="btn btn-sm btn-secondary">
        📄 {$_('importacion.descargarPlantillaCSV')}
      </button>
      <button onclick={() => descargarPlantilla('xlsx')} class="btn btn-sm btn-secondary">
        📊 {$_('importacion.descargarPlantillaExcel')}
      </button>
    </div>

    {#if erroresParseo.length > 0}
      <div class="alert alert-danger">
        <strong>{$_('importacion.erroresParseo')}:</strong>
        <ul>
          {#each erroresParseo as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  {#if filasParseadas.length > 0}
    <section class="card" bind:this={previewRef}>
      <h2>2. {$_('importacion.previsualizacion')} ({filasParseadas.length} {$_('importacion.filas')})</h2>

      <div class="modo-selector">
        <div class="label">{$_('importacion.etiquetaModo').split(' (')[0]}:</div>
        <select bind:value={modoImportacion} class="input">
          <option value="crear">{$_('importacion.modoCrear')}</option>
          <option value="actualizar">{$_('importacion.modoActualizar')}</option>
        </select>
      </div>

      <TablaPreview
        filas={filasParseadas}
        columnas={columnas}
        validador={validarFila}
        onEditar={editarCelda}
      />

      <div class="acciones-importar">
        <button
          onclick={confirmarImportacion}
          disabled={importando || erroresParseo.length > 0}
          class="btn btn-primary"
        >
          {importando ? `⏳ ${$_('importacion.importando')}` : `✅ ${$_('importacion.confirmarImportacion')}`}
        </button>
      </div>
    </section>
  {/if}

  {#if resultado}
    <section class="card" bind:this={resultadoRef}>
      <h2>3. {$_('importacion.resultadoImportacion')}</h2>

      <ResumenImportacion
        resultado={resultado}
        etiquetaExitosas={$_('importacion.productosCreados')}
        etiquetaActualizadas={$_('importacion.productosActualizados')}
      />

      {#if resultado.errores.length > 0}
        <button onclick={descargarReporteErrores} class="btn btn-sm btn-secondary">
          📄 {$_('importacion.reporteErrores')}
        </button>
      {/if}
    </section>
  {/if}
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .import-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .import-tab {
    padding: 0.6rem 1.25rem;
    background: transparent;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s;
  }

  .import-tab:hover {
    color: var(--text-primary);
  }

  .import-tab-active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }

  .badge-modalidad {
    display: inline-block;
    margin-bottom: 0.5rem;
  }

  .upload-area {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .hidden {
    display: none;
  }

  .upload-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    flex: 1;
    min-width: 200px;
  }

  .upload-label:hover {
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
  }

  .upload-icon {
    font-size: 2rem;
  }

  .upload-text {
    color: var(--text-secondary);
  }

  .modo-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .acciones-importar {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .upload-area {
      flex-direction: column;
      align-items: stretch;
    }

    .modo-selector {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>