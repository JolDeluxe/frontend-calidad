import { describe, it, expect } from 'bun:test';

// Mocks y tipos representativos del modal
interface LineaAsociada {
  lineaId: number;
  activo: boolean;
  orden: number;
}

interface DepartamentoMock {
  id: number;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  lineasAsociadas?: LineaAsociada[];
}

interface GrupoCodificacionMock {
  id: number;
  lineaId: number;
  departamentoId: number;
  prefijo: number;
  siguienteConsecutivo: number;
  activo: boolean;
}

const mockDepartamentos: DepartamentoMock[] = [
  { id: 1, nombre: 'CORTE', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 1 }] },
  { id: 2, nombre: 'PRELIMINARES', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 2 }] },
  { id: 3, nombre: 'BORDADO Y LASER', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 3 }] },
  { id: 4, nombre: 'PESPUNTE', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 4 }] },
  { id: 5, nombre: 'MONTADO', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 5 }] },
  { id: 6, nombre: 'ACABADO', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 6 }] },
  { id: 7, nombre: 'AVIOS', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 7 }] },
  { id: 11, nombre: 'ADORNO', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 1, activo: true, orden: 8 }] },
  { id: 20, nombre: 'CORTE ACCESORIO', estado: 'ACTIVO', lineasAsociadas: [{ lineaId: 2, activo: true, orden: 1 }] },
];

const mockGrupos: GrupoCodificacionMock[] = [
  { id: 1, lineaId: 1, departamentoId: 1, prefijo: 11, siguienteConsecutivo: 24, activo: true },
  { id: 2, lineaId: 1, departamentoId: 2, prefijo: 12, siguienteConsecutivo: 85, activo: true },
  { id: 3, lineaId: 1, departamentoId: 3, prefijo: 13, siguienteConsecutivo: 19, activo: true },
  { id: 4, lineaId: 1, departamentoId: 4, prefijo: 14, siguienteConsecutivo: 70, activo: true },
  { id: 5, lineaId: 1, departamentoId: 5, prefijo: 15, siguienteConsecutivo: 56, activo: true },
  { id: 6, lineaId: 1, departamentoId: 6, prefijo: 17, siguienteConsecutivo: 69, activo: true },
  { id: 7, lineaId: 1, departamentoId: 7, prefijo: 16, siguienteConsecutivo: 33, activo: true },
  // Nótese: ADORNO (11) no tiene grupo para lineaId: 1
  // Línea 2 (ACCESORIO) no tiene grupos registrados
];

function calcularEstadoSelector(
  lineaId: number | '',
  departamentos: DepartamentoMock[],
  grupos: GrupoCodificacionMock[]
) {
  const hayLineaSeleccionada = typeof lineaId === 'number' && lineaId > 0;

  const gruposActivos = new Set(
    hayLineaSeleccionada
      ? grupos.filter((g) => g.activo && g.lineaId === lineaId).map((g) => g.departamentoId)
      : [],
  );

  const deptosDeLinea = hayLineaSeleccionada
    ? departamentos
        .filter((d) => d.estado === 'ACTIVO' && d.lineasAsociadas?.some((l) => l.activo && l.lineaId === lineaId))
        .sort(
          (a, b) =>
            (a.lineasAsociadas?.find((l) => l.lineaId === lineaId)?.orden ?? 0) -
            (b.lineasAsociadas?.find((l) => l.lineaId === lineaId)?.orden ?? 0),
        )
    : [];

  const selectorDeshabilitado = !hayLineaSeleccionada;
  const mensajePlaceholder = !hayLineaSeleccionada
    ? 'Seleccione una línea para continuar'
    : '-- Selecciona un departamento --';

  const opciones = deptosDeLinea.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    habilitado: gruposActivos.has(d.id),
    texto: `${d.nombre}${gruposActivos.has(d.id) ? '' : ' (codificación pendiente)'}`,
  }));

  return {
    hayLineaSeleccionada,
    selectorDeshabilitado,
    mensajePlaceholder,
    opciones,
  };
}

describe('Lógica del selector de línea y departamento en creación de defectos', () => {
  it('Escenario 1 & 2: Abrir desde TODAS (lineaInicialId = null / lineaId = "")', () => {
    const estado = calcularEstadoSelector('', mockDepartamentos, mockGrupos);
    expect(estado.hayLineaSeleccionada).toBe(false);
    expect(estado.selectorDeshabilitado).toBe(true);
    expect(estado.mensajePlaceholder).toBe('Seleccione una línea para continuar');
    // Ningún departamento debe mostrarse ni aparecer como (codificación pendiente)
    expect(estado.opciones.length).toBe(0);
  });

  it('Escenario 3: Abrir o seleccionar BOTA (lineaId = 1)', () => {
    const estado = calcularEstadoSelector(1, mockDepartamentos, mockGrupos);
    expect(estado.hayLineaSeleccionada).toBe(true);
    expect(estado.selectorDeshabilitado).toBe(false);
    expect(estado.mensajePlaceholder).toBe('-- Selecciona un departamento --');

    // Debe mostrar los departamentos de BOTA
    expect(estado.opciones.length).toBe(8);

    // CORTE debe estar habilitado sin sufijo
    const corte = estado.opciones.find((o) => o.id === 1);
    expect(corte?.habilitado).toBe(true);
    expect(corte?.texto).toBe('CORTE');

    // ADORNO no tiene grupo configurado: debe indicar codificación pendiente y estar deshabilitado
    const adorno = estado.opciones.find((o) => o.id === 11);
    expect(adorno?.habilitado).toBe(false);
    expect(adorno?.texto).toBe('ADORNO (codificación pendiente)');
  });

  it('Escenario 4: Abrir o seleccionar ACCESORIO (lineaId = 2)', () => {
    const estado = calcularEstadoSelector(2, mockDepartamentos, mockGrupos);
    expect(estado.hayLineaSeleccionada).toBe(true);
    expect(estado.selectorDeshabilitado).toBe(false);

    // Muestra departamentos de la línea 2
    expect(estado.opciones.length).toBe(1);
    const deptoAcc = estado.opciones[0];
    expect(deptoAcc.id).toBe(20);
    // Como línea 2 no tiene grupo, debe estar deshabilitado con codificación pendiente
    expect(deptoAcc.habilitado).toBe(false);
    expect(deptoAcc.texto).toBe('CORTE ACCESORIO (codificación pendiente)');
  });

  it('Escenario 5: Cambiar de línea recalcula departamentos disponibles', () => {
    // Primero en BOTA
    const bota = calcularEstadoSelector(1, mockDepartamentos, mockGrupos);
    expect(bota.opciones.some((o) => o.id === 1 && o.habilitado)).toBe(true);

    // Cambiar a sin línea
    const vacio = calcularEstadoSelector('', mockDepartamentos, mockGrupos);
    expect(vacio.selectorDeshabilitado).toBe(true);
    expect(vacio.opciones.length).toBe(0);

    // Cambiar a ACCESORIO
    const accesorio = calcularEstadoSelector(2, mockDepartamentos, mockGrupos);
    expect(accesorio.opciones.some((o) => o.id === 1)).toBe(false);
    expect(accesorio.opciones.some((o) => o.id === 20)).toBe(true);
  });
});
