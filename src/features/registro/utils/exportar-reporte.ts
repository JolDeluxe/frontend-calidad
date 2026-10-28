import type { InspeccionFilaResponse } from '../types/registro.types';

export interface ExportFiltrosConfig {
  periodoNombre: string;
  departamentoNombre?: string;
  lineaNombre?: string;
  inspectorNombre?: string;
}

/**
 * Formatea una fecha ISO a DD/MM/AAAA
 */
function formatearFecha(fechaIso: string): string {
  try {
    const d = new Date(fechaIso);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fechaIso;
  }
}

/**
 * Escapa valores para CSV/Excel compatible
 */
function escaparCsv(valor: any): string {
  if (valor === null || valor === undefined) return '""';
  const str = String(valor).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporta los datos a formato Excel (.csv compatible con Excel con BOM UTF-8)
 * Estructura tabulada directa y limpia sin bloques desordenados.
 */
export function exportarRegistrosAExcel(
  items: InspeccionFilaResponse[],
  _filtros?: ExportFiltrosConfig,
  nombreBase = 'reporte_defectos'
): void {
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

  const filas = items.map((item, idx) => [
    idx + 1,
    escaparCsv(item.departamentoAuditoria),
    escaparCsv(item.defDepto),
    escaparCsv(formatearFecha(item.fecha)),
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
  ]);

  const csvContent =
    '\uFEFF' + // BOM UTF-8 para apertura directa en Excel con caracteres especiales
    headers.map(escaparCsv).join(',') +
    '\r\n' +
    filas.map((f) => f.join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${nombreBase}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta los datos a formato PDF mediante ventana de impresión formateada profesionalmente
 */
export function exportarRegistrosAPdf(
  items: InspeccionFilaResponse[],
  filtros: ExportFiltrosConfig
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permita las ventanas emergentes (pop-ups) para generar el PDF de impresión.');
    return;
  }

  const filasHtml = items
    .map(
      (item, idx) => `
    <tr>
      <td style="text-align: center; font-family: monospace; font-size: 10px; color: #64748b;">${idx + 1}</td>
      <td style="font-weight: bold; color: #0f172a; text-transform: uppercase;">${item.defDepto}</td>
      <td style="white-space: nowrap; font-family: monospace;">${formatearFecha(item.fecha)}</td>
      <td style="font-weight: 600;">${item.lista}</td>
      <td style="font-family: monospace; font-weight: 800; color: #0284c7;">${item.lote}</td>
      <td style="text-align: center;"><span style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-weight: 600;">${item.linea}</span></td>
      <td style="font-weight: 600;">${item.modelo}</td>
      <td style="color: #64748b; font-size: 10px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.descripcion || ''}</td>
      <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0284c7;">${item.defectoClave}</td>
      <td style="font-weight: 600; color: #1e293b;">${item.defectoNombre}</td>
      <td style="text-align: center;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 700; ${
          item.clasificacion === 'CRITICO'
            ? 'background: #ffe4e6; color: #be123c;'
            : item.clasificacion === 'MAYOR'
            ? 'background: #ffedd5; color: #c2410c;'
            : 'background: #fef9c3; color: #a16207;'
        }">
          ${item.clasificacion}
        </span>
      </td>
      <td style="text-align: center; font-weight: bold;">${item.paresDefectuosos}</td>
      <td style="color: #475569; font-size: 10px; white-space: nowrap;">${item.usuario}</td>
    </tr>
  `
    )
    .join('');

  const totalPares = items.reduce((acc, curr) => acc + (curr.paresDefectuosos || 0), 0);

  const html = `
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
          <h1 class="title">Reporte Histórico de Defectos</h1>
          <div class="subtitle">Sistema de Control de Calidad y Trazabilidad Operativa</div>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div>Generado: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Total de registros: <strong>${items.length}</strong></div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Período:</strong>
          <span>${filtros.periodoNombre}</span>
        </div>
        <div class="meta-item">
          <strong>Departamento:</strong>
          <span>${filtros.departamentoNombre || 'Todos los Departamentos'}</span>
        </div>
        <div class="meta-item">
          <strong>Línea:</strong>
          <span>${filtros.lineaNombre || 'Todas las Líneas'}</span>
        </div>
        <div class="meta-item">
          <strong>Inspector:</strong>
          <span>${filtros.inspectorNombre || 'Todos los Inspectores'}</span>
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
        <div>Total de Defectos: <strong>${items.length}</strong></div>
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

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
