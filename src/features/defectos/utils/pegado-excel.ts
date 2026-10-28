import type { ClasificacionDefecto } from '../types/defectos.types';

/** Fila editable de la tabla de carga masiva (estado local; el backend asigna las claves). */
export interface FilaLoteEditable {
  id: string;
  descripcion: string;
  clasificacion: ClasificacionDefecto | '';
}

const ENCABEZADOS_DESCRIPCION = new Set([
  'descripcion',
  'descripcion del defecto',
  'defecto',
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

export function crearFilaVacia(id: string, clasificacion: ClasificacionDefecto | ''): FilaLoteEditable {
  return { id, descripcion: '', clasificacion };
}

/**
 * Aplica un bloque pegado (matriz de celdas) a partir de la celda (filaInicio, colInicio).
 * Columna 0 = Descripción, columna 1 = Clasificación. Las columnas sobrantes se ignoran.
 * Extiende la tabla con filas nuevas cuando el bloque excede las filas existentes.
 * Si la primera fila pegada es un encabezado ("Descripción"), se omite.
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
  if (colInicio === 0 && bloque.length > 0 && ENCABEZADOS_DESCRIPCION.has(sinAcentos(bloque[0][0] ?? ''))) {
    bloque = bloque.slice(1);
  }

  const resultado = filas.map((f) => ({ ...f }));

  bloque.forEach((celdas, i) => {
    const destino = filaInicio + i;
    while (resultado.length <= destino) {
      resultado.push(crearFilaVacia(generarId(), clasificacionPorDefecto));
    }

    celdas.forEach((celda, j) => {
      const col = colInicio + j;
      if (col === 0) {
        resultado[destino].descripcion = celda.trim();
      } else if (col === 1) {
        if (celda.trim() !== '') {
          resultado[destino].clasificacion = normalizarClasificacion(celda);
        }
      }
    });
  });

  return resultado;
}
