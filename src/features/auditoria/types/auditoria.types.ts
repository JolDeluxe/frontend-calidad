export interface EventoAuditoria {
  id: number;
  usuarioId?: number | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  departamentoId?: number | null;
  terminalId?: number | null;
  motivo?: string | null;
  detalles?: {
    modulo?: string;
    descripcion?: string;
    resultado?: 'EXITOSO' | 'RECHAZADO' | 'FALLIDO';
    motivo?: string;
    origen?: string;
    camposModificados?: string[];
    valoresAnteriores?: Record<string, unknown> | null;
    valoresPosteriores?: Record<string, unknown> | null;
    metadatos?: Record<string, unknown>;
    actorHistorico?: string;
    rolHistorico?: string;
    requestId?: string;
    correlationId?: string;
    metodoHttp?: string;
    rutaHttp?: string;
  };
  ipOrigen?: string | null;
  agenteUsuario?: string | null;
  hashIntegridad?: string | null;
  fecha: string;
  usuario?: {
    id: number;
    usuario: string;
    nombre: string;
  } | null;
  departamento?: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
  terminal?: {
    id: number;
    nombre: string;
  } | null;
}

export interface ConsultaEventosAuditoria {
  page?: number;
  limit?: number;
  accion?: string;
  usuarioId?: number;
  entidad?: string;
  entidadId?: string;
  departamentoId?: number;
  terminalId?: number;
  resultado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface RespuestaEventosAuditoria {
  items: EventoAuditoria[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VerificacionIntegridad {
  cadenaValida: boolean;
  eventosVerificados: number;
  primerAlteradoId: number | null;
}

export interface EntradaLogTecnico {
  timestamp: string;
  level: 'fatal' | 'error' | 'warn' | 'info' | 'debug';
  servicio: string;
  entorno: string;
  mensaje: string;
  codigoError?: string;
  tipoExcepcion?: string;
  stackTrace?: string;
  metodoHttp?: string;
  rutaHttp?: string;
  codigoRespuesta?: number;
  duracionMs?: number;
  requestId?: string;
  correlationId?: string;
  usuarioId?: number;
  modulo?: string;
  contexto?: Record<string, unknown>;
}

export interface ConsultaLogsTecnicos {
  page?: number;
  limit?: number;
  nivel?: string;
  texto?: string;
  modulo?: string;
  requestId?: string;
  fechaDesde?: string;
}

export interface RespuestaLogsTecnicos {
  items: EntradaLogTecnico[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ArchivoPm2 {
  nombre: string;
  ruta: string;
  tamanoBytes: number;
  fechaModificacion: string;
}

export interface ContenidoPm2 {
  lineas: string[];
  totalLineasLeidas: number;
  archivo: string;
  tamanoBytes: number;
}

export interface EstadoSaludSistema {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'error';
    latencyMs: number;
    error?: string;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  environment: string;
  platform: string;
  bunVersion: string;
}

export interface DiagnosticoIaPayload {
  requestId?: string;
  correlationId?: string;
  codigoError?: string;
  ventanaMinutos?: number;
}

export interface RespuestaDiagnosticoIa {
  package: Record<string, unknown>;
  markdown: string;
}

// Aliases retrocompatibles para tipos durante migración interna
export type AuditEventItem = EventoAuditoria;
export type AuditEventsQuery = ConsultaEventosAuditoria;
export type AuditEventsResponse = RespuestaEventosAuditoria;
export type IntegrityVerificationResponse = VerificacionIntegridad;
export type TechnicalLogEntry = EntradaLogTecnico;
export type TechnicalLogsQuery = ConsultaLogsTecnicos;
export type TechnicalLogsResponse = RespuestaLogsTecnicos;
export type Pm2FileItem = ArchivoPm2;
export type Pm2ContentResponse = ContenidoPm2;
export type SystemHealthData = EstadoSaludSistema;
export type AiDiagnosticsPayload = DiagnosticoIaPayload;
export type AiDiagnosticsResponse = RespuestaDiagnosticoIa;
