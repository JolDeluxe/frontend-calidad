export interface LineaOperativa {
  id: number;
  codigo: string;
  nombre: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface ProduccionLote {
  id: number;
  listaLote: string;
  lista: string;
  lote: string;
  idProducto: string;
  modelo: string;
  cantidad: number;
  descripcion: string | null;
  cliente: string;
  horma: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface DefectoItemStaging {
  idTemporal: string;
  defectoId: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  departamentoResponsableId: number;
  departamentoResponsableNombre: string;
  paresDefectuosos: number;
  notas?: string;
}

export type ModalidadPeriodoInspeccion =
  | 'hoy'
  | 'ultimos'
  | 'todos'
  | 'anio'
  | 'mes'
  | 'semana'
  | 'dia'
  | 'rango';

export interface InspeccionFilaResponse {
  id: number;
  inspeccionId: number;
  folio: string;
  departamentoAuditoria: string;
  departamentoAuditoriaCodigo: string;
  fecha: string;
  lista: string;
  lote: string;
  linea: string;
  modelo: string;
  descripcion: string | null;
  horma: string;
  cliente: string;
  cantidadLote: number;
  defDepto: string;
  defectoId: number;
  defectoClave: number;
  defectoNombre: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  paresDefectuosos: number;
  notas: string | null;
  inspectorId?: number;
  usuario: string;
  terminal?: string | null;
  terminalId?: number | null;
  eliminadoEn?: string | null;
  eliminadoPor?: number | null;
  eliminadoPorNombre?: string | null;
  eliminadoMotivo?: string | null;
  esLocalPendiente?: boolean;
  idLocalCliente?: string;
  estadoColaLocal?:
    | 'PENDIENTE'
    | 'SINCRONIZANDO'
    | 'ERROR_REINTENTABLE'
    | 'REQUIERE_REVISION'
    | 'RECHAZADA';
  ultimoErrorSync?: string | null;
  esContingencia?: boolean;
  motivoContingencia?: string | null;
}

export interface GetFilasInspeccionResponse {
  items: InspeccionFilaResponse[];
  total: number;
  totalDefectos?: number;
  totalInspecciones?: number;
  periodo: ModalidadPeriodoInspeccion;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExportarFilasInspeccionResponse {
  items: InspeccionFilaResponse[];
  total: number;
  totalDefectos: number;
  totalInspecciones: number;
  totalParesDefectuosos: number;
  periodo: ModalidadPeriodoInspeccion;
}

export interface PeriodoAnioDisponible {
  anio: number;
  totalDefectos: number;
  totalInspecciones: number;
}

export interface PeriodoAnioIsoDisponible {
  anioIso: number;
  totalDefectos: number;
  totalInspecciones: number;
}

export interface PeriodoMesDisponible {
  mes: number;
  anio: number;
  nombre: string;
  label: string;
  totalDefectos: number;
  totalInspecciones: number;
}

export interface PeriodoSemanaIsoDisponible {
  anioIso: number;
  semana: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  label: string;
  etiqueta?: string;
  totalDefectos: number;
  totalInspecciones: number;
}

export interface PeriodoDiaDisponible {
  fecha: string;
  anio: number;
  mes: number;
  dia: number;
  diaSemana: string;
  label: string;
  totalDefectos: number;
  totalInspecciones: number;
}

export interface PeriodosDisponiblesResponse {
  anios: PeriodoAnioDisponible[];
  aniosIso: PeriodoAnioIsoDisponible[];
  anioSeleccionado: number | null;
  anioIsoSeleccionado: number | null;
  mesSeleccionado: number | null;
  meses: PeriodoMesDisponible[];
  semanas: PeriodoSemanaIsoDisponible[];
  dias: PeriodoDiaDisponible[];
  rangoTotal: {
    fechaMinima: string | null;
    fechaMaxima: string | null;
    hoy: string;
  };
}

export interface InspectorActivoItem {
  id: number;
  usuario: string;
  nombre: string;
  departamentosIds?: number[];
  departamentos?: Array<{
    id: number;
    codigo: string;
    nombre: string;
  }>;
  rol?: {
    id: number;
    codigo: string;
    nombre: string;
  };
}

export interface DefectoCatalogoFiltroItem {
  id: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  activo?: boolean;
}

export interface FiltrosInspeccionesQueryParams {
  periodo?: ModalidadPeriodoInspeccion;
  dia?: string;
  semana?: number;
  anioIso?: number;
  mes?: number;
  anio?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  lote?: string;
  defectoClave?: number;
  departamentoId?: number;
  departamentoAuditoriaId?: number;
  departamentoResponsableId?: number;
  clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR';
  lineaId?: number;
  lineaTexto?: string;
  inspectorId?: number;
  terminalId?: number;
  soloEliminados?: boolean;
}

export interface GetFilasInspeccionQueryParams extends FiltrosInspeccionesQueryParams {
  page?: number;
  limit?: number;
}

export interface GetPeriodosDisponiblesQueryParams {
  anio?: number;
  anioIso?: number;
  mes?: number;
  departamentoId?: number;
  departamentoAuditoriaId?: number;
  departamentoResponsableId?: number;
  inspectorId?: number;
  lineaId?: number;
  lineaTexto?: string;
  defectoClave?: number;
  clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR';
  lote?: string;
  busqueda?: string;
  terminalId?: number;
  soloEliminados?: boolean;
}

export interface CreateInspeccionPayload {
  lote: string;
  lineaId?: number | null;
  lineaTexto?: string | null;
  horma?: string | null;
  notas?: string | null;
  detalles: Array<{
    defectoId: number;
    defectoClave?: number;
    defectoNombre?: string;
    clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR';
    defDeptoId: number;
    defDeptoNombre?: string;
    paresDefectuosos: number;
    notas?: string;
  }>;
}
