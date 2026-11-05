import type {
  CeldaCalendarioDia,
  FiltrosInspeccionesQueryParams,
  FiltrosRegistroState,
  GetPeriodosDisponiblesQueryParams,
  ModalidadPeriodoRegistro,
  PeriodoDiaDisponible,
  PeriodosDisponiblesResponse,
  PeriodoSemanaIsoDisponible,
} from '../types/registro.types';

const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SEMANA_ISO_CODIGO_REGEX = /^(\d{4})-W(\d{1,2})$/i;

export const MODALIDADES_PERIODO_OPCIONES: Array<{
  id: ModalidadPeriodoRegistro;
  label: string;
  shortLabel: string;
}> = [
  { id: 'hoy', label: 'Hoy', shortLabel: 'Hoy' },
  { id: 'dia', label: 'Día', shortLabel: 'Día' },
  { id: 'semana', label: 'Semana', shortLabel: 'Semana' },
  { id: 'mes', label: 'Mes', shortLabel: 'Mes' },
  { id: 'anio', label: 'Año', shortLabel: 'Año' },
];

/**
 * Obtiene la fecha operativa actual (`AAAA-MM-DD`) en la zona horaria `America/Mexico_City`.
 */
export function getHoyMexicoIso(now: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback
  }
  const shifted = new Date(now.getTime() - 6 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Verifica que una cadena `AAAA-MM-DD` sea una fecha real del calendario (incluyendo años bisiestos).
 */
export function esFechaCalendarioValida(fechaStr?: string | null): boolean {
  if (!fechaStr || !FECHA_ISO_REGEX.test(fechaStr)) return false;
  const [yStr, mStr, dStr] = fechaStr.split('-');
  const anio = Number(yStr);
  const mes = Number(mStr);
  const dia = Number(dStr);
  if (anio < 2000 || anio > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    dt.getUTCFullYear() === anio &&
    dt.getUTCMonth() === mes - 1 &&
    dt.getUTCDate() === dia
  );
}

/**
 * Formatea una fecha `AAAA-MM-DD` a `DD/MM/AAAA` sin desfase de zona horaria.
 */
export function formatearFechaCortaIso(fechaIso?: string | null): string {
  if (!fechaIso) return '';
  if (FECHA_ISO_REGEX.test(fechaIso)) {
    const [y, m, d] = fechaIso.split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    return new Date(fechaIso).toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fechaIso;
  }
}

/**
 * Formatea la etiqueta visible para un año en los selectores:
 * muestra exclusivamente el número de año (`2026`), sin conteos ni prefijo `ISO`.
 */
export function formatearEtiquetaAnio(anio: number): string {
  return String(anio);
}

/**
 * Formatea la etiqueta visible para una semana en los selectores:
 * muestra únicamente `Semana XX` (ej. `Semana 01`, `Semana 41`), sin rango de fechas,
 * sin la palabra `ISO`, sin repetir el año y sin conteos.
 */
export function formatearEtiquetaSemana(semanaItem: {
  semana: number;
  label?: string;
  etiqueta?: string;
  fechaInicio?: string;
  fechaFin?: string;
}): string {
  const numStr = String(semanaItem.semana).padStart(2, '0');
  return `Semana ${numStr}`;
}

/**
 * Filtra las semanas disponibles correspondientes exclusivamente al año seleccionado (`anioIso`),
 * garantizando que no se mezclen semanas de años diferentes.
 */
export function obtenerSemanasDeAnio(
  semanas: PeriodoSemanaIsoDisponible[] | undefined,
  anioIso: number | undefined | null
): PeriodoSemanaIsoDisponible[] {
  if (!semanas || !anioIso) return [];
  return semanas.filter((s) => s.anioIso === anioIso);
}

/**
 * Parsea un código conjunto de semana (`2025-W01`) en `{ anioIso, semana, codigo }`.
 */
export function parsearSemanaIsoCodigo(
  codigo?: string | null
): { anioIso: number; semana: number; codigo: string } | null {
  if (!codigo) return null;
  const match = SEMANA_ISO_CODIGO_REGEX.exec(codigo.trim());
  if (!match) return null;
  const anioIso = Number(match[1]);
  const semana = Number(match[2]);
  if (!Number.isInteger(anioIso) || !Number.isInteger(semana) || semana < 1 || semana > 53) {
    return null;
  }
  return {
    anioIso,
    semana,
    codigo: formatearSemanaIsoCodigo(anioIso, semana),
  };
}

/**
 * Construye el identificador interno conjunto de año y semana (`AAAA-WSS`, ej. `2025-W01`).
 */
export function formatearSemanaIsoCodigo(anioIso: number, semana: number): string {
  return `${anioIso}-W${String(semana).padStart(2, '0')}`;
}

/**
 * Verifica si una fecha `YYYY-MM-DD` es seleccionable en el calendario:
 * - Debe ser una fecha de calendario válida.
 * - No puede ser futura respecto a `America/Mexico_City` (`fecha <= hoyIso`).
 * - Debe existir en la lista de días con registros reales (`diasDisponibles`).
 */
export function esFechaSeleccionableEnCalendario(
  fechaStr: string | null | undefined,
  diasDisponibles: PeriodoDiaDisponible[],
  hoyIso: string = getHoyMexicoIso()
): boolean {
  if (!fechaStr || !esFechaCalendarioValida(fechaStr)) return false;
  if (fechaStr > hoyIso) return false;
  return diasDisponibles.some((d) => d.fecha === fechaStr && d.totalDefectos > 0);
}

/**
 * Construye la cuadrícula de celdas para el calendario mensual (Lunes a Domingo):
 * - Deshabilita fechas futuras (`> hoyIso`).
 * - Deshabilita fechas que no tengan registros en `diasDisponibles`.
 * - Mantiene las fechas en formato `YYYY-MM-DD`.
 */
export function construirGrillaCalendarioMes(
  anio: number,
  mes: number,
  diasDisponibles: PeriodoDiaDisponible[],
  hoyIso: string = getHoyMexicoIso()
): CeldaCalendarioDia[] {
  const mapaDias = new Map<string, PeriodoDiaDisponible>();
  for (const d of diasDisponibles) {
    if (d.totalDefectos > 0) {
      mapaDias.set(d.fecha, d);
    }
  }

  const primerDiaUtc = new Date(Date.UTC(anio, mes - 1, 1));
  const ultimoDiaMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

  // Día de la semana Lunes=0 ... Domingo=6
  const diaSemanaInicio = (primerDiaUtc.getUTCDay() + 6) % 7;

  const celdas: CeldaCalendarioDia[] = [];

  // Días de relleno del mes anterior
  if (diaSemanaInicio > 0) {
    const ultimoDiaMesAnterior = new Date(Date.UTC(anio, mes - 1, 0));
    const anioAnt = ultimoDiaMesAnterior.getUTCFullYear();
    const mesAnt = ultimoDiaMesAnterior.getUTCMonth() + 1;
    const totalDiasAnt = ultimoDiaMesAnterior.getUTCDate();

    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const diaNum = totalDiasAnt - i;
      const fecha = `${anioAnt}-${String(mesAnt).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      celdas.push({
        fecha,
        dia: diaNum,
        mes: mesAnt,
        anio: anioAnt,
        esDelMesActual: false,
        esHoy: fecha === hoyIso,
        esFuturo: fecha > hoyIso,
        tieneRegistros: false,
        totalDefectos: 0,
        totalInspecciones: 0,
        seleccionable: false,
      });
    }
  }

  // Días del mes actual
  for (let diaNum = 1; diaNum <= ultimoDiaMes; diaNum++) {
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
    const infoDia = mapaDias.get(fecha);
    const esFuturo = fecha > hoyIso;
    const tieneRegistros = Boolean(infoDia && infoDia.totalDefectos > 0);

    celdas.push({
      fecha,
      dia: diaNum,
      mes,
      anio,
      esDelMesActual: true,
      esHoy: fecha === hoyIso,
      esFuturo,
      tieneRegistros,
      totalDefectos: infoDia?.totalDefectos ?? 0,
      totalInspecciones: infoDia?.totalInspecciones ?? 0,
      seleccionable: !esFuturo && tieneRegistros,
    });
  }

  // Relleno final para completar múltiplos de 7 columnas
  const resto = celdas.length % 7;
  if (resto > 0) {
    const faltantes = 7 - resto;
    const primerDiaMesSig = new Date(Date.UTC(anio, mes, 1));
    const anioSig = primerDiaMesSig.getUTCFullYear();
    const mesSig = primerDiaMesSig.getUTCMonth() + 1;

    for (let diaNum = 1; diaNum <= faltantes; diaNum++) {
      const fecha = `${anioSig}-${String(mesSig).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
      celdas.push({
        fecha,
        dia: diaNum,
        mes: mesSig,
        anio: anioSig,
        esDelMesActual: false,
        esHoy: fecha === hoyIso,
        esFuturo: fecha > hoyIso,
        tieneRegistros: false,
        totalDefectos: 0,
        totalInspecciones: 0,
        seleccionable: false,
      });
    }
  }

  return celdas;
}

/**
 * Lee y normaliza los filtros desde `URLSearchParams`.
 * - Nunca permite `periodo=todos` ni `periodo=rango`.
 * - Si llega una URL antigua con `periodo=todos`, la normaliza a un periodo acotado y seguro:
 *   - Si incluye `mes` y `anio`, usa `mes`.
 *   - Si incluye solo `anio`, usa `anio`.
 *   - En caso contrario, inicia en `hoy` con `esSeleccionInicial: true` (que prefiere hoy si hay registros o el periodo disponible más reciente).
 * - No lee ni conserva filtro de defectos.
 */
export function leerFiltrosDesdeSearchParams(searchParams: URLSearchParams): FiltrosRegistroState {
  const rawPeriodo = (searchParams.get('periodo') || '').toLowerCase().trim();
  const rawAnio = searchParams.get('anio');
  const rawAnioIso = searchParams.get('anioIso');
  const rawMes = searchParams.get('mes');
  const rawSemanaIso = searchParams.get('semanaIso');
  const rawSemana = searchParams.get('semana');
  const rawDia = searchParams.get('dia');

  const parsedSemanaCodigo = parsearSemanaIsoCodigo(rawSemanaIso) || parsearSemanaIsoCodigo(rawSemana);
  const anioNum = rawAnio && /^\d{4}$/.test(rawAnio) ? Number(rawAnio) : undefined;
  const anioIsoNum =
    parsedSemanaCodigo?.anioIso ??
    (rawAnioIso && /^\d{4}$/.test(rawAnioIso) ? Number(rawAnioIso) : anioNum);
  const semanaNum =
    parsedSemanaCodigo?.semana ??
    (rawSemana && /^\d{1,2}$/.test(rawSemana) && Number(rawSemana) >= 1 && Number(rawSemana) <= 53
      ? Number(rawSemana)
      : undefined);
  const mesNum =
    rawMes && /^\d{1,2}$/.test(rawMes) && Number(rawMes) >= 1 && Number(rawMes) <= 12
      ? Number(rawMes)
      : undefined;
  const diaValido = rawDia && esFechaCalendarioValida(rawDia) ? rawDia : undefined;

  let periodo: ModalidadPeriodoRegistro = 'hoy';
  let esSeleccionInicial = false;

  if (
    rawPeriodo === 'hoy' ||
    rawPeriodo === 'anio' ||
    rawPeriodo === 'mes' ||
    rawPeriodo === 'semana' ||
    rawPeriodo === 'dia'
  ) {
    periodo = rawPeriodo;
  } else if (rawPeriodo === 'todos') {
    // Normalizar URL antigua con `periodo=todos` a un período acotado y seguro
    if (mesNum && anioNum) {
      periodo = 'mes';
    } else if (anioNum) {
      periodo = 'anio';
    } else {
      periodo = 'hoy';
      esSeleccionInicial = true;
    }
  } else if (diaValido) {
    periodo = 'dia';
  } else if (semanaNum || parsedSemanaCodigo) {
    periodo = 'semana';
  } else if (mesNum) {
    periodo = 'mes';
  } else if (anioNum) {
    periodo = 'anio';
  } else {
    // Entrada limpia al módulo o modalidad obsoleta (`rango`, etc.):
    // iniciar en modo seguro acotado (`hoy` si tiene registros, o el más reciente disponible)
    periodo = 'hoy';
    esSeleccionInicial = true;
  }

  let anioFinal = anioNum;
  let mesFinal = mesNum;
  if (periodo === 'dia' && diaValido) {
    const [yStr, mStr] = diaValido.split('-');
    anioFinal = anioFinal ?? Number(yStr);
    mesFinal = mesFinal ?? Number(mStr);
  }

  const deptoRaw = searchParams.get('depto');
  const inspectorRaw = searchParams.get('inspector');
  const lineaRaw = searchParams.get('linea');
  const busquedaRaw = searchParams.get('q');
  const eliminadosRaw = searchParams.get('eliminados') === 'true';

  return {
    periodo,
    esSeleccionInicial,
    anio: anioFinal,
    anioIso: anioIsoNum,
    semana: semanaNum,
    semanaIsoCodigo:
      anioIsoNum && semanaNum ? formatearSemanaIsoCodigo(anioIsoNum, semanaNum) : undefined,
    mes: mesFinal,
    dia: diaValido,
    busqueda: busquedaRaw?.trim() || undefined,
    departamentoId: deptoRaw && /^\d+$/.test(deptoRaw) ? Number(deptoRaw) : undefined,
    inspectorId: inspectorRaw && /^\d+$/.test(inspectorRaw) ? Number(inspectorRaw) : undefined,
    lineaTexto: lineaRaw?.trim() || undefined,
    soloEliminados: eliminadosRaw,
  };
}

/**
 * Serializa `FiltrosRegistroState` hacia `URLSearchParams` manteniendo limpia la URL.
 * Nunca serializa `periodo=todos`, `periodo=rango` ni parámetros de defectos.
 */
export function serializarFiltrosASearchParams(filtros: FiltrosRegistroState): URLSearchParams {
  const params = new URLSearchParams();

  const periodoSeguro: ModalidadPeriodoRegistro =
    filtros.periodo === 'hoy' ||
    filtros.periodo === 'dia' ||
    filtros.periodo === 'semana' ||
    filtros.periodo === 'mes' ||
    filtros.periodo === 'anio'
      ? filtros.periodo
      : 'hoy';

  params.set('periodo', periodoSeguro);

  if (periodoSeguro === 'anio') {
    if (filtros.anio) params.set('anio', String(filtros.anio));
  } else if (periodoSeguro === 'mes') {
    if (filtros.anio) params.set('anio', String(filtros.anio));
    if (filtros.mes) params.set('mes', String(filtros.mes));
  } else if (periodoSeguro === 'semana') {
    const anioIso = filtros.anioIso || filtros.anio;
    if (anioIso && filtros.semana) {
      params.set('semanaIso', formatearSemanaIsoCodigo(anioIso, filtros.semana));
      params.set('anioIso', String(anioIso));
      params.set('semana', String(filtros.semana));
    } else if (anioIso) {
      params.set('anioIso', String(anioIso));
    }
  } else if (periodoSeguro === 'dia') {
    if (filtros.anio) params.set('anio', String(filtros.anio));
    if (filtros.mes) params.set('mes', String(filtros.mes));
    if (filtros.dia) params.set('dia', filtros.dia);
  }

  if (filtros.busqueda?.trim()) params.set('q', filtros.busqueda.trim());
  if (filtros.departamentoId) params.set('depto', String(filtros.departamentoId));
  if (filtros.inspectorId) params.set('inspector', String(filtros.inspectorId));
  if (filtros.lineaTexto?.trim()) params.set('linea', filtros.lineaTexto.trim());
  if (filtros.soloEliminados) params.set('eliminados', 'true');

  return params;
}

/**
 * Reconcilia los valores temporales seleccionados con los periodos reales devueltos por
 * `GET /api/v1/inspecciones/periodos-disponibles`:
 * - En la entrada inicial (`esSeleccionInicial = true`), prefiere el día actual (`hoy`) si existen
 *   registros hoy; de lo contrario selecciona automáticamente el periodo disponible más reciente.
 * - Garantiza que nunca quede seleccionado un año, mes, semana o día vacío o futuro.
 * - Garantiza que las semanas de años distintos nunca se mezclen.
 */
export function sincronizarFiltrosConPeriodosDisponibles(
  filtros: FiltrosRegistroState,
  periodos: PeriodosDisponiblesResponse | null
): FiltrosRegistroState {
  if (!periodos) return filtros;

  const hoy = periodos.rangoTotal.hoy || getHoyMexicoIso();
  const siguiente: FiltrosRegistroState = { ...filtros };

  if (siguiente.esSeleccionInicial) {
    siguiente.esSeleccionInicial = false;
    const tieneRegistrosHoy =
      periodos.rangoTotal.fechaMaxima === hoy ||
      periodos.dias.some((d) => d.fecha === hoy && d.totalDefectos > 0);

    if (tieneRegistrosHoy) {
      siguiente.periodo = 'hoy';
      return siguiente;
    }

    if (periodos.dias.length > 0) {
      const ultimoDia = periodos.dias[0]!;
      siguiente.periodo = 'dia';
      siguiente.anio = ultimoDia.anio;
      siguiente.mes = ultimoDia.mes;
      siguiente.dia = ultimoDia.fecha;
      return siguiente;
    }

    if (periodos.meses.length > 0) {
      const ultimoMes = periodos.meses[0]!;
      siguiente.periodo = 'mes';
      siguiente.anio = ultimoMes.anio;
      siguiente.mes = ultimoMes.mes;
      return siguiente;
    }

    if (periodos.anios.length > 0) {
      siguiente.periodo = 'anio';
      siguiente.anio = periodos.anios[0]!.anio;
      return siguiente;
    }

    siguiente.periodo = 'hoy';
    return siguiente;
  }

  if (siguiente.periodo === 'anio') {
    const existeAnio = periodos.anios.some((a) => a.anio === siguiente.anio);
    if (!existeAnio) {
      siguiente.anio = periodos.anioSeleccionado ?? periodos.anios[0]?.anio ?? undefined;
    }
  } else if (siguiente.periodo === 'mes') {
    const anioValido = periodos.anios.some((a) => a.anio === siguiente.anio)
      ? siguiente.anio!
      : (periodos.anioSeleccionado ?? periodos.anios[0]?.anio ?? undefined);
    siguiente.anio = anioValido;

    const mesesDelAnio = periodos.meses.filter((m) => !anioValido || m.anio === anioValido);
    // Si el usuario cambió de año y `periodos` aún pertenece al año anterior, conservar el año elegido
    // mientras el backend responde con los meses de ese año.
    if (
      anioValido !== undefined &&
      mesesDelAnio.length === 0 &&
      periodos.anioSeleccionado !== null &&
      periodos.anioSeleccionado !== anioValido
    ) {
      return siguiente;
    }

    const existeMes = mesesDelAnio.some((m) => m.mes === siguiente.mes);
    if (!existeMes) {
      siguiente.mes =
        (periodos.mesSeleccionado && mesesDelAnio.some((m) => m.mes === periodos.mesSeleccionado)
          ? periodos.mesSeleccionado
          : mesesDelAnio[0]?.mes) ?? undefined;
    }
  } else if (siguiente.periodo === 'semana') {
    const anioIsoActual = siguiente.anioIso || siguiente.anio;
    const existeAnioIso = periodos.aniosIso.some((a) => a.anioIso === anioIsoActual);
    const anioIsoValido = existeAnioIso
      ? anioIsoActual!
      : (periodos.anioIsoSeleccionado ?? periodos.aniosIso[0]?.anioIso ?? undefined);
    siguiente.anioIso = anioIsoValido;

    const semanasDelAnio = obtenerSemanasDeAnio(periodos.semanas, anioIsoValido);
    if (
      anioIsoValido !== undefined &&
      semanasDelAnio.length === 0 &&
      periodos.anioIsoSeleccionado !== null &&
      periodos.anioIsoSeleccionado !== anioIsoValido
    ) {
      siguiente.semana = undefined;
      siguiente.semanaIsoCodigo = undefined;
      return siguiente;
    }

    const semSeleccionada = semanasDelAnio.find((s) => s.semana === siguiente.semana);
    const semFinal = semSeleccionada ?? semanasDelAnio[0];
    if (semFinal) {
      siguiente.anioIso = semFinal.anioIso;
      siguiente.semana = semFinal.semana;
      siguiente.semanaIsoCodigo = semFinal.codigo;
    } else {
      siguiente.semana = undefined;
      siguiente.semanaIsoCodigo = undefined;
    }
  } else if (siguiente.periodo === 'dia') {
    const anioValido = periodos.anios.some((a) => a.anio === siguiente.anio)
      ? siguiente.anio!
      : (periodos.anioSeleccionado ?? periodos.anios[0]?.anio ?? undefined);
    siguiente.anio = anioValido;

    const mesesDelAnio = periodos.meses.filter((m) => !anioValido || m.anio === anioValido);
    // Si el usuario cambió de año en el calendario y `periodos` aún corresponde al año anterior,
    // conservar el nuevo año sin sobrescribirlo con días del año viejo.
    if (
      anioValido !== undefined &&
      mesesDelAnio.length === 0 &&
      periodos.anioSeleccionado !== null &&
      periodos.anioSeleccionado !== anioValido
    ) {
      if (siguiente.dia && !siguiente.dia.startsWith(`${anioValido}-`)) {
        siguiente.dia = undefined;
      }
      return siguiente;
    }

    const mesValido = mesesDelAnio.some((m) => m.mes === siguiente.mes)
      ? siguiente.mes!
      : (periodos.mesSeleccionado && mesesDelAnio.some((m) => m.mes === periodos.mesSeleccionado)
          ? periodos.mesSeleccionado
          : mesesDelAnio[0]?.mes ?? undefined);
    siguiente.mes = mesValido;

    const diasDelMesActivo = periodos.dias.filter(
      (d) =>
        (!anioValido || d.anio === anioValido) &&
        (!mesValido || d.mes === mesValido) &&
        d.fecha <= hoy &&
        d.totalDefectos > 0
    );

    // Si el usuario cambió de mes en el calendario y `periodos.dias` aún pertenece al mes anterior,
    // conservar el nuevo mes sin regresarlo al mes viejo mientras responde el backend.
    if (
      anioValido !== undefined &&
      mesValido !== undefined &&
      diasDelMesActivo.length === 0 &&
      (periodos.anioSeleccionado !== anioValido || periodos.mesSeleccionado !== mesValido)
    ) {
      const prefijoMes = `${anioValido}-${String(mesValido).padStart(2, '0')}-`;
      if (siguiente.dia && !siguiente.dia.startsWith(prefijoMes)) {
        siguiente.dia = undefined;
      }
      return siguiente;
    }

    const diaActualValido =
      siguiente.dia && diasDelMesActivo.some((d) => d.fecha === siguiente.dia);

    if (!diaActualValido) {
      const primerDiaDisponible = diasDelMesActivo[0];
      siguiente.dia = primerDiaDisponible?.fecha ?? undefined;
    }
  }

  return siguiente;
}

/**
 * Construye los parámetros para `GET /api/v1/inspecciones/periodos-disponibles`.
 * No envía nunca `defectoClave`.
 */
export function construirQueryPeriodosDisponibles(
  filtros: FiltrosRegistroState
): GetPeriodosDisponiblesQueryParams {
  return {
    anio: filtros.anio,
    anioIso: filtros.anioIso ?? filtros.anio,
    mes: filtros.mes,
    departamentoResponsableId: filtros.departamentoId,
    inspectorId: filtros.inspectorId,
    lineaTexto: filtros.lineaTexto || undefined,
    busqueda: filtros.busqueda || undefined,
    soloEliminados: filtros.soloEliminados === true,
  };
}

/**
 * Construye los parámetros exactos para `GET /api/v1/inspecciones` y `GET /api/v1/inspecciones/exportar`.
 * Garantiza que la tabla y la exportación utilicen exactamente la misma lógica de filtrado
 * y que nunca se envíe `periodo=todos`, `periodo=rango` ni `defectoClave`.
 */
export function construirQueryInspecciones(
  filtros: FiltrosRegistroState
): FiltrosInspeccionesQueryParams {
  const periodoSeguro: ModalidadPeriodoRegistro =
    filtros.periodo === 'hoy' ||
    filtros.periodo === 'dia' ||
    filtros.periodo === 'semana' ||
    filtros.periodo === 'mes' ||
    filtros.periodo === 'anio'
      ? filtros.periodo
      : 'hoy';

  const base: FiltrosInspeccionesQueryParams = {
    periodo: periodoSeguro,
    busqueda: filtros.busqueda?.trim() || undefined,
    departamentoResponsableId: filtros.departamentoId || undefined,
    lineaTexto: filtros.lineaTexto?.trim() || undefined,
    inspectorId: filtros.inspectorId || undefined,
    soloEliminados: filtros.soloEliminados === true,
  };

  switch (periodoSeguro) {
    case 'hoy':
      break;
    case 'anio':
      base.anio = filtros.anio;
      break;
    case 'mes':
      base.anio = filtros.anio;
      base.mes = filtros.mes;
      break;
    case 'semana':
      base.anioIso = filtros.anioIso ?? filtros.anio;
      base.semana = filtros.semana;
      break;
    case 'dia':
      base.dia = filtros.dia;
      break;
  }

  return base;
}

/**
 * Determina si una configuración de filtros tiene datos válidos para ejecutar la consulta o exportación.
 */
export function puedeEjecutarConsultaTemporal(
  filtros: FiltrosRegistroState,
  periodos?: PeriodosDisponiblesResponse | null,
  hoyIso: string = getHoyMexicoIso()
): { listo: boolean; sinRegistrosEnPeriodo?: boolean; errorValidacion?: string } {
  if (filtros.periodo === 'hoy') {
    return { listo: true };
  }

  if (periodos && periodos.anios.length === 0 && periodos.aniosIso.length === 0) {
    return { listo: false, sinRegistrosEnPeriodo: true };
  }

  if (filtros.periodo === 'anio') {
    if (!filtros.anio) return { listo: false, sinRegistrosEnPeriodo: true };
    return { listo: true };
  }

  if (filtros.periodo === 'mes') {
    if (!filtros.anio || !filtros.mes) return { listo: false, sinRegistrosEnPeriodo: true };
    return { listo: true };
  }

  if (filtros.periodo === 'semana') {
    const anioIso = filtros.anioIso || filtros.anio;
    if (!anioIso || !filtros.semana) {
      return { listo: false, sinRegistrosEnPeriodo: true };
    }
    if (periodos) {
      const semanasDelAnio = obtenerSemanasDeAnio(periodos.semanas, anioIso);
      if (semanasDelAnio.length > 0 && !semanasDelAnio.some((s) => s.semana === filtros.semana)) {
        return { listo: false, sinRegistrosEnPeriodo: true };
      }
    }
    return { listo: true };
  }

  if (filtros.periodo === 'dia') {
    if (!filtros.dia || !esFechaCalendarioValida(filtros.dia)) {
      return { listo: false, sinRegistrosEnPeriodo: true };
    }
    if (filtros.dia > hoyIso) {
      return {
        listo: false,
        errorValidacion: `No se permiten fechas futuras (máximo permitido: ${formatearFechaCortaIso(hoyIso)}).`,
      };
    }
    if (periodos && !esFechaSeleccionableEnCalendario(filtros.dia, periodos.dias, hoyIso)) {
      return { listo: false, sinRegistrosEnPeriodo: true };
    }
    return { listo: true };
  }

  return { listo: true };
}

/**
 * Genera una etiqueta legible para el usuario que describe el período activo (sin usar la palabra ISO).
 */
export function describirPeriodoActivo(
  filtros: FiltrosRegistroState,
  periodos?: PeriodosDisponiblesResponse | null
): string {
  const hoyStr = periodos?.rangoTotal.hoy || getHoyMexicoIso();

  switch (filtros.periodo) {
    case 'hoy':
      return `Hoy (${formatearFechaCortaIso(hoyStr)})`;
    case 'anio':
      return filtros.anio ? `Año ${formatearEtiquetaAnio(filtros.anio)}` : 'Por Año';
    case 'mes': {
      const mesObj = periodos?.meses.find(
        (m) => m.mes === filtros.mes && (!filtros.anio || m.anio === filtros.anio)
      );
      if (mesObj) return mesObj.label;
      if (filtros.mes && filtros.anio) return `Mes ${filtros.mes}/${filtros.anio}`;
      return 'Por Mes';
    }
    case 'semana': {
      const anioIso = filtros.anioIso || filtros.anio;
      const semanasDelAnio = obtenerSemanasDeAnio(periodos?.semanas, anioIso);
      const semObj = semanasDelAnio.find((s) => s.semana === filtros.semana);
      if (semObj) {
        return formatearEtiquetaSemana(semObj);
      }
      if (filtros.semana) {
        return `Semana ${String(filtros.semana).padStart(2, '0')}`;
      }
      return 'Por Semana';
    }
    case 'dia': {
      if (filtros.dia) return formatearFechaCortaIso(filtros.dia);
      const diaObj = periodos?.dias.find((d) => d.fecha === filtros.dia);
      if (diaObj) return formatearFechaCortaIso(diaObj.fecha);
      return 'Por Día';
    }
  }
}

/**
 * Calcula los totales estimados del periodo seleccionado a partir de `PeriodosDisponiblesResponse`.
 */
export function obtenerConteoPeriodoSeleccionado(
  filtros: FiltrosRegistroState,
  periodos?: PeriodosDisponiblesResponse | null
): { totalDefectos: number; totalInspecciones: number } | null {
  if (!periodos) return null;

  if (filtros.periodo === 'hoy') {
    const hoy = periodos.rangoTotal.hoy || getHoyMexicoIso();
    const dHoy = periodos.dias.find((x) => x.fecha === hoy);
    if (dHoy) {
      return { totalDefectos: dHoy.totalDefectos, totalInspecciones: dHoy.totalInspecciones };
    }
    return null;
  }
  if (filtros.periodo === 'anio') {
    const a = periodos.anios.find((x) => x.anio === filtros.anio);
    return a
      ? { totalDefectos: a.totalDefectos, totalInspecciones: a.totalInspecciones }
      : { totalDefectos: 0, totalInspecciones: 0 };
  }
  if (filtros.periodo === 'mes') {
    const m = periodos.meses.find(
      (x) => x.mes === filtros.mes && (!filtros.anio || x.anio === filtros.anio)
    );
    return m
      ? { totalDefectos: m.totalDefectos, totalInspecciones: m.totalInspecciones }
      : { totalDefectos: 0, totalInspecciones: 0 };
  }
  if (filtros.periodo === 'semana') {
    const anioIso = filtros.anioIso || filtros.anio;
    const s = obtenerSemanasDeAnio(periodos.semanas, anioIso).find(
      (x) => x.semana === filtros.semana
    );
    return s
      ? { totalDefectos: s.totalDefectos, totalInspecciones: s.totalInspecciones }
      : { totalDefectos: 0, totalInspecciones: 0 };
  }
  if (filtros.periodo === 'dia') {
    const d = periodos.dias.find((x) => x.fecha === filtros.dia);
    return d
      ? { totalDefectos: d.totalDefectos, totalInspecciones: d.totalInspecciones }
      : { totalDefectos: 0, totalInspecciones: 0 };
  }

  return null;
}

/**
 * Indica si existen filtros adicionales aplicados que el usuario pueda restablecer con "Limpiar filtros".
 */
export function tieneFiltrosActivos(filtros: FiltrosRegistroState): boolean {
  return Boolean(
    filtros.busqueda ||
      filtros.departamentoId ||
      filtros.inspectorId ||
      filtros.lineaTexto ||
      filtros.soloEliminados
  );
}
