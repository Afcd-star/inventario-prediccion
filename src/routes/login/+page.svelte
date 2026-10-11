<script lang="ts">
  import { enhance } from '$app/forms';

  let { form }: { form?: { error?: string } } = $props();
</script>

<svelte:head>
  <title>Login | StockPredict Pro</title>
</svelte:head>

<main class="login-container">
  <!-- Header separado arriba -->
  <div class="app-header">
    <span class="logo">📦</span>
    <h1 class="app-title">StockPredict Pro</h1>
    <p class="app-subtitle">Gestión Inteligente de Stock</p>
  </div>

  <!-- Formulario centrado -->
  <div class="card login-card">
    <div class="card-header">
      <h2 class="card-title">Acceso al Sistema</h2>
      <p class="card-subtitle">Ingresa tus credenciales para continuar</p>
    </div>

    {#if form?.error}
      <div class="alert alert-danger login-error">
        {form.error}
      </div>
    {/if}

    <form method="POST" use:enhance class="login-form">
      <div class="input-group">
        <label for="email" class="label">Correo electrónico</label>
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
        <label for="password" class="label">Contraseña</label>
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
        Ingresar al Sistema
      </button>
    </form>

    <div class="credentials-hint">
      <p class="hint-label">Credenciales de prueba:</p>
      <code class="hint-code">admin@inventario.com / admin123</code>
    </div>
  </div>
</main>

<style>
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-primary);
    padding: 2rem 1rem;
    gap: 2rem;
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
</style>