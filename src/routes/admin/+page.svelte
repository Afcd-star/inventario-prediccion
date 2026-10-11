<script lang="ts">
  import type { PageData } from './$types';

  let { data, form }: { data: PageData; form?: { success?: string; error?: string } } = $props();
</script>

<svelte:head>
  <title>Panel de Administración | StockPredict Pro</title>
</svelte:head>

<main class="page-container">
  <header class="page-header">
    <a href="/dashboard" class="btn-back">
      <span>←</span>
      <span>Volver al Dashboard</span>
    </a>
    <h1>Panel de Administración</h1>
    <p class="text-secondary">Gestión de usuarios y herramientas del sistema</p>
  </header>

  <!-- Mensajes de feedback -->
  {#if form?.success === 'usuario_creado'}
    <div class="alert alert-success">
      ✅ Usuario creado exitosamente.
    </div>
  {:else if form?.success === 'rol_actualizado'}
    <div class="alert alert-success">
      ✅ Rol actualizado correctamente.
    </div>
  {:else if form?.success === 'usuario_eliminado'}
    <div class="alert alert-success">
      🗑️ Usuario eliminado.
    </div>
  {:else if form?.success === 'predicciones_recalculadas'}
    <div class="alert alert-success">
       Todas las predicciones han sido recalculadas.
    </div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">
      ️ {form.error}
    </div>
  {/if}

  <div class="admin-grid">
    <!-- Lista de Usuarios -->
    <section class="card">
      <h2>Usuarios del Sistema</h2>
      {#if data.usuarios.length === 0}
        <p class="text-secondary">No hay usuarios registrados.</p>
      {:else}
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each data.usuarios as usuario}
              <tr>
                <td>{usuario.nombre}</td>
                <td>{usuario.email}</td>
                <td>
                  <span class="badge" class:badge-admin={usuario.rol === 'admin'} class:badge-empleado={usuario.rol === 'empleado'}>
                    {usuario.rol === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </td>
                <td class="actions-cell">
                  <form method="POST" action="?/cambiarRol" class="inline-form">
                    <input type="hidden" name="userId" value={usuario.id} />
                    <select name="rol" class="input-field select-rol">
                      <option value="admin" selected={usuario.rol === 'admin'}>Admin</option>
                      <option value="empleado" selected={usuario.rol === 'empleado'}>Empleado</option>
                    </select>
                    <button type="submit" class="btn btn-small btn-primary">Actualizar</button>
                  </form>
                  <form method="POST" action="?/eliminarUsuario" class="inline-form" onsubmit={(e) => {
                    if (!confirm('¿Eliminar este usuario?')) e.preventDefault();
                  }}>
                    <input type="hidden" name="userId" value={usuario.id} />
                    <button type="submit" class="btn btn-small btn-danger">Eliminar</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>

    <!-- Crear Nuevo Usuario -->
    <section class="card">
      <h2>Crear Nuevo Usuario</h2>
      <form method="POST" action="?/crearUsuario" class="form-stack">
        <div class="input-group">
          <label for="nombre" class="label">Nombre completo</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            required
            class="input-field"
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div class="input-group">
          <label for="email" class="label">Correo electrónico</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            class="input-field"
            placeholder="usuario@empresa.com"
          />
        </div>
        <div class="input-group">
          <label for="password" class="label">Contraseña inicial</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            minlength="6"
            class="input-field"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div class="input-group">
          <label for="rol" class="label">Rol</label>
          <select id="rol" name="rol" class="input-field">
            <option value="empleado">Empleado</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">
          Crear Usuario
        </button>
      </form>
    </section>

    <!-- Herramientas del Sistema -->
    <section class="card">
      <h2>Herramientas del Sistema</h2>
      <p class="text-secondary" style:marginBottom="1rem">
        Utiliza estas herramientas para mantener el sistema actualizado.
      </p>
      <form method="POST" action="?/recalcularPredicciones">
        <button type="submit" class="btn btn-warning">
          🔄 Recalcular Todas las Predicciones
        </button>
      </form>
    </section>
  </div>
</main>

<style>
  .page-header {
    margin-bottom: 2rem;
  }

  .admin-grid {
    display: grid;
    gap: 2rem;
  }

  .actions-cell {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .inline-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .select-rol {
    width: auto;
    padding: 0.5rem;
    font-size: var(--font-size-sm);
  }

</style>