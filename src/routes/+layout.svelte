<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { inicializarI18n, waitLocale } from '$lib/i18n';

  let { children, data } = $props();

  void inicializarI18n();

  const esLogin = $derived($page.url.pathname === '/login');

  // Esperar a que las traducciones estén listas
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