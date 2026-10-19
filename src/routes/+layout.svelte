<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { inicializarI18n, waitLocale, cambiarIdioma } from '$lib/i18n';
  import Toasts from '$lib/components/Toasts.svelte';
  import { VERSION } from '$lib/version';

  let { children, data } = $props();

  // Extraer valores de forma reactiva para evitar el warning state_referenced_locally
  const prefs = $derived(data.preferencias ?? { tema_preferido: 'light', idioma_preferido: 'es' });
  const tieneUsuario = $derived(Boolean(data.usuario));

  // $effect se ejecuta síncronamente en la inicialización, aplicando el tema antes del primer pintado
  $effect(() => {
    if (tieneUsuario) {
      if (prefs.tema_preferido) {
        document.documentElement.setAttribute('data-theme', prefs.tema_preferido);
        localStorage.setItem('tema', prefs.tema_preferido);
      }
      if (prefs.idioma_preferido) {
        cambiarIdioma(prefs.idioma_preferido as 'es' | 'en');
        localStorage.setItem('idioma', prefs.idioma_preferido);
      }
    } else {
      // Fallback para usuarios no logueados
      const temaGuardado = localStorage.getItem('tema');
      const preferidoSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const temaInicial = temaGuardado === 'light' || temaGuardado === 'dark' 
        ? temaGuardado 
        : (preferidoSistema ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', temaInicial);
    }
  });

  void inicializarI18n();

  const esLogin = $derived($page.url.pathname === '/login');

  onMount(async () => {
    await waitLocale();
  });
</script>

{#if !esLogin}
  <Navbar {data} />
{/if}

<main style:padding="1rem">
  {@render children()}
</main>

{#if !esLogin}
  <footer class="app-footer">
    <span>StockPredict Pro · Gestión inteligente de inventario</span>
    <span class="footer-version">v{VERSION}</span>
  </footer>
{/if}

<!-- Sistema global de notificaciones: disponible en todas las rutas, incluido el login -->
<Toasts />