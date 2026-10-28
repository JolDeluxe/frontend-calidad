import { useState, useEffect } from 'react';
import { auditApi, type TechnicalLogEntry } from '../api/auditoria-api';
import { LogsFiltros } from '../components/bitacora/bitacora-filtros';
import { LogsTabla } from '../components/bitacora/bitacora-tabla';

export function TechnicalLogsPage() {
  const [logs, setLogs] = useState<TechnicalLogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [levelFilter, setLevelFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');

  const fetchStructuredLogs = async (targetPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingLogs(true);
      }
      const res = await auditApi.getTechnicalLogs({
        page: targetPage,
        limit: 100,
        nivel: levelFilter || undefined,
        texto: textFilter || undefined,
      });
      if (res?.data) {
        if (append) {
          setLogs((prev) => [...prev, ...res.data.items]);
        } else {
          setLogs(res.data.items);
        }
        setTotalLogs(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error al cargar logs técnicos:', err);
    } finally {
      setLoadingLogs(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStructuredLogs(1, false);
  }, [levelFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStructuredLogs(1, false);
  };

  const handleLoadMore = () => {
    if (loadingMore || page >= totalPages) return;
    fetchStructuredLogs(page + 1, true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            LOGS TÉCNICOS
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
            {totalLogs} {totalLogs === 1 ? 'entrada' : 'entradas registradas'}
          </span>
        </div>
      </div>

      {/* Tabla con Toolbar de filtros integrados */}
      <LogsTabla
        logs={logs}
        loading={loadingLogs}
        totalLogs={totalLogs}
        hasMore={page < totalPages}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
        toolbar={
          <LogsFiltros
            nivel={levelFilter}
            onNivelChange={setLevelFilter}
            busqueda={textFilter}
            onBusquedaChange={setTextFilter}
            onSubmit={handleFilterSubmit}
            loading={loadingLogs}
            onRecargar={() => fetchStructuredLogs(1, false)}
          />
        }
      />
    </div>
  );
}
