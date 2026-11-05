import type { InspeccionFilaResponse } from '../types/registro.types';

/**
 * Umbral a partir del cual se muestra una advertencia preventiva no bloqueante
 * al usuario antes de generar un documento PDF en el navegador.
 */
export const UMBRAL_ADVERTENCIA_PDF = 2500;

export interface ExportFiltrosConfig {
  periodoNombre: string;
  departamentoNombre?: string;
  lineaNombre?: string;
  inspectorNombre?: string;
  busqueda?: string;
  soloEliminados?: boolean;
  totalDefectos?: number;
  totalInspecciones?: number;
  totalParesDefectuosos?: number;
}

export interface ResumenExportacion {
  totalDefectos: number;
  totalInspecciones: number;
  totalParesDefectuosos: number;
}

export interface ResultadoExportacionReporte extends ResumenExportacion {
  ok: boolean;
  error?: string;
}

/**
 * Deduplica filas de exportación por ID preservando el orden original.
 */
export function deduplicarFilasExportacion(
  items: InspeccionFilaResponse[]
): InspeccionFilaResponse[] {
  const vistos = new Set<number | string>();
  const resultado: InspeccionFilaResponse[] = [];
  for (const item of items) {
    const clave = item.id;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(item);
  }
  return resultado;
}

/**
 * Calcula los totales reales de defectos (filas), inspecciones únicas (lotes)
 * y pares defectuosos sobre el conjunto deduplicado.
 */
export function calcularResumenExportacion(
  items: InspeccionFilaResponse[]
): ResumenExportacion {
  const unicos = deduplicarFilasExportacion(items);
  const inspeccionesSet = new Set<number>();
  let totalParesDefectuosos = 0;

  for (const item of unicos) {
    if (typeof item.inspeccionId === 'number') {
      inspeccionesSet.add(item.inspeccionId);
    }
    totalParesDefectuosos += Number(item.paresDefectuosos || 0);
  }

  return {
    totalDefectos: unicos.length,
    totalInspecciones: inspeccionesSet.size,
    totalParesDefectuosos,
  };
}

/**
 * Formatea una fecha ISO a DD/MM/AAAA en la zona horaria operativa America/Mexico_City.
 */
export function formatearFechaReporte(fechaIso: string): string {
  try {
    const d = new Date(fechaIso);
    if (Number.isNaN(d.getTime())) return fechaIso;
    return d.toLocaleDateString('es-MX', {
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
 * Escapa valores para CSV/Excel compatible.
 */
function escaparCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '""';
  const str = String(valor).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Escapa texto para inserción segura en HTML de impresión PDF.
 */
function escaparHtml(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Construye los bloques (chunks) de texto CSV con BOM UTF-8 sin concatenar
 * un único string gigante en memoria para soportar exportaciones masivas.
 */
export function construirBloquesCsvExportacion(
  items: InspeccionFilaResponse[],
  chunkSize = 2000
): string[] {
  const filasUnicas = deduplicarFilasExportacion(items);
  const headers = [
    'No',
    'Departamento Auditado',
    'Departamento Responsable',
    'Fecha',
    'Lista',
    'Lote',
    'Línea',
    'Modelo',
    'Descripción Lote',
    'Clave Defecto',
    'Nombre Defecto',
    'Clasificación',
    'Pares Defectuosos',
    'Inspector',
  ];

  const chunks: string[] = [
    '\uFEFF' + headers.map(escaparCsv).join(',') + '\r\n',
  ];

  for (let i = 0; i < filasUnicas.length; i += chunkSize) {
    const slice = filasUnicas.slice(i, i + chunkSize);
    const lineas = slice.map((item, idx) =>
      [
        i + idx + 1,
        escaparCsv(item.departamentoAuditoria),
        escaparCsv(item.defDepto),
        escaparCsv(formatearFechaReporte(item.fecha)),
        escaparCsv(item.lista),
        escaparCsv(item.lote),
        escaparCsv(item.linea),
        escaparCsv(item.modelo),
        escaparCsv(item.descripcion || ''),
        item.defectoClave,
        escaparCsv(item.defectoNombre),
        escaparCsv(item.clasificacion),
        item.paresDefectuosos,
        escaparCsv(item.usuario),
      ].join(',')
    );
    chunks.push(lineas.join('\r\n') + (i + chunkSize < filasUnicas.length ? '\r\n' : ''));
  }

  return chunks;
}

/**
 * Exporta los datos a formato Excel (.csv compatible con Excel con BOM UTF-8)
 * empleando construcción por bloques para evitar picos de memoria y sin truncar.
 */
export function exportarRegistrosAExcel(
  items: InspeccionFilaResponse[],
  _filtros?: ExportFiltrosConfig,
  nombreBase = 'reporte_defectos'
): ResultadoExportacionReporte {
  const filasUnicas = deduplicarFilasExportacion(items);
  const resumen = calcularResumenExportacion(filasUnicas);
  const chunks = construirBloquesCsvExportacion(filasUnicas);

  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    const blob = new Blob(chunks, { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    link.setAttribute('download', `${nombreBase}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    ok: true,
    ...resumen,
  };
}

/**
 * Construye el documento HTML imprimible del reporte PDF distinguiendo claramente
 * entre defectos (filas), inspecciones (lotes únicos) y pares defectuosos.
 */
export function construirHtmlReportePdf(
  items: InspeccionFilaResponse[],
  filtros: ExportFiltrosConfig
): string {
  const filasUnicas = deduplicarFilasExportacion(items);
  const resumen = calcularResumenExportacion(filasUnicas);

  const totalDefectos = filtros.totalDefectos ?? resumen.totalDefectos;
  const totalInspecciones = filtros.totalInspecciones ?? resumen.totalInspecciones;
  const totalPares = filtros.totalParesDefectuosos ?? resumen.totalParesDefectuosos;

  const ahora = new Date();
  const fechaGeneracion = ahora.toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
  });
  const horaGeneracion = ahora.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
  });

  const filasHtml = filasUnicas
    .map(
      (item, idx) => `
    <tr>
      <td style="text-align: center; font-family: monospace; font-size: 10px; color: #64748b;">${idx + 1}</td>
      <td style="font-weight: bold; color: #0f172a; text-transform: uppercase;">${escaparHtml(item.defDepto)}</td>
      <td style="white-space: nowrap; font-family: monospace;">${escaparHtml(formatearFechaReporte(item.fecha))}</td>
      <td style="font-weight: 600;">${escaparHtml(item.lista)}</td>
      <td style="font-family: monospace; font-weight: 800; color: #0284c7;">${escaparHtml(item.lote)}</td>
      <td style="text-align: center;"><span style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-weight: 600;">${escaparHtml(item.linea)}</span></td>
      <td style="font-weight: 600;">${escaparHtml(item.modelo)}</td>
      <td style="color: #64748b; font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escaparHtml(item.descripcion || '')}</td>
      <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0284c7;">${escaparHtml(item.defectoClave)}</td>
      <td style="font-weight: 600; color: #1e293b;">${escaparHtml(item.defectoNombre)}</td>
      <td style="text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 700; ${
          item.clasificacion === 'CRITICO'
            ? 'background: #ffe4e6; color: #be123c;'
            : item.clasificacion === 'MAYOR'
            ? 'background: #ffedd5; color: #c2410c;'
            : 'background: #fef9c3; color: #a16207;'
        }">
          ${escaparHtml(item.clasificacion)}
        </span>
      </td>
      <td style="text-align: center; font-weight: bold;">${Number(item.paresDefectuosos || 0)}</td>
      <td style="color: #475569; font-size: 10px; white-space: nowrap;">${escaparHtml(item.usuario)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte de Defectos de Calidad</title>
      <style>
        @page {
          size: letter landscape;
          margin: 10mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 8px;
          color: #0f172a;
          background: #fff;
          font-size: 11px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .title {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 10.5px;
        }
        .meta-item strong {
          color: #475569;
          text-transform: uppercase;
          font-size: 9.5px;
          display: block;
        }
        .meta-item span {
          font-weight: 700;
          color: #0f172a;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        thead {
          display: table-header-group;
        }
        th {
          background-color: #f1f5f9;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
          padding: 6px 4px;
          border-bottom: 1px solid #cbd5e1;
          text-align: left;
        }
        td {
          padding: 5px 4px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        tr:nth-child(even) td {
          background-color: #fafbfc;
        }
        .footer-summary {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #334155;
          font-size: 11px;
        }
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">Reporte Histórico de Defectos${filtros.soloEliminados ? ' (Papelera)' : ''}</h1>
          <div class="subtitle">Sistema de Control de Calidad y Trazabilidad Operativa</div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div>Generado: ${escaparHtml(fechaGeneracion)} ${escaparHtml(horaGeneracion)}</div>
          <div>Defectos: <strong>${totalDefectos}</strong> · Inspecciones (lotes): <strong>${totalInspecciones}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Período:</strong>
          <span>${escaparHtml(filtros.periodoNombre)}</span>
        </div>
        <div class="meta-item">
          <strong>Departamento:</strong>
          <span>${escaparHtml(filtros.departamentoNombre || 'Todos los Departamentos')}</span>
        </div>
        <div class="meta-item">
          <strong>Línea:</strong>
          <span>${escaparHtml(filtros.lineaNombre || 'Todas las Líneas')}</span>
        </div>
        <div class="meta-item">
          <strong>Inspector:</strong>
          <span>${escaparHtml(filtros.inspectorNombre || 'Todos los Inspectores')}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">No</th>
            <th style="width: 70px;">Depto</th>
            <th style="width: 65px;">Fecha</th>
            <th style="width: 50px;">Lista</th>
            <th style="width: 55px;">Lote</th>
            <th style="width: 45px; text-align: center;">Línea</th>
            <th style="width: 75px;">Modelo</th>
            <th>Descripción</th>
            <th style="width: 40px; text-align: center;">Clave</th>
            <th style="min-width: 140px;">Defecto</th>
            <th style="width: 60px; text-align: center;">Clasif.</th>
            <th style="width: 35px; text-align: center;">Prs</th>
            <th style="width: 80px;">Inspector</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
      </table>

      <div class="footer-summary">
        <div>Total de Defectos: <strong>${totalDefectos}</strong></div>
        <div>Total de Inspecciones (Lotes): <strong>${totalInspecciones}</strong></div>
        <div>Total Pares Defectuosos: <strong>${totalPares}</strong></div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Exporta los datos a formato PDF mediante ventana de impresión formateada profesionalmente.
 * Nunca utiliza alert() ni confirm() del navegador.
 */
export function exportarRegistrosAPdf(
  items: InspeccionFilaResponse[],
  filtros: ExportFiltrosConfig
): ResultadoExportacionReporte {
  const filasUnicas = deduplicarFilasExportacion(items);
  const resumen = calcularResumenExportacion(filasUnicas);

  if (typeof window === 'undefined') {
    return {
      ok: false,
      error: 'Entorno sin ventana de impresión disponible.',
      ...resumen,
    };
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return {
      ok: false,
      error:
        'Por favor permita las ventanas emergentes (pop-ups) en su navegador para generar el PDF de impresión.',
      ...resumen,
    };
  }

  const html = construirHtmlReportePdf(filasUnicas, filtros);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  return {
    ok: true,
    ...resumen,
  };
}
