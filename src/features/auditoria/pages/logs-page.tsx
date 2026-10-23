import { useState, useEffect } from 'react';
import { auditApi, type TechnicalLogEntry } from '../api/auditoria-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export function TechnicalLogsPage() {
  const [logs, setLogs] = useState<TechnicalLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [levelFilter, setLevelFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  const fetchStructuredLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await auditApi.getTechnicalLogs({
        limit: 50,
        nivel: levelFilter || undefined,
        texto: textFilter || undefined,
      });
      if (res?.data) {
        setLogs(res.data.items);
        setTotalLogs(res.data.total);
      }
    } catch (err) {
      console.error('Error al cargar logs técnicos:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStructuredLogs();
  }, [levelFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStructuredLogs();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <Icon name="description" className="text-marca-primario" />
            Registro Técnico Estructurado (Pino JSON)
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Eventos internos del backend, excepciones HTTP, rotación de archivos y errores operativos.
          </p>
        </div>

        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-3">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-700 outline-none focus:border-marca-primario"
          >
            <option value="">Todos los niveles</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
            <option value="debug">DEBUG</option>
          </select>

          <div className="w-48 sm:w-64">
            <Input
              placeholder="Buscar en mensaje o requestId..."
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" disabled={loadingLogs}>
            <Icon name="search" size="18px" />
            Filtrar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={fetchStructuredLogs}
            disabled={loadingLogs}
          >
            <Icon name="refresh" size="18px" />
          </Button>
        </form>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">
            Total entradas encontradas: {totalLogs}
          </span>
          {loadingLogs && <Spinner size="18px" />}
        </div>

        {logs.length === 0 && !loadingLogs ? (
          <div className="p-12 text-center text-neutral-400">
            <Icon name="inbox" size="48px" className="mx-auto mb-2 opacity-50" />
            <p>No se encontraron registros técnicos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {logs.map((log, idx) => {
              const isExpanded = expandedLogIdx === idx;
              const level = (log.level || 'info').toLowerCase();
              const levelColors: Record<string, string> = {
                fatal: 'bg-rose-200 text-rose-900 border-rose-400 font-extrabold',
                error: 'bg-rose-100 text-rose-800 border-rose-300',
                warn: 'bg-amber-100 text-amber-800 border-amber-300',
                info: 'bg-blue-100 text-blue-800 border-blue-300',
                debug: 'bg-neutral-100 text-neutral-700 border-neutral-300',
              };

              return (
                <div key={idx} className="hover:bg-neutral-50/80 transition-colors">
                  <div
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                    onClick={() => setExpandedLogIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border shrink-0 ${
                          levelColors[level] || 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-xs text-neutral-400 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <p className="text-sm font-medium text-neutral-800 truncate">
                        {log.mensaje}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500 shrink-0">
                      {log.modulo && (
                        <span className="bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 font-mono">
                          {log.modulo}
                        </span>
                      )}
                      {log.requestId && (
                        <span className="font-mono text-neutral-400">
                          req: {log.requestId.slice(0, 8)}...
                        </span>
                      )}
                      <Icon
                        name={isExpanded ? 'expand_less' : 'expand_more'}
                        className="text-neutral-400"
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-neutral-900 text-emerald-400 font-mono text-xs overflow-x-auto rounded-b border-t border-neutral-800 custom-scrollbar">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(log.contexto || log, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
