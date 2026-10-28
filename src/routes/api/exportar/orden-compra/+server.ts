import { error } from '@sveltejs/kit';
import { reportesService } from '$lib/server/services/reportes.service';
import { proveedoresService } from '$lib/server/services/proveedores.service';
import { auditoriaService } from '$lib/server/services/auditoria.service';
import type { RequestHandler } from './$types';
import type { LineaOCPayload, OrdenCompraExportable, LineaOC } from '$lib/types';

function fechaCompacta(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
function horaCompacta(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}${p(d.getMinutes())}`;
}
function sumarDias(base: Date, dias: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
  if (!locals.usuario || locals.usuario.rol !== 'admin') {
    throw error(403, 'No autorizado');
  }

  // 1 · Parseo y shape del payload (el cliente solo manda ids + cantidad).
  let body: { lineas?: unknown };
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Cuerpo JSON inválido');
  }
  if (!Array.isArray(body.lineas) || body.lineas.length === 0) {
    throw error(400, 'No hay líneas seleccionadas');
  }
  const lineas = body.lineas as LineaOCPayload[];
  for (const l of lineas) {
    if (!Number.isSafeInteger(l.producto_id) || l.producto_id <= 0) throw error(400, 'producto_id inválido');
    if (!Number.isSafeInteger(l.proveedor_id) || l.proveedor_id <= 0) throw error(400, 'proveedor_id inválido');
    if (!Number.isSafeInteger(l.cantidad) || l.cantidad <= 0) throw error(400, 'cantidad inválida');
  }

  // 2 · Agrupo por proveedor_id (D2: una OC = un proveedor).
  const grupos = new Map<number, LineaOCPayload[]>();
  for (const l of lineas) {
    const arr = grupos.get(l.proveedor_id);
    if (arr) arr.push(l);
    else grupos.set(l.proveedor_id, [l]);
  }

  // 3 · Validación D6 + construcción, POR LÍNEA, contra BD (el server es la autoridad).
  const ahora = new Date();
  const stamp = `${fechaCompacta(ahora)}-${horaCompacta(ahora)}`;
  const ocs: OrdenCompraExportable[] = [];

  for (const [proveedorId, groupLineas] of grupos) {
    const resueltas: LineaOC[] = [];
    let total = 0;
    let plazoMax: number | null = null;
    let cabecera: { nombre: string; contacto: string | null; email: string | null; telefono: string | null } | null = null;

    for (const l of groupLineas) {
      // El server RESUELVE el par desde BD: costo, MOQ, plazo, nombre. Si null → el par
      // no existe o el proveedor está inactivo → 400 (no manipulable desde el cliente).
      const par = proveedoresService.obtenerParActivo(l.producto_id, l.proveedor_id);
      if (!par) {
        throw error(400, `El producto #${l.producto_id} no se puede pedir al proveedor #${l.proveedor_id} (par inexistente o proveedor inactivo)`);
      }
      // MOQ: si aplica, la cantidad aprobada no puede ser inferior (D6 valida sin reescribir).
      if (par.pedido_minimo != null && par.pedido_minimo > 0 && l.cantidad < par.pedido_minimo) {
        throw error(400, `La cantidad de "${par.producto_nombre}" (${l.cantidad}) es inferior al pedido mínimo (${par.pedido_minimo})`);
      }
      const subtotal = Number((l.cantidad * par.costo_unitario).toFixed(2));
      total += subtotal;
      resueltas.push({
        producto_nombre: par.producto_nombre,
        cantidad: l.cantidad,
        costo_unitario: par.costo_unitario,
        subtotal,
        plazo_dias: par.tiempo_entrega_efectivo
      });
      // Plazo de la OC = MAX de los lead-times del grupo (M1).
      if (par.tiempo_entrega_efectivo != null) {
        plazoMax = plazoMax == null ? par.tiempo_entrega_efectivo : Math.max(plazoMax, par.tiempo_entrega_efectivo);
      }
      if (!cabecera) {
        cabecera = {
          nombre: par.proveedor_nombre,
          contacto: par.proveedor_contacto,
          email: par.proveedor_email,
          telefono: par.proveedor_telefono
        };
      }
    }

    ocs.push({
      numero: `OC-${stamp}-${proveedorId}`,   // M2: único por batch (1 OC = 1 proveedor)
      proveedor_nombre: cabecera!.nombre,
      proveedor_contacto: cabecera!.contacto,
      proveedor_email: cabecera!.email,
      proveedor_telefono: cabecera!.telefono,
      plazo_entrega_dias: plazoMax,
      fecha_estimada: plazoMax != null ? sumarDias(ahora, plazoMax) : 'Por confirmar',
      lineas: resueltas,
      total: Number(total.toFixed(2))
    });
  }

  // 4 · Generación del PDF.
  const doc = reportesService.generarOrdenCompraPDF(ocs);
  const pdfBuffer = doc.output('arraybuffer');

  // 5 · Auditoría de la emisión (patrón marcarTodasLeidas de notificaciones).
  auditoriaService.registrar({
    usuarioId: locals.usuario.id,
    accion: 'oc_generada',
    tabla: 'producto_proveedor',
    detalles: {
      nOCs: ocs.length,
      proveedores: ocs.map(o => o.numero),
      lineas: lineas.length
    },
    ip: getClientAddress()
  });

  const nombreArchivo = `orden_compra_${fechaCompacta(ahora)}.pdf`;
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`
    }
  });
};