<script lang="ts">
  import { onDestroy } from 'svelte';
  import { _ } from 'svelte-i18n';
  import type { LineaOCPayload } from '$lib/types';

  interface Props {
    lineas: LineaOCPayload[];
    mensajeConfirm: string;     // M6: resumen "Vas a generar N OCs: ..."
    nombreArchivo: string;
    icono?: string;
    texto?: string;
    variante?: 'primario' | 'secundario' | 'pequeno';
  }

  let {
    lineas,
    mensajeConfirm,
    nombreArchivo,
    icono = '📄',
    texto,
    variante = 'primario'
  }: Props = $props();

  let cargando = $state(false);
  let error = $state(false);
  let tooltipVisible = $state(false);
  let timeoutError: ReturnType<typeof setTimeout> | undefined;

  async function generarOC() {
    if (!confirm(mensajeConfirm)) return;   // M6

    cargando = true;
    error = false;
    clearTimeout(timeoutError);

    try {
      const respuesta = await fetch('/api/exportar/orden-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineas })
      });

      if (!respuesta.ok) {
        // El endpoint devuelve el motivo real en el body (error(400/403)). Lo leo para
        // mostrarlo en el confirm/alert en vez de un "Error: 400" genérico.
        const motivo = await respuesta.text().catch(() => '');
        throw new Error(motivo || `Error ${respuesta.status}`);
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
      console.error('No se pudo generar la OC:', err);
      error = true;
      // Muestro el motivo real del server (D6 rechazos) en el tooltip de error.
      mensajeErrorTexto = err instanceof Error ? err.message : $_('oc.error');
      timeoutError = setTimeout(() => { error = false; }, 5000);
    } finally {
      cargando = false;
    }
  }

  let mensajeErrorTexto = $state('');
  onDestroy(() => clearTimeout(timeoutError));
</script>

<div class="boton-oc-container variante-{variante}">
  <button
    onclick={generarOC}
    disabled={cargando || lineas.length === 0}
    class="btn boton-oc"
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
      <span>{$_('oc.generando')}</span>
    {:else}
      <span class="icono">{icono}</span>
      <span>{texto ?? $_('oc.generar')}</span>
    {/if}
  </button>

  {#if tooltipVisible && !cargando}
    <div class="tooltip" role="tooltip">{$_('oc.tooltip')}</div>
  {/if}

  {#if error}
    <div class="mensaje-error" role="alert">{mensajeErrorTexto}</div>
  {/if}
</div>

<style>
  .boton-oc-container { position: relative; display: inline-block; }
  .boton-oc { font-size: var(--font-size-sm); }
  .variante-pequeno .boton-oc { padding: 0.5rem 0.85rem; font-size: var(--font-size-xs); }
  .icono { font-size: var(--font-size-lg); }
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid color-mix(in srgb, var(--text-on-accent) 30%, transparent);
    border-top-color: var(--text-on-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tooltip {
    position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
    background: var(--text-primary); color: var(--bg-primary);
    padding: 0.5rem 0.75rem; border-radius: 6px; font-size: var(--font-size-xs);
    white-space: nowrap; box-shadow: var(--shadow-tooltip); z-index: 100; pointer-events: none;
    animation: fadeIn 0.2s ease;
  }
  .tooltip::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: var(--text-primary);
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .mensaje-error {
    position: absolute; top: calc(100% + 8px); left: 0; right: 0;
    background: var(--accent-danger); color: var(--text-on-accent);
    padding: 0.5rem 0.75rem; border-radius: 6px; font-size: var(--font-size-xs);
    text-align: center; box-shadow: var(--shadow-danger); animation: slideDown 0.3s ease; z-index: 100;
  }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
</style>