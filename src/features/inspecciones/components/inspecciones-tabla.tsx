import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import { HighlightText } from './highlight-text';
import type { InspeccionFilaResponse } from '../types/inspecciones.types';

interface InspeccionesTablaProps {
  items: InspeccionFilaResponse[];
  busqueda?: string;
  isLoading?: boolean;
}

export function InspeccionesTabla({
  items,
  busqueda = '',
  isLoading = false,
}: InspeccionesTablaProps) {
  const getClasificacionVariant = (clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR') => {
    switch (clasificacion) {
      case 'CRITICO':
        return 'rose';
      case 'MAYOR':
        return 'amber';
      case 'MENOR':
        return 'sky';
      default:
        return 'zinc';
    }
  };

  const formatearFecha = (fechaIso: string) => {
    try {
      const d = new Date(fechaIso);
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      return `${dia} / ${mes} / ${anio}`;
    } catch {
      return fechaIso;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-md border border-cuadra-arena">
        <Icon name="progress_activity" size="32px" className="animate-spin text-marca-primario mb-2" />
        <span className="text-xs font-semibold text-app-text-muted">Cargando registros de inspección...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cuadra-arena-dark p-12 text-center bg-white">
        <Icon name="search_off" size="36px" className="text-app-text-muted mx-auto mb-2 opacity-40" />
        <h4 className="text-sm font-bold text-app-text">No se encontraron defectos registrados</h4>
        <p className="text-xs text-app-text-muted mt-1 max-w-md mx-auto">
          Intente con otro término de búsqueda o seleccione otro periodo (Hoy, Últimos o Todos).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-cuadra-arena-dark bg-white overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-cuadra-arena bg-cuadra-arena/30 text-[11px] font-bold text-app-text uppercase tracking-wider select-none">
              <th className="py-2.5 px-3 w-14 text-center">No</th>
              <th className="py-2.5 px-3">Departamento</th>
              <th className="py-2.5 px-3">Fecha</th>
              <th className="py-2.5 px-3">Lista</th>
              <th className="py-2.5 px-3">Lote</th>
              <th className="py-2.5 px-3">Línea</th>
              <th className="py-2.5 px-3">Modelo</th>
              <th className="py-2.5 px-3 max-w-[200px]">Descripción</th>
              <th className="py-2.5 px-3">DefDepto</th>
              <th className="py-2.5 px-3 w-16 text-center">Id</th>
              <th className="py-2.5 px-3">Defecto</th>
              <th className="py-2.5 px-3 w-14 text-center">Prs</th>
              <th className="py-2.5 px-3">Horma</th>
              <th className="py-2.5 px-3">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cuadra-arena/40">
            {items.map((row, idx) => (
              <tr
                key={row.id}
                className={`hover:bg-cuadra-arena/15 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-cuadra-arena/5'
                }`}
              >
                {/* No (consecutivo o folio) */}
                <td className="py-2.5 px-3 text-center font-mono font-semibold text-app-text-muted text-[11px]">
                  {row.id}
                </td>

                {/* Departamento auditor */}
                <td className="py-2.5 px-3 font-bold text-marca-primario uppercase text-[11px]">
                  {row.departamentoAuditoria}
                </td>

                {/* Fecha */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-app-text whitespace-nowrap">
                  {formatearFecha(row.fecha)}
                </td>

                {/* Lista */}
                <td className="py-2.5 px-3 font-semibold text-app-text">
                  <HighlightText text={row.lista} highlight={busqueda} />
                </td>

                {/* Lote */}
                <td className="py-2.5 px-3 font-bold text-marca-primario font-mono">
                  <HighlightText text={row.lote} highlight={busqueda} />
                </td>

                {/* Línea */}
                <td className="py-2.5 px-3 font-medium text-app-text-muted">
                  {row.linea}
                </td>

                {/* Modelo */}
                <td className="py-2.5 px-3 font-bold text-app-text">
                  <HighlightText text={row.modelo} highlight={busqueda} />
                </td>

                {/* Descripción */}
                <td className="py-2.5 px-3 text-app-text-muted truncate max-w-[200px]" title={row.descripcion || ''}>
                  <HighlightText text={row.descripcion || '—'} highlight={busqueda} />
                </td>

                {/* DefDepto (Depto Responsable de la falla) */}
                <td className="py-2.5 px-3 font-semibold text-app-text uppercase text-[11px]">
                  {row.defDepto}
                </td>

                {/* Id (Clave de defecto) */}
                <td className="py-2.5 px-3 text-center font-mono font-bold text-marca-primario">
                  <HighlightText text={row.defectoClave} highlight={busqueda} />
                </td>

                {/* Defecto */}
                <td className="py-2.5 px-3 font-semibold text-app-text">
                  <div className="flex items-center gap-1.5">
                    <span>
                      <HighlightText text={row.defectoNombre} highlight={busqueda} />
                    </span>
                    <StatusBadge
                      label={row.clasificacion}
                      variant={getClasificacionVariant(row.clasificacion)}
                      showIcon={false}
                    />
                  </div>
                </td>

                {/* Prs (Pares defectuosos) */}
                <td className="py-2.5 px-3 text-center font-extrabold text-marca-primario text-sm">
                  {row.paresDefectuosos}
                </td>

                {/* Horma */}
                <td className="py-2.5 px-3 font-medium text-app-text">
                  {row.horma}
                </td>

                {/* Usuario Inspector */}
                <td className="py-2.5 px-3 text-app-text-muted text-[11px] truncate max-w-[140px]" title={row.usuario}>
                  {row.usuario}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
