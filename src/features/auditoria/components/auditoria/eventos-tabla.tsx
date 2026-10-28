import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { EventoAuditoria } from '../../types/auditoria.types';

export interface EventosTablaProps {
  items: EventoAuditoria[];
  isLoading: boolean;
  totalItems: number;
  toolbar: React.ReactNode;
  onVerDetalle: (item: EventoAuditoria) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function EventosTabla({
  items,
  isLoading,
  totalItems,
  toolbar,
  onVerDetalle,
  page,
  totalPages,
  onPageChange,
}: EventosTablaProps) {
  const getBadgeAccion = (accion: string) => {
    if (accion.includes('ELIMIN') || accion.includes('REVOC') || accion.includes('BLOQUE')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (accion.includes('CREA') || accion.includes('REGISTR') || accion.includes('RECUPER')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (accion.includes('ACTUALIZ') || accion.includes('MODIFIC')) {
      return 'bg-sky-100 text-sky-800 border-sky-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Barra de herramientas integrada */}
      <div className="p-3 border-b border-border/80 bg-app-surface">{toolbar}</div>

      {/* Contenedor scrolleable de la tabla */}
      <div className="flex-1 overflow-auto min-h-[300px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <tr>
              <th className="py-2 px-3 text-center w-14">ID</th>
              <th className="py-2 px-3">Fecha y Hora</th>
              <th className="py-2 px-3">Acción</th>
              <th className="py-2 px-3">Entidad</th>
              <th className="py-2 px-3">Descripción</th>
              <th className="py-2 px-3">Usuario / Terminal</th>
              <th className="py-2 px-2 text-center w-16">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-text-muted">
                    <Spinner size="md" />
                    <span>Cargando eventos de auditoría...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-text-muted">
                  <Icon name="history" size="32px" className="mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-700">No se encontraron eventos</p>
                  <p className="text-[11px] text-slate-400">Intente modificando los filtros aplicados</p>
                </td>
              </tr>
            ) : (
              items.map((event) => {
                const desc = event.detalles?.descripcion || event.motivo || '—';
                return (
                  <tr
                    key={event.id}
                    onClick={() => onVerDetalle(event)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                      #{event.id}
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {event.fecha
                        ? new Date(event.fecha).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })
                        : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getBadgeAccion(
                          event.accion,
                        )}`}
                      >
                        {event.accion}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-slate-800 uppercase text-[11px]">
                        {event.entidad}
                      </span>
                      {event.entidadId && (
                        <span className="font-mono text-[11px] text-slate-400 ml-1">
                          #{event.entidadId}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={desc}>
                      {desc}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      <span className="font-bold text-slate-800">
                        {event.usuario?.usuario || 'Sistema'}
                      </span>
                      {event.terminal && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {event.terminal.nombre}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onVerDetalle(event)}
                        className="p-1 rounded text-slate-400 hover:text-marca-primario hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Ver detalles completos del evento"
                      >
                        <Icon name="visibility" size="16px" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer de Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border bg-app-surface text-xs rounded-b-xl select-none">
        <span className="text-text-secondary">
          Mostrando <strong className="text-text-primary font-bold">{items.length}</strong> de{' '}
          <strong className="text-text-primary font-bold">{totalItems}</strong> eventos registrados
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Página anterior"
            >
              <Icon name="chevron_left" size="16px" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Página siguiente"
            >
              <Icon name="chevron_right" size="16px" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
