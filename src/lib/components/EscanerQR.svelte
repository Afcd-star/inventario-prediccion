<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Html5Qrcode } from 'html5-qrcode';
  import { goto } from '$app/navigation';
  import { _ } from 'svelte-i18n';

  let scanner: Html5Qrcode | null = null;
  let escaneando = $state(false);
  let error = $state(false);

  async function iniciarEscaneo() {
    escaneando = true;
    error = false;
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
      error = true;
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
  <h2>{$_('escanear.tituloComponente')}</h2>
  <p class="text-secondary text-sm">{$_('escanear.ayudaComponente')}</p>
  
  <div id="lector-qr" style:width="100%" style:maxWidth="300px" style:margin="1rem auto"></div>
  
  {#if error}
    <div class="alert alert-danger" style:marginTop="1rem">{$_('escanear.errorCamara')}</div>
  {/if}
  
  <div style:marginTop="1rem" style:display="flex" style:gap="0.5rem" style:justifyContent="center">
    {#if !escaneando}
      <button class="btn btn-primary" onclick={iniciarEscaneo}>📷 {$_('escanear.iniciar')}</button>
    {:else}
      <button class="btn btn-danger" onclick={detenerEscaneo}>{$_('escanear.detener')}</button>
    {/if}
  </div>
</div>