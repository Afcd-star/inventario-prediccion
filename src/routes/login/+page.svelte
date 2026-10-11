  <script lang="ts">
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { locale } from 'svelte-i18n';
    import { cambiarIdioma } from '$lib/i18n';

    let { form }: { form?: { error?: string } } = $props();
    let temaActual = $state<'light' | 'dark'>('light');
    let idiomasAbiertos = $state(false);
    const idiomaActual = $derived($locale === 'en' ? 'en' : 'es');

    const idiomasDisponibles = [
      { codigo: 'es', nombre: 'Español', bandera: '🇪🇸' },
      { codigo: 'en', nombre: 'English', bandera: '🇺🇸' }
    ] as const;

    onMount(() => {
      const guardado = localStorage.getItem('tema');
      const preferidoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
      temaActual = guardado === 'light' || guardado === 'dark'
        ? guardado
        : preferidoSistema ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', temaActual);
    });

    function alternarTema() {
      temaActual = temaActual === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', temaActual);
      localStorage.setItem('tema', temaActual);
    }

    function seleccionarIdioma(idioma: 'es' | 'en') {
      cambiarIdioma(idioma);
      idiomasAbiertos = false;
    }
  </script>

  <svelte:head>
    <title>{$_('login.titulo')} | StockPredict Pro</title>
  </svelte:head>

  <main class="login-container">
    <div class="login-controls">
      <button type="button" class="control-button theme-control" onclick={alternarTema}>
        <span aria-hidden="true">{temaActual === 'light' ? '🌙' : '☀️'}</span>
        <span>{temaActual === 'light' ? $_('nav.modoOscuro') : $_('nav.modoClaro')}</span>
      </button>

      <div class="language-control" class:open={idiomasAbiertos}>
        <button
          type="button"
          class="control-button language-button"
          aria-label={$_('nav.seleccionarIdioma')}
          aria-expanded={idiomasAbiertos}
          aria-controls="login-language-options"
          onclick={() => idiomasAbiertos = !idiomasAbiertos}
        >
          <span aria-hidden="true">🌐</span>
          <span>{idiomasDisponibles.find((idioma) => idioma.codigo === idiomaActual)?.nombre}</span>
          <span class="chevron" class:expanded={idiomasAbiertos} aria-hidden="true">›</span>
        </button>

        {#if idiomasAbiertos}
          <div id="login-language-options" class="language-options">
            {#each idiomasDisponibles as idioma}
              <button
                type="button"
                class="language-option"
                class:active-language={idioma.codigo === idiomaActual}
                aria-pressed={idioma.codigo === idiomaActual}
                onclick={() => seleccionarIdioma(idioma.codigo)}
              >
                <span aria-hidden="true">{idioma.bandera}</span>
                <span>{idioma.nombre}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Header separado arriba -->
    <div class="app-header">
      <span class="logo">📦</span>
      <h1 class="app-title">{$_('app.nombre')}</h1>
      <p class="app-subtitle">{$_('app.subtitulo')}</p>
    </div>

    <!-- Formulario centrado -->
    <div class="card login-card">
      <div class="card-header">
        <h2 class="card-title">{$_('login.titulo')}</h2>
        <p class="card-subtitle">{$_('login.subtitulo')}</p>
      </div>

      {#if form?.error}
        <div class="alert alert-danger login-error">
          {$_(form.error)}
        </div>
      {/if}

      <form method="POST" use:enhance class="login-form">
        <div class="input-group">
          <label for="email" class="label">{$_('login.email')}</label>
          <input 
            id="email"
            type="email" 
            name="email" 
            required 
            autocomplete="email"
            class="input-field"
            placeholder="admin@inventario.com"
          />
        </div>

        <div class="input-group">
          <label for="password" class="label">{$_('login.password')}</label>
          <input 
            id="password"
            type="password" 
            name="password" 
            required 
            autocomplete="current-password"
            class="input-field"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" class="btn btn-gradient login-submit">
          {$_('login.ingresar')}
        </button>
      </form>

      <div class="credentials-hint">
        <p class="hint-label">{$_('login.credencialesPrueba')}</p>
        <code class="hint-code">admin@inventario.com / admin123</code>
      </div>
    </div>
  </main>

  <style>
    .login-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
      padding: 2rem 1rem;
      gap: 2rem;
    }

    .login-controls {
      position: absolute;
      top: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      z-index: 2;
    }

    .control-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      min-height: 2.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    .control-button:hover,
    .language-option:hover,
    .language-option.active-language {
      background: var(--status-info-bg);
      border-color: var(--accent-primary);
      color: var(--status-info-text);
    }

    .language-control {
      position: relative;
    }

    .language-options {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      min-width: 10rem;
      padding: 0.25rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background: var(--bg-card);
      box-shadow: var(--shadow-popover);
    }

    .language-option {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: var(--text-primary);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .chevron {
      font-size: var(--font-size-lg);
      line-height: 1;
      transition: transform 0.2s;
    }

    .chevron.expanded {
      transform: rotate(90deg);
    }

    .app-header {
      text-align: center;
      margin-bottom: 1rem;
    }

    .logo {
      font-size: var(--font-size-logo);
      display: block;
      margin-bottom: 0.5rem;
      filter: var(--shadow-logo);
    }

    .app-title {
      margin: 0;
      font-size: var(--font-size-4xl);
      font-weight: var(--font-weight-extrabold);
      color: var(--text-primary);
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .app-subtitle {
      margin: 0.5rem 0 0 0;
      color: var(--text-secondary);
      font-size: var(--font-size-base);
      font-weight: var(--font-weight-medium);
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 2.5rem;
      border-radius: 16px;
      box-shadow: var(--shadow-card);
    }

    .card-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .card-title {
      margin: 0;
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
    }

    .card-subtitle {
      margin: 0.5rem 0 0 0;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }

    .login-error {
      text-align: center;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .login-submit {
      width: 100%;
      padding: 1rem;
    }

    .credentials-hint {
      margin-top: 2rem;
      text-align: center;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color);
    }

    .hint-label {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }

    .hint-code {
      margin: 0.5rem 0 0 0;
      font-family: 'Courier New', monospace;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      display: inline-block;
    }

    @media (max-width: 480px) {
      .login-controls {
        top: 0.75rem;
        right: 0.75rem;
      }

      .theme-control span:last-child {
        display: none;
      }

      .control-button {
        min-width: 2.5rem;
        padding: 0.5rem;
      }
    }
  </style>