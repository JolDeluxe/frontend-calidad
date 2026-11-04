import type { ClasificacionDefecto } from '../types/defectos.types';

/** Fila editable de la tabla de carga masiva. */
export interface FilaLoteEditable {
  id: string;
  clave: string;
  descripcion: string;
  clasificacion: ClasificacionDefecto | '';
}

const ENCABEZADOS_CLAVE = new Set(['clave', 'codigo', 'cve', '#']);
const ENCABEZADOS_DESCRIPCION = new Set([
  'descripcion',
  'descripcion del defecto',
  'defecto',
  'nombre',
]);

function sinAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/**
 * Convierte texto copiado de Excel/Hojas de cálculo (TSV) en una matriz de celdas.
 * Respeta celdas entrecomilladas con saltos de línea, tabuladores y comillas escapadas ("").
 */
export function parsearTSV(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
      continue;
    }

    if (c === '"' && celda === '') {
      entreComillas = true;
    } else if (c === '\t') {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }

  if (celda !== '' || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  return filas;
}

/** Interpreta valores de clasificación pegados (Crítico, critico, MAYOR, men…). Devuelve '' si no se reconoce. */
export function normalizarClasificacion(valor: string): ClasificacionDefecto | '' {
  const v = sinAcentos(valor);
  if (v.startsWith('crit')) return 'CRITICO';
  if (v.startsWith('may')) return 'MAYOR';
  if (v.startsWith('men')) return 'MENOR';
  return '';
}

export function crearFilaVacia(id: string, clasificacion: ClasificacionDefecto | '', clave = ''): FilaLoteEditable {
  return { id, clave, descripcion: '', clasificacion };
}

/**
 * Aplica un bloque pegado (matriz de celdas) a partir de la celda (filaInicio, colInicio).
 * Mapeo de columnas según colInicio:
 * Si colInicio === 0:
 *   - Si la primera celda es un número o texto numérico y hay >= 2 columnas: Col 0 = Clave, Col 1 = Descripción, Col 2 = Clasificación
 *   - Si el pegado trae 2 columnas y col 0 no es número: se asume Descripción (Col 1) y Clasificación (Col 2), o Clave y Descripción según contexto.
 *   - Si coincide con encabezados típicos ("Clave", "Descripción"), se salta la primera fila.
 */
export function aplicarPegado(
  filas: ReadonlyArray<FilaLoteEditable>,
  filaInicio: number,
  colInicio: number,
  matriz: string[][],
  clasificacionPorDefecto: ClasificacionDefecto | '',
  generarId: () => string,
): FilaLoteEditable[] {
  let bloque = matriz.filter((f) => f.some((c) => c.trim() !== ''));
  if (bloque.length === 0) return filas.map((f) => ({ ...f }));

  // Detectar si la primera fila es encabezado
  const primerCeldaNorm = sinAcentos(bloque[0][0] ?? '');
  const segundaCeldaNorm = sinAcentos(bloque[0][1] ?? '');
  if (
    ENCABEZADOS_CLAVE.has(primerCeldaNorm) ||
    ENCABEZADOS_DESCRIPCION.has(primerCeldaNorm) ||
    ENCABEZADOS_DESCRIPCION.has(segundaCeldaNorm)
  ) {
    bloque = bloque.slice(1);
  }

  const resultado = filas.map((f) => ({ ...f }));

  bloque.forEach((celdas, i) => {
    const destino = filaInicio + i;
    while (resultado.length <= destino) {
      resultado.push(crearFilaVacia(generarId(), clasificacionPorDefecto));
    }

    // Detectar si el usuario pegó 2 columnas comenzando en col 0 pero la primera columna es texto largo (Descripción)
    // En tal caso, mapear a Descripción (col 1) y Clasificación (col 2).
    let mapeoCols: number[] = celdas.map((_, idx) => colInicio + idx);
    if (colInicio === 0 && celdas.length === 2) {
      const c0 = celdas[0].trim();
      const esNumero = /^\d+$/.test(c0);
      if (!esNumero) {
        // Son Descripción y Clasificación
        mapeoCols = [1, 2];
      }
    }

    celdas.forEach((celda, j) => {
      const col = mapeoCols[j];
      const val = celda.trim();
      if (col === 0) {
        // Columna 0: Clave
        resultado[destino].clave = val;
      } else if (col === 1) {
        // Columna 1: Descripción
        resultado[destino].descripcion = val;
      } else if (col === 2) {
        // Columna 2: Clasificación
        if (val !== '') {
          resultado[destino].clasificacion = normalizarClasificacion(val);
        }
      }
    });
  });

  return resultado;
}
