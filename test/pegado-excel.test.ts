import { describe, it, expect } from 'bun:test';
import {
  aplicarPegado,
  crearFilaVacia,
  normalizarClasificacion,
  parsearTSV,
  type FilaLoteEditable,
} from '../src/features/defectos/utils/pegado-excel';

// Pruebas unitarias puras del frontend: no usan red ni base de datos.

let contador = 0;
const nuevoId = () => `t-${++contador}`;

describe('parsearTSV', () => {
  it('separa filas y columnas copiadas desde Excel', () => {
    expect(parsearTSV('Costura floja\tMAYOR\nPliegue\tMENOR\n')).toEqual([
      ['Costura floja', 'MAYOR'],
      ['Pliegue', 'MENOR'],
    ]);
  });

  it('soporta CRLF, celdas entrecomilladas con salto de línea y comillas escapadas', () => {
    expect(parsearTSV('"Línea 1\nLínea 2"\tCRITICO\r\n"Dice ""hola"""\tMENOR')).toEqual([
      ['Línea 1\nLínea 2', 'CRITICO'],
      ['Dice "hola"', 'MENOR'],
    ]);
  });
});

describe('normalizarClasificacion', () => {
  it('reconoce variantes con acentos y mayúsculas y devuelve vacío si no se reconoce', () => {
    expect(normalizarClasificacion('Crítico')).toBe('CRITICO');
    expect(normalizarClasificacion(' mayor ')).toBe('MAYOR');
    expect(normalizarClasificacion('MENOR')).toBe('MENOR');
    expect(normalizarClasificacion('grave')).toBe('');
  });
});

describe('aplicarPegado', () => {
  it('mapea varias filas y columnas a Descripción y Clasificación, extendiendo la tabla', () => {
    const base: FilaLoteEditable[] = [crearFilaVacia('a', 'MENOR')];
    const r = aplicarPegado(base, 0, 0, parsearTSV('Costura floja\tMAYOR\nPliegue\tCrítico\nManchas\t'), 'MENOR', nuevoId);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ id: 'a', descripcion: 'Costura floja', clasificacion: 'MAYOR' });
    expect(r[1]).toMatchObject({ descripcion: 'Pliegue', clasificacion: 'CRITICO' });
    // sin clasificación pegada conserva la clasificación por defecto
    expect(r[2]).toMatchObject({ descripcion: 'Manchas', clasificacion: 'MENOR' });
  });

  it('una sola columna pegada en la columna de descripción rellena filas consecutivas', () => {
    const r = aplicarPegado([], 0, 0, parsearTSV('Uno\nDos\nTres'), 'MAYOR', nuevoId);
    expect(r.map((f) => f.descripcion)).toEqual(['Uno', 'Dos', 'Tres']);
    expect(r.every((f) => f.clasificacion === 'MAYOR')).toBe(true);
  });

  it('pegar en la columna de clasificación solo modifica clasificaciones y no toca descripciones', () => {
    const base: FilaLoteEditable[] = [
      { id: '1', descripcion: 'A', clasificacion: 'MENOR' },
      { id: '2', descripcion: 'B', clasificacion: 'MENOR' },
    ];
    const r = aplicarPegado(base, 0, 1, parsearTSV('CRITICO\nmayor'), 'MENOR', nuevoId);
    expect(r.map((f) => f.descripcion)).toEqual(['A', 'B']);
    expect(r.map((f) => f.clasificacion)).toEqual(['CRITICO', 'MAYOR']);
  });

  it('omite la fila de encabezado pegada desde Excel y las filas totalmente vacías', () => {
    const r = aplicarPegado([], 0, 0, parsearTSV('Descripción\tClasificación\nA\tMAYOR\n\t\nB\tMENOR\n'), 'MENOR', nuevoId);
    expect(r.map((f) => f.descripcion)).toEqual(['A', 'B']);
  });

  it('una clasificación no reconocida queda vacía para que la validación la señale', () => {
    const r = aplicarPegado([], 0, 0, parsearTSV('A\tGRAVE'), 'MENOR', nuevoId);
    expect(r[0].clasificacion).toBe('');
  });

  it('es inmutable: no modifica el arreglo original', () => {
    const base: FilaLoteEditable[] = [{ id: '1', descripcion: 'X', clasificacion: 'MENOR' }];
    aplicarPegado(base, 0, 0, parsearTSV('Y'), 'MENOR', nuevoId);
    expect(base[0].descripcion).toBe('X');
  });
});
