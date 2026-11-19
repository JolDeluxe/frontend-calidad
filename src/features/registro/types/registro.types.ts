export * from '../../inspecciones/types/inspecciones.types';

export type ModalidadPeriodoRegistro =
  | 'hoy'
  | 'dia'
  | 'semana'
  | 'mes'
  | 'anio'
  | 'rango';

export interface FiltrosRegistroState {
  periodo: ModalidadPeriodoRegistro;
  /**
   * Indica que el período provino de la entrada inicial sin modalidad explícita
   * (o de una URL antigua con `periodo=todos`), por lo que debe
   * preferir `hoy` si existen registros hoy o el período disponible más reciente.
   */
  esSeleccionInicial?: boolean;
  anio?: number;
  anioIso?: number;
  semana?: number;
  semanaIsoCodigo?: string;
  mes?: number;
  dia?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  departamentoId?: number;
  departamentosIds?: number[];
  departamentoResponsableId?: number;
  departamentoAuditoriaId?: number;
  lineaTexto?: string;
  inspectorId?: number;
  soloEliminados?: boolean;
}

export interface CeldaCalendarioDia {
  fecha: string;
  dia: number;
  mes: number;
  anio: number;
  esDelMesActual: boolean;
  esHoy: boolean;
  esFuturo: boolean;
  tieneRegistros: boolean;
  totalDefectos: number;
  totalInspecciones: number;
  seleccionable: boolean;
}
