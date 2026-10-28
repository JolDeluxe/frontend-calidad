import { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { EntradaLogTecnico } from '../../types/auditoria.types';

export interface LogsTablaProps {
  logs: EntradaLogTecnico[];
  loading: boolean;
  totalLogs: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  toolbar: React.ReactNode;
}

export function LogsTabla({
  logs,
  loading,
  totalLogs,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  toolbar,
}: LogsTablaProps) {
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);
  const jsonDrawerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll hacia el cajón de detalle JSON cuando se abre
  useEffect(() => {
    if (expandedLogIdx !== null && jsonDrawerRef.current) {
      jsonDrawerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expandedLogIdx]);

  const getLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'warn':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'info':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Barra de herramientas integrada */}
      <div className="p-3 border-b border-border/80 bg-app-surface">{toolbar}</div>

      {/* Contenedor scrolleable */}
      <div className="flex-1 overflow-auto min-h-[300px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-secondary select-none">
            <tr>
              <th className="py-2 px-3 w-12 text-center">#</th>
              <th className="py-2 px-3 w-36">Timestamp</th>
              <th className="py-2 px-3 w-20">Nivel</th>
              <th className="py-2 px-3">Mensaje</th>
              <th className="py-2 px-3 w-36">Request ID</th>
              <th className="py-2 px-2 text-center w-14">JSON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs font-mono">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-text-muted font-sans">
                    <Spinner size="md" />
                    <span>Cargando logs técnicos del servidor...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text-muted font-sans">
                  <Icon name="description" size="32px" className="mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-700">No hay entradas de log disponibles</p>
                  <p className="text-[11px] text-slate-400">Pruebe ajustando el nivel de severidad o el término de búsqueda</p>
                </td>
              </tr>
            ) : (
              logs.map((log, idx) => (
                <tr
                  key={idx}
                  onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    expandedLogIdx === idx ? 'bg-slate-100/70 font-semibold' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                  <td className="py-2 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString('es-MX', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3,
                        })
                      : '—'}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${getLevelBadge(
                        log.level,
                      )}`}
                    >
                      {log.level?.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-800 font-sans max-w-md truncate" title={log.mensaje}>
                    {log.mensaje}
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-[120px]" title={log.requestId || ''}>
                    {log.requestId || '—'}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <Icon
                      name={expandedLogIdx === idx ? 'expand_less' : 'expand_more'}
                      size="18px"
                      className="text-slate-400"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle expandido en panel intermedio / inferior visible */}
      {expandedLogIdx !== null && logs[expandedLogIdx] && (
        <div
          ref={jsonDrawerRef}
          className="border-t-2 border-brand-accent/50 bg-slate-950 p-4 text-slate-200 text-xs font-mono max-h-72 overflow-auto shrink-0 shadow-inner"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
            <span className="flex items-center gap-2 text-emerald-400">
              <Icon name="code" size="14px" />
              <span>Detalle Completo JSON (Entrada #{expandedLogIdx + 1})</span>
            </span>
            <button
              type="button"
              onClick={() => setExpandedLogIdx(null)}
              className="text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800"
              title="Cerrar detalle"
            >
              <Icon name="close" size="14px" />
            </button>
          </div>
          <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap select-all font-mono leading-relaxed">
            {JSON.stringify(logs[expandedLogIdx], null, 2)}
          </pre>
        </div>
      )}

      {/* Footer de conteo y botón Ver Más */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t border-border bg-app-surface text-xs rounded-b-xl select-none">
        <span className="text-text-secondary">
          Mostrando <strong className="text-text-primary font-bold">{logs.length}</strong> de{' '}
          <strong className="text-text-primary font-bold">{totalLogs}</strong> líneas de registro técnico
        </span>

        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Spinner size="12px" />
                <span>Cargando más registros...</span>
              </>
            ) : (
              <>
                <Icon name="expand_more" size="16px" className="text-slate-500" />
                <span>Ver Más (+100)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
