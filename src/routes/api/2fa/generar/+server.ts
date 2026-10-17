import { json } from '@sveltejs/kit';
import { totpService } from '$lib/server/services/totp.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  if (!locals.usuario) {
    return json({ error: 'No autenticado' }, { status: 401 });
  }

  if (totpService.estaActivado(locals.usuario.id)) {
    return json({ error: '2FA ya está activado' }, { status: 400 });
  }

  const secreto = totpService.generarSecreto();
  const uri = totpService.generarURI(locals.usuario.email, secreto);
  const qrDataUrl = await totpService.generarQR(uri);

  // Nota: No guardamos el secreto en la BD todavía. 
  // Se guardará solo cuando el usuario verifique el código correctamente.
  return json({ secreto, qrDataUrl });
};