<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Html5Qrcode } from 'html5-qrcode';
  import { goto } from '$app/navigation';

  let scanner: Html5Qrcode | null = null;
  let escaneando = $state(false);
  let error = $state('');

  async function iniciarEscaneo() {
    escaneando = true;
    error = '';
    scanner = new Html5Qrcode("lector-qr");
    
    try {
      await scanner.start(
        { facingMode: "environment" }, // Usa la cámara trasera en móviles
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // ¡Código detectado!
          detenerEscaneo();
          goto(`/productos/${decodedText}/movimientos`);
        },
        (errorMessage) => {
          // Ignoramos errores de parseo continuo
        }
      );
    } catch (err) {
      error = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
      escaneando = false;
    }
  }

  async function detenerEscaneo() {
    if (scanner) {
      await scanner.stop().catch(err => console.error(err));
      scanner.clear();
      scanner = null;
    }
    escaneando = false;
  }

  onDestroy(() => {
    detenerEscaneo();
  });
</script>

<div class="card">
  <h2>Escanear Código QR</h2>
  <p class="text-secondary text-sm">Apunta la cámara hacia el código QR del producto.</p>
  
  <div id="lector-qr" style:width="100%" style:maxWidth="300px" style:margin="1rem auto"></div>
  
  {#if error}
    <div class="alert alert-danger" style:marginTop="1rem">{error}</div>
  {/if}
  
  <div style:marginTop="1rem" style:display="flex" style:gap="0.5rem" style:justifyContent="center">
    {#if !escaneando}
      <button class="btn btn-primary" onclick={iniciarEscaneo}>📷 Iniciar Cámara</button>
    {:else}
      <button class="btn btn-danger" onclick={detenerEscaneo}>Detener Escaneo</button>
    {/if}
  </div>
</div>