<script lang="ts">
  import { enhance } from '$app/forms';
  import { _ } from 'svelte-i18n';
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form?: { error?: string } } = $props();
  let codigo = $state('');
</script>

<svelte:head>
  <title>{$_('2fa.titulo')} | StockPredict Pro</title>
</svelte:head>

<main class="page-container page-container--narrow">
  <div class="twofa-card card">
    <div class="twofa-header">
      <span class="twofa-icon">🔐</span>
      <h1>{$_('2fa.titulo')}</h1>
    </div>

    <p class="text-secondary">
      {$_('2fa.subtitulo', { values: { nombre: data.usuario.nombre } })}
    </p>

    {#if form?.error}
      <div class="alert alert-danger">⚠️ {$_(form.error)}</div>
    {/if}

    <form method="POST" action="?/verificar_codigo" use:enhance class="twofa-form">
      <div class="input-group">
        <label for="codigo" class="label">{$_('2fa.codigo')}</label>
        <input
          id="codigo"
          type="text"
          name="codigo"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          bind:value={codigo}
          required
          class="input-field twofa-input"
          placeholder="000000"
          autocomplete="one-time-code"
        />
        <p class="field-help">{$_('2fa.ayudaCodigo')}</p>
      </div>

      <div class="twofa-actions">
        <button type="submit" class="btn btn-primary btn-block">
          {$_('2fa.verificar')}
        </button>
      </div>
    </form>

    <form method="POST" action="?/cancelar" class="twofa-cancel">
      <button type="submit" class="btn btn-link">
        {$_('2fa.cancelar')}
      </button>
    </form>
  </div>
</main>

<style>
  .page-container--narrow {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .twofa-card {
    width: 100%;
    max-width: 420px;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: var(--shadow-card);
  }

  .twofa-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .twofa-icon {
    font-size: 2rem;
  }

  .twofa-header h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
  }

  .twofa-form {
    margin-top: 1.5rem;
  }

  .twofa-input {
    font-size: var(--font-size-2xl);
    text-align: center;
    letter-spacing: 0.5rem;
    font-family: 'Courier New', monospace;
    font-weight: var(--font-weight-bold);
  }

  .field-help {
    margin: 0.35rem 0 0;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }

  .twofa-actions {
    margin-top: 1.5rem;
  }

  .btn-block {
    width: 100%;
  }

  .twofa-cancel {
    margin-top: 1rem;
    text-align: center;
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
  }

  .btn-link:hover {
    color: var(--accent-primary);
  }
</style>