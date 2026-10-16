import db from '../database';

export interface RegistroAuditoria {
  id: number;
  usuario_id: number | null;
  usuario_nombre: string | null;
  accion: string;
  tabla_afectada: string | null;
  registro_id: number | null;
  detalles: string;
  ip: string | null;
  creada_en: string;
}

export interface DatosAccion {
  usuarioId?: number | null;
  accion: string;
  tabla?: string | null;
  registroId?: number | null;
  detalles?: object;
  ip?: string | null;
}

export interface FiltrosAuditoria {
  desde?: string | null;
  hasta?: string | null;
  usuarioId?: number | null;
  accion?: string | null;
  pagina: number;
  porPagina: number;
}

export const auditoriaService = {
  /**
   * Inserta un registro de auditoría. Nunca lanza errores hacia afuera:
   * la auditoría es un observador y jamás debe romper una operación de negocio.
   * REGLA GDPR: nunca registrar contraseñas, hashes ni tokens en detalles.
   */
  registrar(datos: DatosAccion): void {
    try {
      let nombreFoto: string | null = null;
      if (datos.usuarioId) {
        const fila = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(datos.usuarioId) as { nombre: string } | undefined;
        nombreFoto = fila?.nombre ?? null;
      }

      db.prepare(`
        INSERT INTO auditoria (usuario_id, usuario_nombre, accion, tabla_afectada, registro_id, detalles, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        datos.usuarioId ?? null,
        nombreFoto,
        datos.accion,
        datos.tabla ?? null,
        datos.registroId ?? null,
        JSON.stringify(datos.detalles ?? {}),
        datos.ip ?? null
      );
    } catch (error) {
      console.error('Fallo al registrar auditoría (no bloquea la operación):', error);
    }
  },

  /**
   * Listado paginado con filtros combinables y nombre del usuario.
   */
  listar(filtros: FiltrosAuditoria): {
    registros: Array<RegistroAuditoria & { usuario_nombre: string | null }>;
    total: number;
    pagina: number;
    totalPaginas: number;
  } {
    const condiciones: string[] = [];
    const parametros: Array<string | number> = [];

    if (filtros.desde) {
      condiciones.push('a.creada_en >= ?');
      parametros.push(`${filtros.desde} 00:00:00`);
    }
    if (filtros.hasta) {
      condiciones.push('a.creada_en <= ?');
      parametros.push(`${filtros.hasta} 23:59:59`);
    }
    if (filtros.usuarioId) {
      condiciones.push('a.usuario_id = ?');
      parametros.push(filtros.usuarioId);
    }
    if (filtros.accion) {
      condiciones.push('a.accion = ?');
      parametros.push(filtros.accion);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const filaTotal = db.prepare(
      `SELECT COUNT(*) AS total FROM auditoria a ${where}`
    ).get(...parametros) as { total: number };

    const registros = db.prepare(`
      SELECT a.*, COALESCE(a.usuario_nombre, u.nombre) AS usuario_nombre
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ${where}
      ORDER BY a.id DESC
      LIMIT ? OFFSET ?
    `).all(...parametros, filtros.porPagina, (filtros.pagina - 1) * filtros.porPagina) as Array<RegistroAuditoria & { usuario_nombre: string | null }>;

    return {
      registros,
      total: filaTotal.total,
      pagina: filtros.pagina,
      totalPaginas: Math.max(1, Math.ceil(filaTotal.total / filtros.porPagina))
    };
  },

  /**
   * Acciones distintas registradas, para alimentar el filtro de tipo de acción.
   */
  listarAccionesDistintas(): string[] {
    const filas = db.prepare(
      'SELECT DISTINCT accion FROM auditoria ORDER BY accion'
    ).all() as Array<{ accion: string }>;
    return filas.map(f => f.accion);
  }
};