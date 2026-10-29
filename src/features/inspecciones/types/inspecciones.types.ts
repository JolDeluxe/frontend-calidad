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
  periodo: 'hoy' | 'ultimos' | 'todos';
  page: number;
  limit: number;
  totalPages: number;
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
