import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export interface LogsFiltrosProps {
  nivel: string;
  onNivelChange: (val: string) => void;
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  onRecargar: () => void;
}

export function LogsFiltros({
  nivel,
  onNivelChange,
  busqueda,
  onBusquedaChange,
  onSubmit,
  loading,
  onRecargar,
}: LogsFiltrosProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Selector de Nivel */}
        <div className="shrink-0">
          <select
            value={nivel}
            onChange={(e) => onNivelChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40"
            title="Nivel de log"
          >
            <option value="">Todos los niveles</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
            <option value="debug">DEBUG</option>
          </select>
        </div>

        {/* Buscador de texto */}
        <div className="relative w-64 sm:w-80 shrink-0">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por mensaje, endpoint o requestId..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <Icon name="close" size="14px" />
            </button>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={loading}
          className="h-8 text-xs font-semibold px-3 shadow-2xs cursor-pointer"
        >
          {loading ? <Spinner size="14px" /> : <Icon name="search" size="14px" className="mr-1" />}
          <span>Buscar</span>
        </Button>
      </div>

      <div className="shrink-0 flex items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRecargar}
          disabled={loading}
          className="h-8 text-xs px-2.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
          title="Refrescar logs técnicos"
        >
          <Icon name="refresh" size="14px" className="mr-1" />
          <span>Actualizar</span>
        </Button>
      </div>
    </form>
  );
}
