import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  ResumenGeneralProyeccionResponse,
  ReporteSemanalProyeccionResponse,
} from '../types/proyeccion.types';

export const proyeccionApi = {
  getResumenGeneral: async (semana?: number, anio?: number): Promise<ResumenGeneralProyeccionResponse> => {
    const params = new URLSearchParams();
    if (semana) params.set('semana', String(semana));
    if (anio) params.set('anio', String(anio));

    const url = `/proyeccion/resumen-general${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await httpClient.get<ApiResponse<ResumenGeneralProyeccionResponse>>(url);
    if (!res.data) throw new Error('No se recibieron datos del resumen general');
    return res.data;
  },

  getReporteSemanal: async (semana?: number, anio?: number): Promise<ReporteSemanalProyeccionResponse> => {
    const params = new URLSearchParams();
    if (semana) params.set('semana', String(semana));
    if (anio) params.set('anio', String(anio));

    const url = `/proyeccion/reporte-semanal${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await httpClient.get<ApiResponse<ReporteSemanalProyeccionResponse>>(url);
    if (!res.data) throw new Error('No se recibieron datos del reporte semanal');
    return res.data;
  },
};
