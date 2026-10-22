<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Papa from 'papaparse';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';

  let { data }: { data: PageData } = $props();

  interface FilaStock {
    producto: string;
    cantidad: number | string;
    numero_lote?: string;
    fecha_caducidad?: string;
    ubicacion?: string;
  }

  interface ResultadoStock {
    exitosas: number;
    actualizadas: number;
    errores: Array<{ fila: number; nombre?: string; motivo: string }>;
  }

  let archivoSeleccionado = $state<File | null>(null);
  let filasParseadas = $state<FilaStock[]>([]);
  let erroresParseo = $state<string[]>([]);
  let importando = $state(false);
  let resultado = $state<ResultadoStock | null>(null);
  let paginaPreview = $state(0);
  const FILAS_POR_PAGINA = 50;

  let inputArchivo: HTMLInputElement;

  function handleArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      archivoSeleccionado = archivo;
      parsearCSV(archivo);
    } else if (extension === 'xlsx' || extension === 'xls') {
      archivoSeleccionado = archivo;
      parsearExcel(archivo);
    } else {
      mostrarToast('Solo se permiten archivos CSV o Excel (.xlsx, .xls)', 'error');
      input.value = '';
    }
  }

  function parsearCSV(archivo: File) {
    erroresParseo = [];
    filasParseadas = [];
    resultado = null;
    paginaPreview = 0;

    Papa.parse(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          erroresParseo = results.errors.map(e => `Fila ${e.row}: ${e.message}`);
        }

        const headers = results.meta.fields || [];
        const columnasRequeridas = ['producto', 'cantidad'];
        const columnasFaltantes = columnasRequeridas.filter(c => !headers.includes(c));

        if (columnasFaltantes.length > 0) {
          erroresParseo.push(`Columnas faltantes: ${columnasFaltantes.join(', ')}`);
          return;
        }

        filasParseadas = results.data.map((fila: any) => ({
          producto: fila.producto || '',
          cantidad: fila.cantidad || '',
          numero_lote: fila.numero_lote || '',
          fecha_caducidad: fila.fecha_caducidad || '',
          ubicacion: fila.ubicacion || ''
        }));

        if (filasParseadas.length === 0) {
          erroresParseo.push('El archivo está vacío o no tiene datos válidos');
        } else {
          mostrarToast(`Archivo parseado: ${filasParseadas.length} filas encontradas`, 'success');
        }
      },
      error: (error) => {
        erroresParseo.push(`Error al parsear: ${error.message}`);
      }
    });
  }

  async function parsearExcel(archivo: File) {
    erroresParseo = [];
    filasParseadas = [];
    resultado = null;
    paginaPreview = 0;

    try {
      const XLSX = await import('xlsx');
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: 'array' });

      const nombreHoja = libro.SheetNames[0];
      if (!nombreHoja) {
        erroresParseo.push('El archivo no contiene hojas.');
        return;
      }

      const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        libro.Sheets[nombreHoja],
        { defval: '' }
      );

      if (filas.length === 0) {
        erroresParseo.push('El archivo está vacío o no tiene datos válidos');
        return;
      }

      const headers = Object.keys(filas[0]);
      const columnasRequeridas = ['producto', 'cantidad'];
      const columnasFaltantes = columnasRequeridas.filter(c => !headers.includes(c));

      if (columnasFaltantes.length > 0) {
        erroresParseo.push(`Columnas faltantes: ${columnasFaltantes.join(', ')}`);
        return;
      }

      filasParseadas = filas.map((fila) => ({
        producto: String(fila.producto ?? ''),
        cantidad: String(fila.cantidad ?? ''),
        numero_lote: String(fila.numero_lote ?? ''),
        fecha_caducidad: String(fila.fecha_caducidad ?? ''),
        ubicacion: String(fila.ubicacion ?? '')
      }));

      mostrarToast(`Archivo parseado: ${filasParseadas.length} filas encontradas`, 'success');
    } catch (error: any) {
      erroresParseo.push(`Error al leer el archivo: ${error.message}`);
    }
  }

  function editarCelda(filaIndex: number, campo: keyof FilaStock, valor: string) {
    filasParseadas[filaIndex] = {
      ...filasParseadas[filaIndex],
      [campo]: valor
    };
  }

  function validarFila(fila: FilaStock): string[] {
    const errores: string[] = [];

    if (!fila.producto || fila.producto.trim().length === 0) {
      errores.push('Producto vacío');
    }

    const cantidad = Number(fila.cantidad);
    if (isNaN(cantidad) || cantidad <= 0 || !Number.isInteger(cantidad)) {
      errores.push('Cantidad debe ser entero > 0');
    }

    if (fila.fecha_caducidad && String(fila.fecha_caducidad).trim() !== '') {
      const fechaStr = String(fila.fecha_caducidad).trim();
      const esIsoValida = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr) && !isNaN(new Date(fechaStr).getTime());
      if (!esIsoValida) {
        errores.push('Fecha inválida (AAAA-MM-DD)');
      }
    }

    return errores;
  }

  async function confirmarImportacion() {
    if (filasParseadas.length === 0) {
      mostrarToast('No hay datos para importar', 'error');
      return;
    }

    importando = true;
    resultado = null;

    try {
      const res = await fetch('/api/importar/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filas: filasParseadas,
          nombreArchivo: archivoSeleccionado?.name || 'stock_inicial.csv'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error en la importación');
      }

      const responseData = await res.json();
      const importResult = responseData.data;

      resultado = importResult;

      if (importResult.errores.length === 0 && importResult.exitosas + importResult.actualizadas > 0) {
        mostrarToast(
          `Stock importado: ${importResult.exitosas} lotes creados, ${importResult.actualizadas} repuestos`,
          'success'
        );
        filasParseadas = [];
        archivoSeleccionado = null;
        if (inputArchivo) inputArchivo.value = '';
      } else {
        mostrarToast(`Importación completada con ${importResult.errores.length} errores`, 'warning');
      }
    } catch (error: any) {
      mostrarToast(error.message || 'Error al importar', 'error');
    } finally {
      importando = false;
    }
  }

  function descargarPlantilla(formato: 'csv' | 'xlsx') {
    window.location.href = `/api/plantillas/stock_inicial?formato=${formato}`;
  }

  const filasPaginadas = $derived(
    filasParseadas.slice(paginaPreview * FILAS_POR_PAGINA, (paginaPreview + 1) * FILAS_POR_PAGINA)
  );

  const totalPaginas = $derived(
    Math.ceil(filasParseadas.length / FILAS_POR_PAGINA)
  );
</script>

<svelte:head>
  <title>{$_('productos.importarStock')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('productos.volver')}</span>
    </a>
    <h1>📦 {$_('productos.importarStock')}</h1>
    <p class="text-secondary">{$_('productos.importarStockSubtitulo')}</p>
  </header>

  <nav class="import-tabs" aria-label="Tipos de importación">
    <a href="/productos/importar" class="import-tab">
      {$_('productos.importarMasivo')}
    </a>
    <a href="/productos/importar-stock" class="import-tab import-tab-active">
      {$_('productos.importarStock')}
    </a>
  </nav>

  <section class="card">
    <h2>1. {$_('productos.seleccionarArchivo')}</h2>
    <div class="upload-area">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        bind:this={inputArchivo}
        onchange={handleArchivoSeleccionado}
        id="archivo-stock"
        class="hidden"
      />
      <label for="archivo-stock" class="upload-label">
        <span class="upload-icon">📁</span>
        <span class="upload-text">
          {archivoSeleccionado ? archivoSeleccionado.name : $_('productos.seleccionarArchivoTexto')}
        </span>
      </label>
      <button onclick={() => descargarPlantilla('csv')} class="btn btn-sm btn-secondary">
        📄 {$_('productos.descargarPlantilla')} (CSV)
      </button>
      <button onclick={() => descargarPlantilla('xlsx')} class="btn btn-sm btn-secondary">
        📊 {$_('productos.descargarPlantilla')} (Excel)
      </button>
    </div>

    {#if erroresParseo.length > 0}
      <div class="alert alert-danger">
        <strong>{$_('productos.erroresParseo')}:</strong>
        <ul>
          {#each erroresParseo as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  {#if filasParseadas.length > 0}
    <section class="card">
      <h2>2. {$_('productos.previsualizacion')} ({filasParseadas.length} {$_('productos.filas')})</h2>

      <div class="tabla-preview-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{$_('productos.producto')}</th>
              <th>{$_('productos.cantidad')}</th>
              <th>{$_('productos.numeroLote')}</th>
              <th>{$_('productos.fechaCaducidad')}</th>
              <th>{$_('productos.ubicacion')}</th>
              <th>{$_('productos.estado')}</th>
            </tr>
          </thead>
          <tbody>
            {#each filasPaginadas as fila, i}
              {@const filaReal = paginaPreview * FILAS_POR_PAGINA + i}
              {@const erroresFila = validarFila(fila)}
              <tr class:fila-error={erroresFila.length > 0}>
                <td>{filaReal + 1}</td>
                <td>
                  <input
                    type="text"
                    value={fila.producto}
                    onchange={(e) => editarCelda(filaReal, 'producto', e.currentTarget.value)}
                    class="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={fila.cantidad}
                    onchange={(e) => editarCelda(filaReal, 'cantidad', e.currentTarget.value)}
                    class="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={fila.numero_lote || ''}
                    onchange={(e) => editarCelda(filaReal, 'numero_lote', e.currentTarget.value)}
                    class="input-sm"
                    placeholder={$_('productos.autoGenerado')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={fila.fecha_caducidad || ''}
                    onchange={(e) => editarCelda(filaReal, 'fecha_caducidad', e.currentTarget.value)}
                    class="input-sm"
                    placeholder="AAAA-MM-DD"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={fila.ubicacion || ''}
                    onchange={(e) => editarCelda(filaReal, 'ubicacion', e.currentTarget.value)}
                    class="input-sm"
                    placeholder={$_('productos.porDefecto')}
                  />
                </td>
                <td>
                  {#if erroresFila.length > 0}
                    <span class="badge badge-danger" title={erroresFila.join(', ')}>
                      ❌ {erroresFila.length} error{erroresFila.length > 1 ? 'es' : ''}
                    </span>
                  {:else}
                    <span class="badge badge-success">✅ OK</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if totalPaginas > 1}
        <div class="paginacion-preview">
          <button
            onclick={() => paginaPreview = Math.max(0, paginaPreview - 1)}
            disabled={paginaPreview === 0}
            class="btn btn-sm btn-secondary"
          >
            ← {$_('productos.anterior')}
          </button>
          <span class="text-secondary">
            {$_('productos.pagina')} {paginaPreview + 1} {$_('productos.de')} {totalPaginas}
          </span>
          <button
            onclick={() => paginaPreview = Math.min(totalPaginas - 1, paginaPreview + 1)}
            disabled={paginaPreview >= totalPaginas - 1}
            class="btn btn-sm btn-secondary"
          >
            {$_('productos.siguiente')} →
          </button>
        </div>
      {/if}

      <div class="acciones-importar">
        <button
          onclick={confirmarImportacion}
          disabled={importando || erroresParseo.length > 0}
          class="btn btn-primary"
        >
          {importando ? '⏳ Importando...' : `✅ ${$_('productos.confirmarImportacion')}`}
        </button>
      </div>
    </section>
  {/if}

  {#if resultado}
    {@const res = resultado}
    <section class="card">
      <h2>3. {$_('productos.resultadoImportacion')}</h2>

      <div class="resultado-grid">
        <div class="resultado-item resultado-exitosas">
          <span class="resultado-numero">{res.exitosas}</span>
          <span class="resultado-label">{$_('productos.lotesCreados')}</span>
        </div>
        <div class="resultado-item resultado-actualizadas">
          <span class="resultado-numero">{res.actualizadas}</span>
          <span class="resultado-label">{$_('productos.lotesRepuestos')}</span>
        </div>
        <div class="resultado-item resultado-errores">
          <span class="resultado-numero">{res.errores.length}</span>
          <span class="resultado-label">{$_('productos.errores')}</span>
        </div>
      </div>

      {#if res.errores.length > 0}
        <div class="errores-detalle">
          <h3>{$_('productos.detallesErrores')}:</h3>
          <ul>
            {#each res.errores as error}
              <li>
                <strong>{$_('productos.fila')} {error.fila}</strong>
                {#if error.nombre}
                  ({error.nombre})
                {/if}:
                {error.motivo}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </section>
  {/if}
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
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

  .tabla-preview-container {
    overflow-x: auto;
    margin: 1rem 0;
  }

  .input-sm {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .fila-error {
    background: var(--status-danger-bg);
  }

  .fila-error .input-sm {
    border-color: var(--accent-danger);
  }

  .paginacion-preview {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin: 1rem 0;
  }

  .acciones-importar {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .resultado-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .resultado-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
  }

  .resultado-exitosas {
    background: var(--status-success-bg);
    border: 1px solid var(--status-success-border);
  }

  .resultado-actualizadas {
    background: var(--status-info-bg);
    border: 1px solid var(--status-info-border);
  }

  .resultado-errores {
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-border);
  }

  .resultado-numero {
    font-size: 2.5rem;
    font-weight: var(--font-weight-bold);
    margin-bottom: 0.5rem;
  }

  .resultado-exitosas .resultado-numero {
    color: var(--status-success-text);
  }

  .resultado-actualizadas .resultado-numero {
    color: var(--status-info-text);
  }

  .resultado-errores .resultado-numero {
    color: var(--status-danger-text);
  }

  .resultado-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .errores-detalle {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-border);
    border-radius: 8px;
  }

  .errores-detalle h3 {
    margin: 0 0 0.75rem;
    color: var(--status-danger-text);
  }

  .errores-detalle ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .errores-detalle li {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  @media (max-width: 768px) {
    .upload-area {
      flex-direction: column;
      align-items: stretch;
    }
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
</style>