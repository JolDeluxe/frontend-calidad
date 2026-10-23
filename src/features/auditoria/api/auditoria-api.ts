export * from '../types/auditoria.types';
import { httpClient } from '@/lib/api/http-client';
import type {
  ConsultaEventosAuditoria,
  RespuestaEventosAuditoria,
  VerificacionIntegridad,
  ConsultaLogsTecnicos,
  RespuestaLogsTecnicos,
  ArchivoPm2,
  ContenidoPm2,
  EstadoSaludSistema,
  DiagnosticoIaPayload,
  RespuestaDiagnosticoIa,
} from '../types/auditoria.types';

export const auditoriaApi = {
  getEventos: (params?: ConsultaEventosAuditoria) =>
    httpClient.get<{ success: boolean; data: RespuestaEventosAuditoria }>('/audit/events', {
      params: params as Record<string, unknown>,
    }),

  verificarIntegridad: () =>
    httpClient.get<{ success: boolean; data: VerificacionIntegridad }>('/audit/integrity'),

  getLogsTecnicos: (params?: ConsultaLogsTecnicos) =>
    httpClient.get<{ success: boolean; data: RespuestaLogsTecnicos }>('/audit/logs/technical', {
      params: params as Record<string, unknown>,
    }),

  getArchivosPm2: () =>
    httpClient.get<{ success: boolean; data: { files: ArchivoPm2[] } }>('/audit/logs/pm2-files'),

  getContenidoPm2: (fileName: string, lines = 150, filter?: string, reverse = true) =>
    httpClient.get<{ success: boolean; data: ContenidoPm2 }>('/audit/logs/pm2-content', {
      params: { fileName, lines, filter, reverse },
    }),

  getEstadoSalud: () =>
    httpClient.get<{ success: boolean; data: EstadoSaludSistema }>('/audit/health'),

  generarDiagnosticoIa: (body?: DiagnosticoIaPayload) =>
    httpClient.post<{ success: boolean; data: RespuestaDiagnosticoIa }>('/audit/diagnostics/ai', body),

  // Aliases para evitar roturas
  getEvents: (params?: ConsultaEventosAuditoria) =>
    httpClient.get<{ success: boolean; data: RespuestaEventosAuditoria }>('/audit/events', {
      params: params as Record<string, unknown>,
    }),
  verifyIntegrity: () =>
    httpClient.get<{ success: boolean; data: VerificacionIntegridad }>('/audit/integrity'),
  getTechnicalLogs: (params?: ConsultaLogsTecnicos) =>
    httpClient.get<{ success: boolean; data: RespuestaLogsTecnicos }>('/audit/logs/technical', {
      params: params as Record<string, unknown>,
    }),
  getPm2Files: () =>
    httpClient.get<{ success: boolean; data: { files: ArchivoPm2[] } }>('/audit/logs/pm2-files'),
  getPm2Content: (fileName: string, lines = 150, filter?: string, reverse = true) =>
    httpClient.get<{ success: boolean; data: ContenidoPm2 }>('/audit/logs/pm2-content', {
      params: { fileName, lines, filter, reverse },
    }),
  getHealth: () =>
    httpClient.get<{ success: boolean; data: EstadoSaludSistema }>('/audit/health'),
  generateAiDiagnostics: (body?: DiagnosticoIaPayload) =>
    httpClient.post<{ success: boolean; data: RespuestaDiagnosticoIa }>('/audit/diagnostics/ai', body),
};

export const auditApi = auditoriaApi;
