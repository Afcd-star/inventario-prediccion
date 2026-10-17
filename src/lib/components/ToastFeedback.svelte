<script lang="ts">
  interface Props {
    feedback: object | null | undefined;
    message: string | null;
    isError?: boolean;
  }

  let { feedback, message, isError = false }: Props = $props();
  let visible = $state(false);

  $effect(() => {
    if (!feedback || !message) {
      visible = false;
      return;
    }

    visible = true;
    const timeout = window.setTimeout(() => {
      visible = false;
    }, 4500);

    return () => window.clearTimeout(timeout);
  });
</script>

{#if visible && message}
  <div class="toast" class:toast-error={isError} role={isError ? 'alert' : 'status'} aria-atomic="true">
    {message}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    z-index: 2000;
    top: max(1rem, env(safe-area-inset-top));
    left: 50%;
    width: max-content;
    max-width: min(92vw, 480px);
    transform: translateX(-50%);
    padding: 0.85rem 1.25rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--status-success-bg);
    color: var(--status-success-text);
    box-shadow: var(--shadow-popover);
    font-weight: var(--font-weight-medium);
    animation: toast-in 0.25s ease;
  }

  .toast-error {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translate(-50%, -8px);
    }

    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
</style>
