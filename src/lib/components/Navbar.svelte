<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let temaActual = $state<'light' | 'dark'>('light');

  onMount(() => {
    const guardado = localStorage.getItem('tema');
    const preferidoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
    temaActual = (guardado as 'light' | 'dark') || (preferidoSistema ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', temaActual);
  });

  function alternarTema() {
    temaActual = temaActual === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', temaActual);
    localStorage.setItem('tema', temaActual);
  }

  const enlaces = [
    { href: '/dashboard', texto: 'Dashboard' },
    { href: '/productos', texto: 'Productos' }
  ];
</script>

<nav style:background="var(--bg-card)" style:borderBottom="1px solid var(--border-color)" style:padding="1rem 2rem" style:display="flex" style:justifyContent="space-between" style:alignItems="center" style:position="sticky" style:top="0" style:zIndex="100">
  <div style:display="flex" style:gap="1.5rem" style:alignItems="center">
    <a href="/dashboard" style:fontSize="1.2rem" style:fontWeight="700" style:color="var(--accent-primary)" style:textDecoration="none">
      📦 Inventario IA
    </a>
    {#each enlaces as enlace}
      <a 
        href={enlace.href} 
        style:textDecoration="none" 
        style:color={$page.url.pathname.startsWith(enlace.href) ? 'var(--accent-primary)' : 'var(--text-secondary)'}
        style:fontWeight={$page.url.pathname.startsWith(enlace.href) ? '600' : '400'}
      >
        {enlace.texto}
      </a>
    {/each}
  </div>

  <button 
    onclick={alternarTema}
    style:background="var(--bg-secondary)" 
    style:border="1px solid var(--border-color)" 
    style:padding="0.5rem 1rem" 
    style:borderRadius="6px" 
    style:cursor="pointer"
    style:color="var(--text-primary)"
  >
    {temaActual === 'light' ? '🌙 Oscuro' : '☀️ Claro'}
  </button>
</nav>