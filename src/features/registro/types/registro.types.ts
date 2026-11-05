export * from '@/features/inspecciones/types/inspecciones.types';

export type ModalidadPeriodoRegistro =
  | 'hoy'
  | 'dia'
  | 'semana'
  | 'mes'
  | 'anio';

export interface FiltrosRegistroState {
  periodo: ModalidadPeriodoRegistro;
  /**
   * Indica que el período provino de la entrada inicial sin modalidad explícita
   * (o de una URL antigua con `periodo=todos` / `periodo=rango`), por lo que debe
   * preferir `hoy` si existen registros hoy o el período disponible más reciente.
   */
  esSeleccionInicial?: boolean;
  anio?: number;
  anioIso?: number;
  semana?: number;
  semanaIsoCodigo?: string;
  mes?: number;
  dia?: string;
  busqueda?: string;
  departamentoId?: number;
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
