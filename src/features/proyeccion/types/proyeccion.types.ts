export interface ResumenDeptoProyeccion {
  id: number;
  codigo: string;
  nombre: string;
  paresDefecto: number;
  produccionLograda: number;
  porcentajeDefecto: number;
}

export interface ResumenGeneralProyeccionResponse {
  semana: number;
  anio: number;
  fechaDesde: string;
  fechaHasta: string;
  fechaActualizacion: string;
  totales: {
    paresDefecto: number;
    produccionLograda: number;
    porcentajeDefecto: number;
  };
  departamentos: ResumenDeptoProyeccion[];
}

export interface TopDefectoItem {
  clave: number;
  defecto: string;
  clasificacion: string;
  totalPares: number;
}

export interface TopDefectoApiladoItem {
  clave: number;
  defecto: string;
  totalPares: number;
  desglosePorArea: Record<string, number>;
}

export interface ReporteDeptoItem {
  departamentoId: number;
  codigo: string;
  nombre: string;
  kpis: {
    semana: number;
    anio: number;
    defectosTotales: number;
    produccionLograda: number;
    indiceDefectosPct: number;
  };
  desgloseCaptura: Array<{
    departamentoAuditorId: number;
    departamentoAuditor: string;
    cantidad: number;
    porcentaje: number;
  }>;
  eficienciaInspector: {
    defectosEnOtrasAreas: number;
    devoluciones: number;
    porcentajeEficiencia: number;
  };
  topDefectos: TopDefectoItem[];
  topDefectosApilados: TopDefectoApiladoItem[];
}

export interface ReporteSemanalProyeccionResponse {
  semana: number;
  anio: number;
  fechaDesde: string;
  fechaHasta: string;
  departamentos: ReporteDeptoItem[];
}
