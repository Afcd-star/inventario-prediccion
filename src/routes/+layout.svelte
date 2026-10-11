<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import { page } from '$app/stores';
  
  let { children, data } = $props();
  
  // Hacerlo reactivo con $derived
  const esLogin = $derived($page.url.pathname === '/login');
</script>

{#if !esLogin}
  <Navbar {data} />
{/if}

<main style:padding="1rem">
  {@render children()}
</main>