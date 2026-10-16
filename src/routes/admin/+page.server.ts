import { fail, redirect } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import db from '$lib/server/database';
import { prediccionService } from '$lib/server/services/prediccion.service';
import { esFechaCaducidadValida, movimientosService } from '$lib/server/services/movimientos.service';
import type { PageServerLoad, Actions } from './$types';
import { anomaliasService } from '$lib/server/services/anomalias.service';

export const load = (async ({ locals }) => {
  // Protección estricta: solo admins
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw redirect(303, '/dashboard');
  }

  // Obtener lista de usuarios
  const usuarios = db.prepare(
    'SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY created_at DESC'
  ).all() as Array<{
    id: number;
    nombre: string;
    email: string;
    rol: string;
    created_at: string;
  }>;

  const tablas = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>;
  const obtenerColumnas = (nombre: string) =>
    db.prepare(`PRAGMA table_info("${nombre.replaceAll('"', '""')}")`)
      .all() as Array<{ name: string }>;
  const obtenerConteo = (nombre: string) =>
    db.prepare(`SELECT COUNT(*) AS total FROM "${nombre.replaceAll('"', '""')}"`)
      .get() as { total: number };

  const tablasSistema = tablas.map(({ name }) => ({
    nombre: name,
    columnas: obtenerColumnas(name).length,
    registros: obtenerConteo(name).total
  }));

  return { usuarios, tablas: tablasSistema, usuarioActualId: locals.usuario.id, configDeteccion: anomaliasService.obtenerConfiguracion() };
}) satisfies PageServerLoad;

export const actions = {
  crearUsuario: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const nombre = data.get('nombre')?.toString();
    const email = data.get('email')?.toString();
    const password = data.get('password')?.toString();
    const rol = data.get('rol')?.toString();

    if (!nombre || !email || !password) {
      return fail(400, { error: 'admin.errorCampos' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'admin.errorPassword' });
    }

    if (rol !== 'admin' && rol !== 'empleado') {
      return fail(400, { error: 'admin.errorRol' });
    }

    // Verificar si el email ya existe
    const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existe) {
      return fail(400, { error: 'admin.errorEmail' });
    }

    const saltos = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, saltos);

    db.prepare(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)'
    ).run(nombre, email, hash, rol);

    return { success: 'usuario_creado' };
  },

  cambiarRol: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const userId = parseInt(data.get('userId')?.toString() || '0');
    const nuevoRol = data.get('rol')?.toString();

    if (!userId || !nuevoRol) {
      return fail(400, { error: 'admin.errorDatos' });
    }

    if (nuevoRol !== 'admin' && nuevoRol !== 'empleado') {
      return fail(400, { error: 'admin.errorRol' });
    }

    // No permitir que un admin se quite su propio rol
    if (userId === locals.usuario.id && nuevoRol !== 'admin') {
      return fail(400, { error: 'admin.errorAutoRol' });
    }

    db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?').run(nuevoRol, userId);

    return { success: 'rol_actualizado' };
  },

  eliminarUsuario: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const userId = parseInt(data.get('userId')?.toString() || '0');

    if (!userId) {
      return fail(400, { error: 'admin.errorDatos' });
    }

    // No permitir auto-eliminación
    if (userId === locals.usuario.id) {
      return fail(400, { error: 'admin.errorAutoEliminar' });
    }

    db.prepare('DELETE FROM usuarios WHERE id = ?').run(userId);

    return { success: 'usuario_eliminado' };
  },

  editarProducto: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    const data = await request.formData();
    const productoId = Number(data.get('producto_id')?.toString());
    const nombre = data.get('nombre')?.toString().trim();
    const descripcion = data.get('descripcion')?.toString().trim() ?? '';
    const precio = Number(data.get('precio')?.toString());
    const stockObjetivo = Number(data.get('stock_actual')?.toString());
    const stockMinimo = Number(data.get('stock_minimo')?.toString());
    const numeroLote = data.get('numero_lote')?.toString().trim() ?? '';
    const fechaCaducidad = data.get('fecha_caducidad')?.toString() ?? '';

    if (!Number.isSafeInteger(productoId) || productoId <= 0 ||
      !nombre || !Number.isFinite(precio) || precio < 0) {
      return fail(400, { error: 'productos.errorCampos' });
    }
    if (!Number.isSafeInteger(stockObjetivo) || stockObjetivo < 0 ||
      !Number.isSafeInteger(stockMinimo) || stockMinimo < 0) {
      return fail(400, { error: 'productos.errorInventario' });
    }

    const productoActual = db.prepare(
      'SELECT id, stock_actual FROM productos WHERE id = ?'
    ).get(productoId) as { id: number; stock_actual: number } | undefined;
    if (!productoActual) {
      return fail(404, { error: 'productos.noEncontrado' });
    }

    const nombreDuplicado = db.prepare(
      'SELECT id FROM productos WHERE nombre = ? AND id != ?'
    ).get(nombre, productoId);
    if (nombreDuplicado) {
      return fail(400, { error: 'productos.errorNombreDuplicado' });
    }

    const diferenciaStock = stockObjetivo - productoActual.stock_actual;
    if (diferenciaStock > 0 &&
      (!numeroLote || !esFechaCaducidadValida(fechaCaducidad))) {
      return fail(400, { error: 'productos.errorLote' });
    }

    if (diferenciaStock < 0) {
      const lotesDisponibles = db.prepare(`
        SELECT COALESCE(SUM(cantidad_actual), 0) AS total
        FROM lotes
        WHERE producto_id = ? AND cantidad_actual > 0
      `).get(productoId) as { total: number };
      if (productoActual.stock_actual - stockObjetivo > lotesDisponibles.total) {
        return fail(400, { error: 'admin.errorStockSinLotes' });
      }
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE productos
        SET nombre = ?, descripcion = ?, precio = ?, stock_minimo = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, descripcion, precio, stockMinimo, productoId);

      if (diferenciaStock > 0) {
        movimientosService.registrarEntrada(
          productoId,
          diferenciaStock,
          'Ajuste de stock desde administración',
          numeroLote,
          fechaCaducidad
        );
      } else if (diferenciaStock < 0) {
        movimientosService.registrarSalidaFEFO(
          productoId,
          -diferenciaStock,
          'Ajuste de stock desde administración'
        );
      }
    })();

    return { success: 'producto_actualizado' };
  },

  recalcularPredicciones: async ({ locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/login');
    }

    prediccionService.calcularTodas();

    return { success: 'predicciones_recalculadas' };
  },

  detectarAhora: async ({ locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/dashboard');
    }
    const nuevas = anomaliasService.detectarTodas();
    return { success: 'deteccion_ejecutada', nuevas };
  },

  guardarUmbrales: async ({ request, locals }) => {
    if (!locals.usuario || locals.usuario.rol !== 'admin') {
      throw redirect(303, '/dashboard');
    }

    const data = await request.formData();
    const umbralZ = Number(data.get('umbral_z'));
    const umbralPorcentaje = Number(data.get('umbral_porcentaje'));
    const diasConsecutivos = Number(data.get('dias_consecutivos'));

    if (
      !Number.isFinite(umbralZ) || umbralZ < 1 || umbralZ > 5 ||
      !Number.isFinite(umbralPorcentaje) || umbralPorcentaje < 10 || umbralPorcentaje > 500 ||
      !Number.isInteger(diasConsecutivos) || diasConsecutivos < 2 || diasConsecutivos > 7
    ) {
      return fail(400, { error: 'Umbrales fuera del rango permitido' });
    }

    anomaliasService.guardarConfiguracion({ umbralZ, umbralPorcentaje, diasConsecutivos });
    return { success: 'umbrales_guardados' };
  }
} satisfies Actions;