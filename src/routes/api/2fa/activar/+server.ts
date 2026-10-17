import { json } from '@sveltejs/kit';
import { totpService } from '$lib/server/services/totp.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.usuario) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  const data = await request.json();
  const { secreto, codigo } = data;

  if (!secreto || !codigo) {
    return json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // 1. Verificar que el código TOTP es válido para este secreto
  if (!totpService.verificarCodigo(secreto, codigo)) {
    return json({ error: 'Código de verificación inválido' }, { status: 400 });
  }

  // 2. Generar códigos de recuperación
  const codigosRecuperacion = totpService.generarCodigosRecuperacion();

  // 3. Activar 2FA y guardar códigos hasheados en una transacción
  try {
    const transaction = locals.usuario.id; // Solo para asegurar contexto, la transacción está en el servicio
    totpService.activar(locals.usuario.id, secreto);
    totpService.guardarCodigosRecuperacion(locals.usuario.id, codigosRecuperacion);

    auditoriaService.registrar({
      usuarioId: locals.usuario.id,
      accion: 'perfil_2fa_activado',
      tabla: 'usuarios',
      registroId: locals.usuario.id,
      detalles: { metodo: 'TOTP' },
      ip: getClientAddress()
    });

    // 4. Devolver los códigos en texto plano (ÚNICA VEZ que se muestran)
    return json({ 
      success: true, 
      codigosRecuperacion 
    });
  } catch (error) {
    console.error('Error activando 2FA:', error);
    return json({ error: 'Error interno al activar 2FA' }, { status: 500 });
    }
};