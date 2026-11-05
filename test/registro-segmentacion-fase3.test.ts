import { describe, expect, it } from 'bun:test';
import {
  construirGrillaCalendarioMes,
  construirQueryInspecciones,
  construirQueryPeriodosDisponibles,
  describirPeriodoActivo,
  esFechaSeleccionableEnCalendario,
  formatearEtiquetaAnio,
  formatearEtiquetaSemana,
  formatearFechaCortaIso,
  leerFiltrosDesdeSearchParams,
  MODALIDADES_PERIODO_OPCIONES,
  obtenerConteoPeriodoSeleccionado,
  obtenerSemanasDeAnio,
  parsearSemanaIsoCodigo,
  puedeEjecutarConsultaTemporal,
  serializarFiltrosASearchParams,
  sincronizarFiltrosConPeriodosDisponibles,
  tieneFiltrosActivos,
} from '../src/features/registro/utils/filtros-registro';
import {
  calcularResumenExportacion,
  construirBloquesCsvExportacion,
  construirHtmlReportePdf,
  deduplicarFilasExportacion,
  exportarRegistrosAPdf,
  UMBRAL_ADVERTENCIA_PDF,
} from '../src/features/registro/utils/exportar-reporte';
import type {
  FiltrosRegistroState,
  InspeccionFilaResponse,
  PeriodosDisponiblesResponse,
} from '../src/features/registro/types/registro.types';

const PERIODOS_MOCK: PeriodosDisponiblesResponse = {
  anios: [
    { anio: 2025, totalDefectos: 120, totalInspecciones: 28 },
    { anio: 2024, totalDefectos: 65, totalInspecciones: 14 },
  ],
  aniosIso: [
    { anioIso: 2025, totalDefectos: 135, totalInspecciones: 31 },
    { anioIso: 2024, totalDefectos: 50, totalInspecciones: 11 },
  ],
  anioSeleccionado: 2025,
  anioIsoSeleccionado: 2025,
  mesSeleccionado: 1,
  meses: [
    {
      anio: 2025,
      mes: 1,
      nombre: 'Enero',
      label: 'Enero 2025',
      totalDefectos: 80,
      totalInspecciones: 19,
    },
    {
      anio: 2024,
      mes: 12,
      nombre: 'Diciembre',
      label: 'Diciembre 2024',
      totalDefectos: 40,
      totalInspecciones: 9,
    },
  ],
  semanas: [
    {
      anioIso: 2025,
      semana: 1,
      codigo: '2025-W01',
      fechaInicio: '2024-12-30',
      fechaFin: '2025-01-05',
      label: 'Semana 01 (30 dic. 2024 – 5 ene. 2025)',
      etiqueta: 'Semana 01 (30 dic. 2024 – 5 ene. 2025)',
      totalDefectos: 34,
      totalInspecciones: 8,
    },
    {
      anioIso: 2025,
      semana: 2,
      codigo: '2025-W02',
      fechaInicio: '2025-01-06',
      fechaFin: '2025-01-12',
      label: 'Semana 02 (6 ene. 2025 – 12 ene. 2025)',
      etiqueta: 'Semana 02 (6 ene. 2025 – 12 ene. 2025)',
      totalDefectos: 46,
      totalInspecciones: 11,
    },
    {
      anioIso: 2024,
      semana: 52,
      codigo: '2024-W52',
      fechaInicio: '2024-12-23',
      fechaFin: '2024-12-29',
      label: 'Semana 52 (23 dic. 2024 – 29 dic. 2024)',
      etiqueta: 'Semana 52 (23 dic. 2024 – 29 dic. 2024)',
      totalDefectos: 50,
      totalInspecciones: 11,
    },
  ],
  dias: [
    {
      fecha: '2025-01-12',
      anio: 2025,
      mes: 1,
      dia: 12,
      diaSemana: 'domingo',
      label: 'Domingo 12 de enero de 2025',
      totalDefectos: 21,
      totalInspecciones: 4,
    },
    {
      fecha: '2025-01-02',
      anio: 2025,
      mes: 1,
      dia: 2,
      diaSemana: 'jueves',
      label: 'Jueves 2 de enero de 2025',
      totalDefectos: 19,
      totalInspecciones: 5,
    },
  ],
  rangoTotal: {
    fechaMinima: '2024-03-10',
    fechaMaxima: '2025-01-12',
    hoy: '2025-01-15',
  },
};

function crearFilaMock(overrides: Partial<InspeccionFilaResponse> = {}): InspeccionFilaResponse {
  return {
    id: 1,
    inspeccionId: 100,
    inspectorId: 7,
    folio: 'INSP-000100',
    fecha: '2025-01-02T16:30:00.000Z',
    departamentoAuditoria: 'ADORNO',
    departamentoAuditoriaCodigo: 'ADO',
    defDepto: 'CORTE',
    lista: 'L-45',
    lote: '89012',
    linea: 'L2',
    modelo: 'BOTA VAQUERA 501',
    horma: 'H-10',
    cliente: 'CLIENTE NACIONAL',
    descripcion: 'PIEL RES CAFE',
    cantidadLote: 24,
    defectoId: 11,
    defectoClave: 1101,
    defectoNombre: 'Cinta de refuerzo mal colocada',
    clasificacion: 'CRITICO',
    paresDefectuosos: 3,
    usuario: 'Inspector Inactivo Histórico',
    notas: null,
    ...overrides,
  };
}

describe('Fase 3.1 Frontend — Ajustes UX y simplificación de segmentación en Registro MBC', () => {
  it('1. Los años se muestran sin conteos ni prefijos', () => {
    for (const a of PERIODOS_MOCK.anios) {
      const texto = formatearEtiquetaAnio(a.anio);
      expect(texto).toBe(String(a.anio));
      expect(texto).not.toContain('(');
      expect(texto).not.toContain('ISO');
    }
    expect(formatearEtiquetaAnio(2026)).toBe('2026');
  });

  it('2. Las semanas se muestran de forma legible sin la palabra ISO ni el año repetido', () => {
    for (const s of PERIODOS_MOCK.semanas) {
      const etiqueta = formatearEtiquetaSemana(s);
      expect(etiqueta).toMatch(/^Semana \d{2}/);
      expect(etiqueta.toUpperCase()).not.toContain('ISO');
      expect(etiqueta).not.toMatch(/^\d{4}-W\d{2}/);
    }

    const etiquetaCruceAnio = formatearEtiquetaSemana(PERIODOS_MOCK.semanas[0]!);
    expect(etiquetaCruceAnio).toBe('Semana 01 (30 dic. 2024 – 5 ene. 2025)');

    // Incluso si llegara un texto con prefijo o "ISO", lo limpia
    const etiquetaLimpiada = formatearEtiquetaSemana({
      semana: 3,
      label: '2025-W03 · Semana ISO 03 (13 ene. 2025 – 19 ene. 2025)',
    });
    expect(etiquetaLimpiada).toBe('Semana 03 (13 ene. 2025 – 19 ene. 2025)');
    expect(etiquetaLimpiada).not.toContain('ISO');
  });

  it('3. Las semanas de años diferentes no se confunden ni se mezclan', () => {
    const semanas2025 = obtenerSemanasDeAnio(PERIODOS_MOCK.semanas, 2025);
    const semanas2024 = obtenerSemanasDeAnio(PERIODOS_MOCK.semanas, 2024);

    expect(semanas2025.map((s) => s.semana)).toEqual([1, 2]);
    expect(semanas2025.every((s) => s.anioIso === 2025)).toBe(true);

    expect(semanas2024.map((s) => s.semana)).toEqual([52]);
    expect(semanas2024.every((s) => s.anioIso === 2024)).toBe(true);

    // Si el usuario cambia de año 2025 a 2024, la semana se actualiza a la disponible de 2024 (Semana 52)
    const cambioAnio = sincronizarFiltrosConPeriodosDisponibles(
      { periodo: 'semana', anioIso: 2024, semana: 1 },
      PERIODOS_MOCK
    );
    expect(cambioAnio.anioIso).toBe(2024);
    expect(cambioAnio.semana).toBe(52);
    expect(cambioAnio.semanaIsoCodigo).toBe('2024-W52');

    const parsed = parsearSemanaIsoCodigo('2025-W01');
    expect(parsed).toEqual({ anioIso: 2025, semana: 1, codigo: '2025-W01' });
  });

  it('4. El selector de día mediante calendario permite elegir únicamente fechas válidas con registros en formato YYYY-MM-DD', () => {
    const grillaEnero2025 = construirGrillaCalendarioMes(
      2025,
      1,
      PERIODOS_MOCK.dias,
      '2025-01-15'
    );

    const celdasDelMes = grillaEnero2025.filter((c) => c.esDelMesActual);
    expect(celdasDelMes.length).toBe(31);

    const celdasSeleccionables = celdasDelMes.filter((c) => c.seleccionable);
    expect(celdasSeleccionables.map((c) => c.fecha)).toEqual(['2025-01-02', '2025-01-12']);

    // Un día del mes sin registros (ej. 2025-01-05) no es seleccionable
    const celdaSinRegistros = celdasDelMes.find((c) => c.fecha === '2025-01-05');
    expect(celdaSinRegistros?.tieneRegistros).toBe(false);
    expect(celdaSinRegistros?.seleccionable).toBe(false);
    expect(
      esFechaSeleccionableEnCalendario('2025-01-05', PERIODOS_MOCK.dias, '2025-01-15')
    ).toBe(false);

    // Un día con registros (2025-01-02) es seleccionable y genera la query exacta de ese día
    expect(
      esFechaSeleccionableEnCalendario('2025-01-02', PERIODOS_MOCK.dias, '2025-01-15')
    ).toBe(true);
    expect(formatearFechaCortaIso('2025-01-02')).toBe('02/01/2025');

    const queryDia = construirQueryInspecciones({
      periodo: 'dia',
      anio: 2025,
      mes: 1,
      dia: '2025-01-02',
    });
    expect(queryDia).toEqual({
      periodo: 'dia',
      dia: '2025-01-02',
      busqueda: undefined,
      departamentoResponsableId: undefined,
      lineaTexto: undefined,
      inspectorId: undefined,
      soloEliminados: false,
    });

    // La descripción de un día muestra únicamente una fecha (sin repetir `02/01/2025 (02/01/2025)`)
    const descDia = describirPeriodoActivo(
      { periodo: 'dia', anio: 2025, mes: 1, dia: '2025-01-02' },
      PERIODOS_MOCK
    );
    expect(descDia).toBe('02/01/2025');
    expect(descDia).not.toContain('(');

    // Al cambiar de año en el calendario (ej. de 2025 a 2024) cuando `periodos` aún tiene anioSeleccionado=2025,
    // no debe regresar el año a 2025 sino conservar el nuevo año/mes seleccionado mientras carga
    const cambioAnioEnTransito = sincronizarFiltrosConPeriodosDisponibles(
      { periodo: 'dia', anio: 2024, mes: 12, dia: undefined },
      PERIODOS_MOCK
    );
    expect(cambioAnioEnTransito.anio).toBe(2024);
    expect(cambioAnioEnTransito.mes).toBe(12);
    expect(cambioAnioEnTransito.dia).toBeUndefined();

    // Una vez que el backend responde con los días de 2024-12, selecciona automáticamente el día disponible de ese mes
    const cambioAnioResuelto = sincronizarFiltrosConPeriodosDisponibles(
      cambioAnioEnTransito,
      {
        ...PERIODOS_MOCK,
        anioSeleccionado: 2024,
        mesSeleccionado: 12,
        dias: [
          {
            fecha: '2024-12-30',
            anio: 2024,
            mes: 12,
            dia: 30,
            diaSemana: 'lunes',
            label: '30/12/2024',
            totalDefectos: 15,
            totalInspecciones: 3,
          },
        ],
      }
    );
    expect(cambioAnioResuelto.anio).toBe(2024);
    expect(cambioAnioResuelto.mes).toBe(12);
    expect(cambioAnioResuelto.dia).toBe('2024-12-30');
  });

  it('5. Las fechas futuras están deshabilitadas en el calendario y no pueden consultarse', () => {
    const diasConFuturoSimulado = [
      ...PERIODOS_MOCK.dias,
      {
        fecha: '2025-01-20',
        anio: 2025,
        mes: 1,
        dia: 20,
        diaSemana: 'lunes',
        label: 'Lunes 20 de enero de 2025',
        totalDefectos: 10,
        totalInspecciones: 2,
      },
    ];

    const grilla = construirGrillaCalendarioMes(2025, 1, diasConFuturoSimulado, '2025-01-15');
    const celdaFutura = grilla.find((c) => c.fecha === '2025-01-20');
    expect(celdaFutura?.esFuturo).toBe(true);
    expect(celdaFutura?.seleccionable).toBe(false);

    expect(
      esFechaSeleccionableEnCalendario('2025-01-20', diasConFuturoSimulado, '2025-01-15')
    ).toBe(false);

    const validacionConsulta = puedeEjecutarConsultaTemporal(
      { periodo: 'dia', anio: 2025, mes: 1, dia: '2025-01-20' },
      PERIODOS_MOCK,
      '2025-01-15'
    );
    expect(validacionConsulta.listo).toBe(false);
    expect(validacionConsulta.errorValidacion).toContain('fechas futuras');
  });

  it('6. No existe el filtro de defectos en estado, URL, queries ni exportación', () => {
    const paramsConDefectoResidual = new URLSearchParams(
      'periodo=mes&anio=2025&mes=1&defecto=1101&defectoClave=1101'
    );
    const leido = leerFiltrosDesdeSearchParams(paramsConDefectoResidual);

    expect('defectoClave' in leido).toBe(false);

    const serializado = serializarFiltrosASearchParams(leido);
    expect(serializado.has('defecto')).toBe(false);
    expect(serializado.has('defectoClave')).toBe(false);

    const queryTablaYExport = construirQueryInspecciones(leido);
    expect('defectoClave' in queryTablaYExport).toBe(false);

    const queryPeriodos = construirQueryPeriodosDisponibles(leido);
    expect('defectoClave' in queryPeriodos).toBe(false);
  });

  it('7. No existe la modalidad Rango personalizado', () => {
    const idsModalidades = MODALIDADES_PERIODO_OPCIONES.map((m) => m.id as string);
    expect(idsModalidades).not.toContain('rango');

    // Si llega una URL con periodo=rango&desde=2025-01-01&hasta=2025-01-10, se normaliza a modo acotado seguro
    const paramsRango = new URLSearchParams(
      'periodo=rango&desde=2025-01-01&hasta=2025-01-10'
    );
    const leido = leerFiltrosDesdeSearchParams(paramsRango);
    expect(leido.periodo as string).not.toBe('rango');
    expect('fechaDesde' in leido).toBe(false);
    expect('fechaHasta' in leido).toBe(false);

    const serializado = serializarFiltrosASearchParams(leido);
    expect(serializado.has('desde')).toBe(false);
    expect(serializado.has('hasta')).toBe(false);
  });

  it('8. No existe la modalidad Todos ni se envía periodo=todos al backend', () => {
    const idsModalidades = MODALIDADES_PERIODO_OPCIONES.map((m) => m.id as string);
    expect(idsModalidades).toEqual(['hoy', 'dia', 'semana', 'mes', 'anio']);
    expect(idsModalidades).not.toContain('todos');

    // Incluso si se forzara un objeto inválido en runtime, construirQueryInspecciones nunca emite 'todos'
    const queryForzada = construirQueryInspecciones({
      periodo: 'todos' as any,
    });
    expect(queryForzada.periodo).toBe('hoy');
    expect(queryForzada.periodo).not.toBe('todos');
  });

  it('9. Una URL antigua con periodo=todos se normaliza de manera segura y acotada', () => {
    // Caso A: URL antigua con mes y año (?periodo=todos&mes=1&anio=2025) -> modalidad 'mes'
    const paramsConMes = new URLSearchParams('periodo=todos&mes=1&anio=2025');
    const leidoConMes = leerFiltrosDesdeSearchParams(paramsConMes);
    expect(leidoConMes.periodo).toBe('mes');
    expect(leidoConMes.anio).toBe(2025);
    expect(leidoConMes.mes).toBe(1);

    // Caso B: URL antigua solo con periodo=todos -> normaliza al período acotado disponible más reciente
    const paramsSoloTodos = new URLSearchParams('periodo=todos');
    const leidoSoloTodos = leerFiltrosDesdeSearchParams(paramsSoloTodos);
    expect(leidoSoloTodos.periodo as string).not.toBe('todos');
    expect(leidoSoloTodos.esSeleccionInicial).toBe(true);

    const sincronizado = sincronizarFiltrosConPeriodosDisponibles(
      leidoSoloTodos,
      PERIODOS_MOCK
    );
    expect(sincronizado.periodo).toBe('dia');
    expect(sincronizado.dia).toBe('2025-01-12');
    expect(construirQueryInspecciones(sincronizado).periodo).toBe('dia');
  });

  it('10. Al entrar al módulo sin parámetros no se ejecuta una consulta histórica completa: prefiere hoy si hay registros o el periodo más reciente', () => {
    const entradaInicial = leerFiltrosDesdeSearchParams(new URLSearchParams(''));
    expect(entradaInicial.periodo).toBe('hoy');
    expect(entradaInicial.esSeleccionInicial).toBe(true);

    // Escenario 1: Hoy ('2025-01-12') SÍ tiene registros -> permanece en 'hoy'
    const periodosConRegistrosHoy: PeriodosDisponiblesResponse = {
      ...PERIODOS_MOCK,
      rangoTotal: {
        ...PERIODOS_MOCK.rangoTotal,
        fechaMaxima: '2025-01-12',
        hoy: '2025-01-12',
      },
    };
    const syncConHoy = sincronizarFiltrosConPeriodosDisponibles(
      entradaInicial,
      periodosConRegistrosHoy
    );
    expect(syncConHoy.periodo).toBe('hoy');
    expect(syncConHoy.esSeleccionInicial).toBe(false);

    // Escenario 2: Hoy ('2025-01-15') NO tiene registros -> selecciona el día más reciente con registros ('2025-01-12')
    const syncSinHoy = sincronizarFiltrosConPeriodosDisponibles(
      entradaInicial,
      PERIODOS_MOCK
    );
    expect(syncSinHoy.periodo).toBe('dia');
    expect(syncSinHoy.dia).toBe('2025-01-12');
    expect(syncSinHoy.anio).toBe(2025);
    expect(syncSinHoy.mes).toBe(1);
    expect(syncSinHoy.esSeleccionInicial).toBe(false);
  });

  it('11. La exportación respeta exactamente el periodo seleccionado, soporta > 500 registros en CSV y umbral PDF de 2,500', () => {
    const filtrosSemana: FiltrosRegistroState = {
      periodo: 'semana',
      anioIso: 2025,
      semana: 1,
      semanaIsoCodigo: '2025-W01',
    };

    const queryTabla = construirQueryInspecciones(filtrosSemana);
    const queryExport = construirQueryInspecciones(filtrosSemana);
    expect(queryExport).toEqual(queryTabla);
    expect(queryExport.periodo).toBe('semana');
    expect(queryExport.anioIso).toBe(2025);
    expect(queryExport.semana).toBe(1);

    // Exportación CSV masiva (> 500 registros) sin truncamiento
    const filasMasivas: InspeccionFilaResponse[] = Array.from({ length: 1250 }, (_, idx) =>
      crearFilaMock({
        id: idx + 1,
        inspeccionId: Math.ceil((idx + 1) / 4),
        lote: `LOTE-${idx + 1}`,
        paresDefectuosos: 2,
      })
    );

    const deduplicadas = deduplicarFilasExportacion([
      ...filasMasivas,
      crearFilaMock({ id: 1, inspeccionId: 1 }),
    ]);
    expect(deduplicadas.length).toBe(1250);

    const resumen = calcularResumenExportacion(filasMasivas);
    expect(resumen.totalDefectos).toBe(1250);
    expect(resumen.totalInspecciones).toBe(313);
    expect(resumen.totalParesDefectuosos).toBe(2500);

    const chunks = construirBloquesCsvExportacion(filasMasivas, 500);
    const lineas = chunks.join('').trim().split('\r\n');
    expect(lineas.length).toBe(1251);

    // Umbral preventivo PDF en 2,500 y sin uso de alert()
    expect(UMBRAL_ADVERTENCIA_PDF).toBe(2500);
    const resPdfSinWindow = exportarRegistrosAPdf(filasMasivas.slice(0, 3), {
      periodoNombre: describirPeriodoActivo(filtrosSemana, PERIODOS_MOCK),
    });
    expect(resPdfSinWindow.ok).toBe(false);
    expect(resPdfSinWindow.error).toBeDefined();
  });

  it('12. Los permisos, el borrado lógico y el alcance departamental permanecen intactos', () => {
    const params = new URLSearchParams(
      'periodo=mes&anio=2025&mes=1&depto=4&linea=L2&inspector=12&eliminados=true&q=89012'
    );
    const leido = leerFiltrosDesdeSearchParams(params);

    expect(leido.departamentoId).toBe(4);
    expect(leido.lineaTexto).toBe('L2');
    expect(leido.inspectorId).toBe(12);
    expect(leido.soloEliminados).toBe(true);
    expect(leido.busqueda).toBe('89012');
    expect(tieneFiltrosActivos(leido)).toBe(true);

    const query = construirQueryInspecciones(leido);
    expect(query).toEqual({
      periodo: 'mes',
      anio: 2025,
      mes: 1,
      departamentoResponsableId: 4,
      lineaTexto: 'L2',
      inspectorId: 12,
      busqueda: '89012',
      soloEliminados: true,
    });

    const conteoMes = obtenerConteoPeriodoSeleccionado(leido, PERIODOS_MOCK);
    expect(conteoMes).toEqual({ totalDefectos: 80, totalInspecciones: 19 });
  });

  it('13. Los registros históricos de inspectores inactivos siguen apareciendo en tabla y reportes', () => {
    const filaInspectorInactivo = crearFilaMock({
      id: 501,
      inspectorId: 99,
      usuario: 'Juan Pérez (Baja Histórica)',
      paresDefectuosos: 4,
    });

    const csvCompleto = construirBloquesCsvExportacion([filaInspectorInactivo]).join('');
    expect(csvCompleto).toContain('Juan Pérez (Baja Histórica)');

    const htmlPdf = construirHtmlReportePdf([filaInspectorInactivo], {
      periodoNombre: 'Enero 2025',
    });
    expect(htmlPdf).toContain('Juan Pérez (Baja Histórica)');
    expect(htmlPdf).toContain('Total de Defectos: <strong>1</strong>');
    expect(htmlPdf).toContain('Total de Inspecciones (Lotes): <strong>1</strong>');
  });
});
