<script lang="ts">
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';

  interface Props {
    valor: string;
    tamano?: number;
  }

  let { valor, tamano = 200 }: Props = $props();
  let svgData = $state('');

  onMount(async () => {
    try {
      // Generamos el QR en formato SVG
      svgData = await QRCode.toString(valor, { 
        type: 'svg', 
        width: tamano, 
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' } // Usamos colores neutros
      });
    } catch (e) {
      console.error('Error generando QR:', e);
    }
  });
</script>

<div class="card" style:display="flex" style:flexDirection="column" style:alignItems="center" style:gap="1rem">
  {@html svgData}
  <p class="text-sm text-secondary">ID del producto: {valor}</p>
</div>