<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import Papa from 'papaparse';
  import type { PageData } from './$types';
  import { mostrarToast } from '$lib/stores/toasts';
  import type { ModoImportacion, FilaProducto, ResultadoImportacion } from '$lib/server/services/importacion.service';

  let { data }: { data: PageData } = $props();

  // Estados de la UI
  let archivoSeleccionado = $state<File | null>(null);
  let filasParseadas = $state<FilaProducto[]>([]);
  let erroresParseo = $state<string[]>([]);
  let modoImportacion = $state<ModoImportacion>('crear');
  let importando = $state(false);
  let resultado = $state<ResultadoImportacion | null>(null);
  let paginaPreview = $state(0);
  const FILAS_POR_PAGINA = 50;

  // Referencia al input file
  let inputArchivo: HTMLInputElement;

    async function handleArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      archivoSeleccionado = archivo;
      parsearCSV(archivo);
    } else if (extension === 'xlsx' || extension === 'xls') {
      archivoSeleccionado = archivo;
      await parsearExcel(archivo);
    } else {
      mostrarToast('Solo se permiten archivos CSV o Excel (.xlsx, .xls)', 'error');
      input.value = '';
    }
  }

  async function parsearExcel(archivo: File) {
    erroresParseo = [];
    filasParseadas = [];
    resultado = null;
    paginaPreview = 0;

    try {
      // Import dinámico: solo se carga la librería si el archivo es Excel
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
      const columnasRequeridas = ['nombre', 'precio', 'stock_minimo'];
      const columnasFaltantes = columnasRequeridas.filter(c => !headers.includes(c));

      if (columnasFaltantes.length > 0) {
        erroresParseo.push(`Columnas faltantes: ${columnasFaltantes.join(', ')}`);
        return;
      }

      filasParseadas = filas.map((fila) => ({
        nombre: String(fila.nombre ?? ''),
        descripcion: String(fila.descripcion ?? ''),
        precio: String(fila.precio ?? ''),
        stock_minimo: String(fila.stock_minimo ?? '')
      }));

      mostrarToast(`Archivo parseado: ${filasParseadas.length} filas encontradas`, 'success');
    } catch (error: any) {
      erroresParseo.push(`Error al leer el Excel: ${error.message}`);
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

        // Validar columnas requeridas
        const headers = results.meta.fields || [];
        const columnasRequeridas = ['nombre', 'precio', 'stock_minimo'];
        const columnasFaltantes = columnasRequeridas.filter(c => !headers.includes(c));

        if (columnasFaltantes.length > 0) {
          erroresParseo.push(`Columnas faltantes: ${columnasFaltantes.join(', ')}`);
          return;
        }

        // Mapear a nuestro tipo
        filasParseadas = results.data.map((fila: any) => ({
          nombre: fila.nombre || '',
          descripcion: fila.descripcion || '',
          precio: fila.precio || '',
          stock_minimo: fila.stock_minimo || ''
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

  function editarCelda(filaIndex: number, campo: keyof FilaProducto, valor: string) {
    filasParseadas[filaIndex] = {
      ...filasParseadas[filaIndex],
      [campo]: valor
    };
  }

  function validarFila(fila: FilaProducto): string[] {
    const errores: string[] = [];

    if (!fila.nombre || fila.nombre.trim().length === 0) {
      errores.push('Nombre vacío');
    }

    const precio = Number(fila.precio);
    if (isNaN(precio) || precio < 0) {
      errores.push('Precio inválido');
    }

    const stockMinimo = Number(fila.stock_minimo);
    if (isNaN(stockMinimo) || stockMinimo < 0 || !Number.isInteger(stockMinimo)) {
      errores.push('Stock mínimo inválido');
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
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error en la importación');
      }

      const responseData = await res.json();
      const importResult = responseData.data; // ✅ Variable local fuertemente tipada
      
      resultado = importResult; // ✅ Asignamos al estado reactivo para que la UI se actualice

      // ✅ Usamos la variable local para las condiciones, TypeScript sabe que no es null
      if (importResult.errores.length === 0 && importResult.exitosas + importResult.actualizadas > 0) {
        mostrarToast(`Importación exitosa: ${importResult.exitosas} creadas, ${importResult.actualizadas} actualizadas`, 'success');
        // Limpiar todo
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
    window.location.href = `/api/plantillas/productos?formato=${formato}`;
  }

  // Paginación del preview
  const filasPaginadas = $derived(
    filasParseadas.slice(paginaPreview * FILAS_POR_PAGINA, (paginaPreview + 1) * FILAS_POR_PAGINA)
  );

  const totalPaginas = $derived(
    Math.ceil(filasParseadas.length / FILAS_POR_PAGINA)
  );
</script>

<svelte:head>
  <title>{$_('admin.importar')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/productos" class="btn-back">
      <span>←</span>
      <span>{$_('productos.volver')}</span>
    </a>
    <h1>📥 {$_('admin.importar')}</h1>
    <p class="text-secondary">{$_('admin.importarSubtitulo')}</p>
  </header>

  <nav class="import-tabs" aria-label="Tipos de importación">
    <a href="/productos/importar" class="import-tab import-tab-active">
      {$_('productos.importarCSV')}
    </a>
    <a href="/productos/importar-stock" class="import-tab">
      {$_('productos.importarStock')}
    </a>
  </nav>

  <!-- Paso 1: Subir archivo -->
  <section class="card">
    <h2>1. Seleccionar archivo CSV</h2>
    <div class="upload-area">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        bind:this={inputArchivo}
        onchange={handleArchivoSeleccionado}
        id="archivo-csv"
        class="hidden"
      />
      <label for="archivo-csv" class="upload-label">
        <span class="upload-icon">📁</span>
        <span class="upload-text">
          {archivoSeleccionado ? archivoSeleccionado.name : 'Haz clic para seleccionar un archivo CSV'}
        </span>
      </label>
        <button onclick={() => descargarPlantilla('csv')} class="btn btn-sm btn-secondary">
        📄 {$_('admin.descargarPlantilla')} (CSV)
      </button>
        <button onclick={() => descargarPlantilla('xlsx')} class="btn btn-sm btn-secondary">
        📊 {$_('admin.descargarPlantilla')} (Excel)
      </button>
    </div>

    {#if erroresParseo.length > 0}
      <div class="alert alert-danger">
        <strong>Errores al parsear el archivo:</strong>
        <ul>
          {#each erroresParseo as error}
            <li>{error}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>

  <!-- Paso 2: Previsualización -->
  {#if filasParseadas.length > 0}
    <section class="card">
      <h2>2. Previsualización de datos ({filasParseadas.length} filas)</h2>

      <div class="modo-selector">
        <div class="label">Modo de importación:</div>
        <select bind:value={modoImportacion} class="input">
          <option value="crear">{$_('admin.modoCrear')}</option>
          <option value="actualizar">{$_('admin.modoActualizar')}</option>
        </select>
      </div>

      <div class="tabla-preview-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Stock Mínimo</th>
              <th>Estado</th>
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
                    value={fila.nombre}
                    onchange={(e) => editarCelda(filaReal, 'nombre', e.currentTarget.value)}
                    class="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={fila.descripcion}
                    onchange={(e) => editarCelda(filaReal, 'descripcion', e.currentTarget.value)}
                    class="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={fila.precio}
                    onchange={(e) => editarCelda(filaReal, 'precio', e.currentTarget.value)}
                    class="input-sm"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={fila.stock_minimo}
                    onchange={(e) => editarCelda(filaReal, 'stock_minimo', e.currentTarget.value)}
                    class="input-sm"
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
            ← Anterior
          </button>
          <span class="text-secondary">
            Página {paginaPreview + 1} de {totalPaginas}
          </span>
          <button
            onclick={() => paginaPreview = Math.min(totalPaginas - 1, paginaPreview + 1)}
            disabled={paginaPreview >= totalPaginas - 1}
            class="btn btn-sm btn-secondary"
          >
            Siguiente →
          </button>
        </div>
      {/if}

      <div class="acciones-importar">
        <button
          onclick={confirmarImportacion}
          disabled={importando || erroresParseo.length > 0}
          class="btn btn-primary"
        >
          {importando ? '⏳ Importando...' : '✅ Confirmar importación'}
        </button>
      </div>
    </section>
  {/if}

  <!-- Paso 3: Resultado -->
  {#if resultado}
    <section class="card">
      <h2>3. Resultado de la importación</h2>

      <div class="resultado-grid">
        <div class="resultado-item resultado-exitosas">
          <span class="resultado-numero">{resultado.exitosas}</span>
          <span class="resultado-label">Productos creados</span>
        </div>
        <div class="resultado-item resultado-actualizadas">
          <span class="resultado-numero">{resultado.actualizadas}</span>
          <span class="resultado-label">Productos actualizados</span>
        </div>
        <div class="resultado-item resultado-errores">
          <span class="resultado-numero">{resultado.errores.length}</span>
          <span class="resultado-label">Errores</span>
        </div>
      </div>

      {#if resultado.errores.length > 0}
        <div class="errores-detalle">
          <h3>Detalles de errores:</h3>
          <ul>
            {#each resultado.errores as error}
              <li>
                <strong>Fila {error.fila}</strong>
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

    .modo-selector {
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