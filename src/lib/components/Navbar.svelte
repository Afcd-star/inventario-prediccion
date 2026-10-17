<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { _, locale } from 'svelte-i18n';
  import { cambiarIdioma } from '$lib/i18n';
  import { VERSION } from '$lib/version';

  let { data }: { data: { usuario?: { nombre: string; email: string; rol: string }; anomaliasPendientes?: number } } = $props();
  
  let temaActual = $state<'light' | 'dark'>('light');
  let menuAbierto = $state(false);
  let idiomasAbiertos = $state(false);

  onMount(() => {
    const guardado = localStorage.getItem('tema');
    const preferidoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
    temaActual = guardado === 'light' || guardado === 'dark'
      ? guardado
      : preferidoSistema ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', temaActual);
  });

  async function alternarTema() {
    temaActual = temaActual === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', temaActual);
    localStorage.setItem('tema', temaActual);
    
    // Sincronizar con BD si hay sesión
    if (data.usuario) {
      try {
        await fetch('/api/preferencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idioma: idiomaActual, tema: temaActual })
        });
      } catch (error) {
        // Silencioso: el localStorage ya aplicó el cambio
        console.error('Error sincronizando preferencias:', error);
      }
    }
  }

  function toggleMenu() {
    menuAbierto = !menuAbierto;
    idiomasAbiertos = false;
  }

  function cerrarMenu() {
    menuAbierto = false;
    idiomasAbiertos = false;
  }

  function toggleIdiomas() {
    idiomasAbiertos = !idiomasAbiertos;
  }

  async function seleccionarIdioma(idioma: 'es' | 'en') {
    cambiarIdioma(idioma);
    idiomasAbiertos = false;
    
    // Sincronizar con BD si hay sesión
    if (data.usuario) {
      try {
        await fetch('/api/preferencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idioma, tema: temaActual })
        });
      } catch (error) {
        // Silencioso: el idioma ya cambió en el cliente
        console.error('Error sincronizando preferencias:', error);
      }
    }
  }

  onMount(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu')) {
        cerrarMenu();
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  const enlaces = [
    { href: '/dashboard', texto: 'nav.dashboard', icono: '📊' },
    { href: '/productos', texto: 'nav.productos', icono: '📦' },
    { href: '/escanear', texto: 'nav.escanear', icono: '📱' },
    { href: '/simulacion', texto: 'nav.simulacion', icono: '🧪' }
  ];

  const idiomasDisponibles = [
    { codigo: 'es', nombre: 'Español', bandera: '🇪🇸' },
    { codigo: 'en', nombre: 'English', bandera: '🇺🇸' }
  ] as const;

  const idiomaActual = $derived($locale === 'en' ? 'en' : 'es');
  const nombreIdiomaActual = $derived(
    idiomasDisponibles.find((idioma) => idioma.codigo === idiomaActual)?.nombre ?? 'Español'
  );

  const iniciales = $derived(data.usuario?.nombre ? 
    data.usuario.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
    'US'
  );
</script>

<nav class="navbar">
  <div class="brand">
    <span class="logo-icon">📦</span>
    <div class="brand-text">
      <div class="brand-title">{$_('app.nombre')}</div>
      <div class="brand-subtitle">{$_('app.subtitulo')}</div>
    </div>
  </div>

  <div class="nav-links">
    {#each enlaces as enlace}
      <a 
        href={enlace.href} 
        class="nav-link"
        class:active={$page.url.pathname.startsWith(enlace.href)}
      >
        <span class="link-icon">{enlace.icono}</span>
        <span>{$_(enlace.texto)}</span>
      </a>
    {/each}
  </div>

  <div class="right-section">
    {#if data.usuario}
      <a href="/anomalias" class="alerta-badge" title={$_('anomalias.titulo')}>
        <span>🚨</span>
        {#if (data.anomaliasPendientes ?? 0) > 0}
          <span class="alerta-contador">{data.anomaliasPendientes}</span>
        {/if}
      </a>
    {/if}
    <!-- Botón de tema con el estilo original de gradiente y texto -->
    <button onclick={alternarTema} class="btn btn-gradient theme-btn">
      <span>{temaActual === 'light' ? '🌙' : '☀️'}</span>
      <span>{temaActual === 'light' ? $_('nav.modoOscuro') : $_('nav.modoClaro')}</span>
    </button>

    {#if data.usuario}
      <!-- Menú desplegable de perfil -->
      <div class="profile-menu" class:open={menuAbierto}>
        <button onclick={toggleMenu} class="profile-button" aria-label="Menú de usuario" aria-expanded={menuAbierto}>
          <div class="avatar">
            {iniciales}
          </div>
        </button>

        <div class="dropdown-menu">
          <div class="user-header">
            <div class="avatar large">{iniciales}</div>
            <div class="user-details">
              <div class="user-name">{data.usuario.nombre}</div>
              <div class="user-email">{data.usuario.email || 'usuario'}</div>
            </div>
          </div>

          <div class="menu-divider"></div>

          <a href="/perfil" class="menu-item" onclick={cerrarMenu}>
            <span class="menu-icon">👤</span>
            <span>{$_('nav.perfil')}</span>
          </a>

          {#if data.usuario.rol === 'admin'}
            <a href="/admin" class="menu-item" onclick={cerrarMenu}>
              <span class="menu-icon">⚙️</span>
              <span>{$_('nav.admin')}</span>
            </a>
          {/if}

          <div class="menu-divider"></div>

          <button
            type="button"
            class="menu-item language-toggle"
            aria-label={$_('nav.seleccionarIdioma')}
            aria-expanded={idiomasAbiertos}
            aria-controls="language-options"
            onclick={toggleIdiomas}
          >
            <span class="menu-icon">🌐</span>
            <span class="language-label">{$_('nav.idioma')}: {nombreIdiomaActual}</span>
            <span class="menu-chevron" class:expanded={idiomasAbiertos} aria-hidden="true">›</span>
          </button>

          {#if idiomasAbiertos}
            <div id="language-options" class="language-options">
              {#each idiomasDisponibles as idioma}
                <button
                  type="button"
                  class="menu-item language-option"
                  class:active-language={idioma.codigo === idiomaActual}
                  aria-pressed={idioma.codigo === idiomaActual}
                  onclick={() => seleccionarIdioma(idioma.codigo)}
                >
                  <span class="menu-icon">{idioma.bandera}</span>
                  <span>{idioma.nombre}</span>
                </button>
              {/each}
            </div>
          {/if}

          <div class="menu-divider"></div>

          <form action="/logout" method="POST" onsubmit={cerrarMenu}>
            <button type="submit" class="menu-item logout">
              <span class="menu-icon">🚪</span>
              <span>{$_('nav.cerrarSesion')}</span>
            </button>
          </form>
          <div class="menu-divider"></div>
          <div class="menu-version">StockPredict Pro v{VERSION}</div>
        </div>
      </div>
    {/if}
  </div>
</nav>

<style>
  .navbar {
    background: var(--bg-card);
    border-bottom: 2px solid var(--border-color);
    padding: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: var(--shadow-subtle);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    border-right: 1px solid var(--border-color);
  }

  .logo-icon { font-size: var(--font-size-4xl); }
  .brand-title { font-size: var(--font-size-xl); font-weight: var(--font-weight-extrabold); color: var(--accent-primary); line-height: 1; }
  .brand-subtitle { font-size: var(--font-size-2xs); color: var(--text-secondary); margin-top: 0.1rem; }

  .nav-links { display: flex; gap: 0.5rem; padding: 0 2rem; }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    text-decoration: none;
    color: var(--text-secondary);
    font-weight: var(--font-weight-medium);
    border-radius: 8px;
    transition: all 0.2s ease;
    background: transparent;
  }

  .nav-link:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
  .nav-link.active { color: var(--accent-primary); font-weight: var(--font-weight-bold); background: var(--bg-secondary); }

  .right-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 2rem;
  }

  /* Estilo original del botón de tema */
  .theme-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: var(--font-size-sm);
  }

  /* Menú de perfil desplegable */
  .profile-menu {
    position: relative;
  }

  .profile-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-purple));
    color: var(--text-on-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    transition: transform 0.2s;
  }

  .profile-button:hover .avatar {
    transform: scale(1.05);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: var(--shadow-popover);
    min-width: 280px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    z-index: 1001;
  }

  .profile-menu.open .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .user-header {
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar.large {
    width: 48px;
    height: 48px;
    font-size: var(--font-size-lg);
  }

  .user-details {
    flex: 1;
  }

  .user-name {
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    margin-bottom: 0.25rem;
  }

  .user-email {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .menu-divider {
    height: 1px;
    background: var(--border-color);
    margin: 0.5rem 0;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    text-decoration: none;
    color: var(--text-primary);
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    font-size: var(--font-size-sm);
    transition: background-color 0.2s, color 0.2s;
    text-align: left;
  }

  .menu-item:hover:not(.logout),
  .menu-item.active-language {
    background: var(--status-info-bg);
    color: var(--status-info-text);
  }

  .menu-item.logout {
    color: var(--accent-danger);
  }

  .menu-item.logout:hover {
    background: var(--status-danger-bg);
    color: var(--status-danger-text);
  }

  .menu-icon {
    font-size: var(--font-size-lg);
    width: 20px;
    flex: 0 0 20px;
  }

  .language-toggle {
    font-family: inherit;
  }

  .language-label {
    flex: 1;
  }

  .menu-chevron {
    font-size: var(--font-size-xl);
    line-height: 1;
    transition: transform 0.2s ease;
  }

  .menu-chevron.expanded {
    transform: rotate(90deg);
  }

  .language-options {
    max-height: 220px;
    overflow-y: auto;
    padding: 0.25rem 0;
  }

  .language-option {
    padding-left: 2.5rem;
  }

  .menu-version {
    padding: 0.6rem 1.25rem;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    text-align: center;
  }

    .alerta-badge {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    font-size: 1.2rem;
    transition: all 0.2s ease;
  }

  .alerta-badge:hover {
    transform: scale(1.1);
    background: var(--bg-primary);
  }

  .alerta-contador {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--accent-danger);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>