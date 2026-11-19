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

describe('aplicarPegado (Contrato de 3 columnas: 0=Clave, 1=Descripción, 2=Clasificación)', () => {
  it('mapea varias filas y 3 columnas (Clave, Descripción y Clasificación), extendiendo la tabla', () => {
    const base: FilaLoteEditable[] = [crearFilaVacia('a', 'MENOR')];
    const r = aplicarPegado(
      base,
      0,
      0,
      parsearTSV('1101\tCostura floja\tMAYOR\n1102\tPliegue\tCrítico\n1103\tManchas\t'),
      'MENOR',
      nuevoId
    );
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ id: 'a', clave: '1101', descripcion: 'Costura floja', clasificacion: 'MAYOR' });
    expect(r[1]).toMatchObject({ clave: '1102', descripcion: 'Pliegue', clasificacion: 'CRITICO' });
    // sin clasificación pegada conserva la clasificación por defecto
    expect(r[2]).toMatchObject({ clave: '1103', descripcion: 'Manchas', clasificacion: 'MENOR' });
  });

  it('mapea 2 columnas de texto pegadas en col 0 a Descripción (col 1) y Clasificación (col 2) sin pisar claves existentes', () => {
    const base: FilaLoteEditable[] = [{ id: 'a', clave: '105', descripcion: '', clasificacion: 'MENOR' }];
    const r = aplicarPegado(base, 0, 0, parsearTSV('Costura floja\tMAYOR\nPliegue\tCrítico\nManchas\t'), 'MENOR', nuevoId);
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({ id: 'a', clave: '105', descripcion: 'Costura floja', clasificacion: 'MAYOR' });
    expect(r[1]).toMatchObject({ clave: '', descripcion: 'Pliegue', clasificacion: 'CRITICO' });
    expect(r[2]).toMatchObject({ clave: '', descripcion: 'Manchas', clasificacion: 'MENOR' });
  });

  it('una sola columna pegada en la columna de Clave (col 0) rellena claves consecutivas sin tocar descripciones ni clasificaciones', () => {
    const base: FilaLoteEditable[] = [
      { id: '1', clave: '', descripcion: 'Defecto A', clasificacion: 'MAYOR' },
      { id: '2', clave: '', descripcion: 'Defecto B', clasificacion: 'MENOR' },
    ];
    const r = aplicarPegado(base, 0, 0, parsearTSV('101\n102\n103'), 'MAYOR', nuevoId);
    expect(r.map((f) => f.clave)).toEqual(['101', '102', '103']);
    expect(r[0].descripcion).toBe('Defecto A');
    expect(r[1].descripcion).toBe('Defecto B');
    expect(r[0].clasificacion).toBe('MAYOR');
    expect(r[1].clasificacion).toBe('MENOR');
  });

  it('una sola columna pegada en la columna de Descripción (col 1) rellena filas consecutivas sin sobrescribir claves', () => {
    const base: FilaLoteEditable[] = [
      { id: '1', clave: '501', descripcion: '', clasificacion: 'MAYOR' },
    ];
    const r = aplicarPegado(base, 0, 1, parsearTSV('Uno\nDos\nTres'), 'MAYOR', nuevoId);
    expect(r.map((f) => f.descripcion)).toEqual(['Uno', 'Dos', 'Tres']);
    expect(r[0].clave).toBe('501');
    expect(r.every((f) => f.clasificacion === 'MAYOR')).toBe(true);
  });

  it('pegar en la columna de Clasificación (col 2) solo modifica clasificaciones y no toca claves ni descripciones', () => {
    const base: FilaLoteEditable[] = [
      { id: '1', clave: '201', descripcion: 'A', clasificacion: 'MENOR' },
      { id: '2', clave: '202', descripcion: 'B', clasificacion: 'MENOR' },
    ];
    const r = aplicarPegado(base, 0, 2, parsearTSV('CRITICO\nmayor'), 'MENOR', nuevoId);
    expect(r.map((f) => f.clave)).toEqual(['201', '202']);
    expect(r.map((f) => f.descripcion)).toEqual(['A', 'B']);
    expect(r.map((f) => f.clasificacion)).toEqual(['CRITICO', 'MAYOR']);
  });

  it('conserva claves, descripciones y clasificaciones existentes ante celdas vacías en pegado multicolumna', () => {
    const base: FilaLoteEditable[] = [
      { id: '1', clave: '301', descripcion: 'Original 1', clasificacion: 'CRITICO' },
      { id: '2', clave: '302', descripcion: 'Original 2', clasificacion: 'MAYOR' },
    ];
    const r = aplicarPegado(base, 0, 0, parsearTSV('\tNueva 1\t\n305\t\tMENOR'), 'MENOR', nuevoId);
    expect(r[0]).toEqual({ id: '1', clave: '301', descripcion: 'Nueva 1', clasificacion: 'CRITICO' });
    expect(r[1]).toEqual({ id: '2', clave: '305', descripcion: 'Original 2', clasificacion: 'MENOR' });
  });

  it('omite la fila de encabezado pegada desde Excel y las filas totalmente vacías', () => {
    const r = aplicarPegado([], 0, 0, parsearTSV('Descripción\tClasificación\nA\tMAYOR\n\t\nB\tMENOR\n'), 'MENOR', nuevoId);
    expect(r.map((f) => f.descripcion)).toEqual(['A', 'B']);

    const rClasif = aplicarPegado(
      [{ id: '1', clave: '10', descripcion: 'Defecto', clasificacion: 'MENOR' }],
      0,
      2,
      parsearTSV('Clasificación\nCRITICO'),
      'MENOR',
      nuevoId
    );
    expect(rClasif[0].clasificacion).toBe('CRITICO');
  });

  it('una clasificación no reconocida queda vacía para que la validación la señale', () => {
    const r = aplicarPegado([], 0, 0, parsearTSV('A\tGRAVE'), 'MENOR', nuevoId);
    expect(r[0].clasificacion).toBe('');
  });

  it('es inmutable: no modifica el arreglo original', () => {
    const base: FilaLoteEditable[] = [{ id: '1', clave: '100', descripcion: 'X', clasificacion: 'MENOR' }];
    aplicarPegado(base, 0, 1, parsearTSV('Y'), 'MENOR', nuevoId);
    expect(base[0].descripcion).toBe('X');
    expect(base[0].clave).toBe('100');
  });
});
