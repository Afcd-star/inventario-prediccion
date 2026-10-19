<script lang="ts">
  import { toasts } from '$lib/stores/toasts';
  import type { Toast } from '$lib/stores/toasts';

  let toastsActivos = $state<Toast[]>([]);

  toasts.subscribe(lista => {
    toastsActivos = lista;
  });

  const iconos: Record<string, string> = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️'
  };
</script>

{#if toastsActivos.length > 0}
  <div class="toasts-container" role="status" aria-live="polite" aria-atomic="false">
    {#each toastsActivos as toast (toast.id)}
      <div class="toast toast-{toast.tipo}" role="alert">
        <span class="toast-icon" aria-hidden="true">{iconos[toast.tipo]}</span>
        <span class="toast-mensaje">{toast.mensaje}</span>
        <button
          class="toast-close"
          type="button"
          aria-label="Cerrar notificación"
          onclick={() => toasts.eliminar(toast.id)}
        >
          ×
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toasts-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: min(420px, calc(100vw - 2rem));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06);
    color: var(--text-primary);
    pointer-events: auto;
    animation: toastEntrada 0.3s ease-out;
    backdrop-filter: blur(8px);
  }

  .toast-success {
    border-left: 4px solid var(--accent-success);
    background: var(--status-success-bg);
    color: var(--status-success-text);
  }

  .toast-info {
    border-left: 4px solid var(--accent-info, #3b82f6);
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .toast-warning {
    border-left: 4px solid var(--accent-warning);
    background: var(--status-warning-bg);
    color: var(--status-warning-text);
  }

  .toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    line-height: 1;
  }

  .toast-mensaje {
    flex: 1;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1.4;
  }

  .toast-close {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 4px;
    transition: opacity 0.15s, background 0.15s;
  }

  .toast-close:hover,
  .toast-close:focus-visible {
    opacity: 1;
    background: rgba(0, 0, 0, 0.08);
  }

  @keyframes toastEntrada {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 520px) {
    .toasts-container {
      left: 1rem;
      right: 1rem;
      bottom: 1rem;
      max-width: none;
    }
  }
</style>