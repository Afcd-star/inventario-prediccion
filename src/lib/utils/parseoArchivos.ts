import Papa from 'papaparse';

export interface ResultadoParseo {
  filas: Array<Record<string, string>>;
  errores: string[];
}

/**
 * Convierte un encabezado "humano" (Nombre, Stock mínimo, DESCRIPCIÓN)
 * a la clave interna normalizada (nombre, stock_minimo, descripcion).
 * Perdona mayúsculas, tildes y espacios-vs-guionbajo, que son las
 * diferencias más comunes entre lo que escribe Excel y lo que espera el sistema.
 */
function normalizarHeader(header: string): string {
  return header
    .normalize('NFD')                 // separa la tilde del carácter base
    .replace(/[\u0300-\u036f]/g, '')  // elimina las tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')      // cualquier no-alfanumérico -> _
    .replace(/_+/g, '_')              // colapsa guiones bajos repetidos
    .replace(/^_|_$/g, '');           // recorta guiones bajos en los extremos
}

/**
 * Detecta el formato REAL del archivo leyendo sus magic bytes,
 * en lugar de confiar en la extensión (que puede mentir:
 * un XLSX guardado con nombre .csv por Excel, por ejemplo).
 */
async function detectarFormato(archivo: File): Promise<'csv' | 'excel'> {
  const encabezado = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());

  const esZip = encabezado[0] === 0x50 && encabezado[1] === 0x4b;          // PK.. (xlsx)
  const esOle2 =
    encabezado[0] === 0xd0 &&
    encabezado[1] === 0xcf &&
    encabezado[2] === 0x11 &&
    encabezado[3] === 0xe0;                                                // xls legado

  return esZip || esOle2 ? 'excel' : 'csv';
}

export async function parsearArchivo(
  archivo: File,
  columnasRequeridas: string[]
): Promise<ResultadoParseo> {
  const formato = await detectarFormato(archivo);
  return formato === 'excel'
    ? parsearExcel(archivo, columnasRequeridas)
    : parsearCSV(archivo, columnasRequeridas);
}

/**
 * RESCATE DE EMERGENCIA.
 * Si el archivo trae UNA sola columna y su encabezado contiene comas,
 * asumimos que es un CSV pegado como texto dentro de una celda de Excel
 * y lo dividimos por comas para reconstruir la tabla real.
 *
 * Limitación honesta: este split simple NO protege campos entrecomillados
 * que contengan comas internas (ej: "Pan, blanco"). Para esos casos la
 * solución de raíz es importar el CSV como tabla en Excel (ver docs).
 * Como red de seguridad, si el rescate no mejora la situación, se devuelve
 * el original y el usuario verá el error de columnas faltantes con claridad.
 */
function rescatarColumnaUnica(
  crudas: Array<Record<string, unknown>>,
  headers: string[]
): { crudas: Array<Record<string, unknown>>; headers: string[] } {
  if (headers.length !== 1) return { crudas, headers };

  const unico = headers[0];
  if (!unico || !unico.includes(',')) return { crudas, headers };

  const nuevosHeaders = unico.split(',').map((h) => h.trim());
  if (nuevosHeaders.length <= 1) return { crudas, headers };

  const nuevaCruda = crudas.map((fila) => {
    const texto = String(fila[unico] ?? '');
    const valores = texto.split(',').map((v) => v.trim());
    const obj: Record<string, unknown> = {};
    nuevosHeaders.forEach((h, i) => {
      obj[h] = valores[i] ?? '';
    });
    return obj;
  });

  return { crudas: nuevaCruda, headers: nuevosHeaders };
}

function parsearCSV(archivo: File, columnasRequeridas: string[]): Promise<ResultadoParseo> {
  return new Promise((resolve) => {
    Papa.parse(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errores = results.errors.map(humanizarErrorPapa);
        const headersOriginales = results.meta.fields ?? [];
        const { crudas, headers } = rescatarColumnaUnica(
          results.data as Array<Record<string, unknown>>,
          headersOriginales
        );
        resolve(normalizarFilas(crudas, headers, columnasRequeridas, errores));
      },
      error: (error) =>
        resolve({ filas: [], errores: [`Error al leer el archivo: ${error.message}`] })
    });
  });
}

function humanizarErrorPapa(error: { row?: number; message?: string }): string {
  const fila = (error.row ?? 0) + 2;
  const mensaje = error.message ?? '';

  if (/too many fields/i.test(mensaje)) {
    return `Fila ${fila}: sobran columnas (hay más comas de las que declara el encabezado).`;
  }
  if (/too few fields/i.test(mensaje)) {
    return `Fila ${fila}: faltan columnas (hay menos comas de las que declara el encabezado).`;
  }
  if (/invalid quoted field/i.test(mensaje)) {
    return `Fila ${fila}: hay comillas mal cerradas en un texto.`;
  }
  return `Fila ${fila}: ${mensaje}`;
}

async function parsearExcel(archivo: File, columnasRequeridas: string[]): Promise<ResultadoParseo> {
  try {
    const XLSX = await import('xlsx');
    const buffer = await archivo.arrayBuffer();
    const libro = XLSX.read(buffer, { type: 'array', cellDates: true });

    const nombreHoja = libro.SheetNames[0];
    if (!nombreHoja) {
      return { filas: [], errores: ['El archivo no contiene hojas.'] };
    }

    const crudasOriginales = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      libro.Sheets[nombreHoja],
      { defval: '' }
    );
    const headersOriginales = crudasOriginales.length > 0 ? Object.keys(crudasOriginales[0]) : [];

    // 👇 Aquí es donde entra el rescate para el "CSV pegado en una celda"
    const { crudas, headers } = rescatarColumnaUnica(crudasOriginales, headersOriginales);

    return normalizarFilas(crudas, headers, columnasRequeridas, []);
  } catch (error: any) {
    return {
      filas: [],
      errores: [
        `No se pudo leer el archivo como Excel: ${error.message}. ` +
          'Si pegaste un CSV dentro de Excel, usa "Guardar como → CSV UTF-8" o impórtalo con Datos → Obtener datos → Desde texto/CSV.'
      ]
    };
  }
}

/**
 * Formatea una Date a AAAA-MM-DD usando la ZONA HORARIA LOCAL.
 * NO usar toISOString(): devuelve UTC y desplaza la fecha un día
 * en husos horarios al este de Greenwich (España = UTC+1/+2).
 */
function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function normalizarFilas(
  crudas: Array<Record<string, unknown>>,
  headersOriginales: string[],
  columnasRequeridas: string[],
  erroresPrevios: string[]
): ResultadoParseo {
  const errores = [...erroresPrevios];

  const mapa = headersOriginales.map((h) => ({ original: h, clave: normalizarHeader(h) }));
  const clavesDisponibles = new Set(mapa.map((m) => m.clave));

  const faltantes = columnasRequeridas.filter((c) => !clavesDisponibles.has(c));
  if (faltantes.length > 0) {
    errores.push(`Columnas faltantes: ${faltantes.join(', ')}`);
    const detectadas = mapa.map((m) => `"${m.original}" → ${m.clave}`).join(', ');
    errores.push(`Columnas detectadas en el archivo: ${detectadas || '(ninguna)'}`);
    return { filas: [], errores };
  }

  const filas = crudas.map((fila) => {
    const normalizada: Record<string, string> = {};
    for (const { original, clave } of mapa) {
      const valor = fila[original];
      normalizada[clave] =
        valor instanceof Date ? fechaLocalISO(valor) : String(valor ?? '');
    }
    return normalizada;
  });

  if (filas.length === 0) {
    errores.push('El archivo está vacío o no tiene datos válidos');
  }

  return { filas, errores };
}