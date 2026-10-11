<script lang="ts">
  import { onDestroy } from 'svelte';

  interface Props {
    url: string;
    nombreArchivo: string;
    icono?: string;
    texto?: string;
    variante?: 'primario' | 'secundario' | 'pequeno';
  }

  let { 
    url, 
    nombreArchivo, 
    icono = '📄', 
    texto = 'Exportar PDF',
    variante = 'primario'
  }: Props = $props();

  let cargando = $state(false);
  let error = $state<string | null>(null);
  let tooltipVisible = $state(false);
  let timeoutError: ReturnType<typeof setTimeout> | undefined;

  async function generarPDF() {
    cargando = true;
    error = null;
    clearTimeout(timeoutError);

    try {
      const respuesta = await fetch(url);
      
      if (!respuesta.ok) {
        throw new Error(`Error al generar el reporte: ${respuesta.status}`);
      }

      const blob = await respuesta.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      
      const enlace = document.createElement('a');
      enlace.href = urlBlob;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      
      window.setTimeout(() => window.URL.revokeObjectURL(urlBlob), 1000);
    } catch (err) {
      console.error('No se pudo descargar el reporte PDF:', err);
      error = 'No se pudo generar el PDF. Intenta de nuevo.';
      timeoutError = setTimeout(() => { error = null; }, 3000);
    } finally {
      cargando = false;
    }
  }

  onDestroy(() => clearTimeout(timeoutError));
</script>

<div class="boton-pdf-container variante-{variante}">
  <button 
    onclick={generarPDF} 
    disabled={cargando}
    class="btn boton-pdf"
    class:btn-gradient={variante === 'primario'}
    class:btn-secondary={variante === 'secundario'}
    onmouseenter={() => tooltipVisible = true}
    onmouseleave={() => tooltipVisible = false}
    onfocus={() => tooltipVisible = true}
    onblur={() => tooltipVisible = false}
    aria-live="polite"
  >
    {#if cargando}
      <span class="spinner"></span>
      <span>Generando...</span>
    {:else}
      <span class="icono">{icono}</span>
      <span>{texto}</span>
    {/if}
  </button>

  {#if tooltipVisible && !cargando}
    <div class="tooltip" role="tooltip">
      Haz clic para descargar el reporte en formato PDF
    </div>
  {/if}

  {#if error}
    <div class="mensaje-error" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  .boton-pdf-container {
    position: relative;
    display: inline-block;
  }

  .boton-pdf {
    font-size: var(--font-size-sm);
  }

  /* Variante compacta */
  .variante-pequeno .boton-pdf {
    padding: 0.5rem 0.85rem;
    font-size: var(--font-size-xs);
  }

  .icono {
    font-size: var(--font-size-lg);
  }

  /* Spinner de carga */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid color-mix(in srgb, var(--text-on-accent) 30%, transparent);
    border-top-color: var(--text-on-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Tooltip */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--text-primary);
    color: var(--bg-primary);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: var(--font-size-xs);
    white-space: nowrap;
    box-shadow: var(--shadow-tooltip);
    z-index: 100;
    pointer-events: none;
    animation: fadeIn 0.2s ease;
  }

  .tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--text-primary);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* Mensaje de error */
  .mensaje-error {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--accent-danger);
    color: var(--text-on-accent);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: var(--font-size-xs);
    text-align: center;
    box-shadow: var(--shadow-danger);
    animation: slideDown 0.3s ease;
    z-index: 100;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>