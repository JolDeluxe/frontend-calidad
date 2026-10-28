import { Icon } from '@/components/ui/icon';

export interface TerminalesToolbarProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  deptoFiltro: string;
  onDeptoFiltroChange: (val: string) => void;
  deptos: Array<{ id: number; nombre: string }>;
  verInactivas: boolean;
  onToggleInactivas: () => void;
  totalInactivas: number;
}

export function TerminalesToolbar({
  busqueda,
  onBusquedaChange,
  deptoFiltro,
  onDeptoFiltroChange,
  deptos,
  verInactivas,
  onToggleInactivas,
  totalInactivas,
}: TerminalesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
      {/* Lado izquierdo: Buscador y Filtro por Departamento */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Buscador */}
        <div className="relative w-56 sm:w-64 shrink-0">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre de terminal..."
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

        {/* Selector de Departamento */}
        <div className="shrink-0">
          <select
            value={deptoFiltro}
            onChange={(e) => onDeptoFiltroChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-44"
            title="Filtrar por departamento asignado"
          >
            <option value="">Todos los Departamentos</option>
            {deptos.map((d) => (
              <option key={d.id} value={d.id.toString()}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lado derecho: Botón Papelera / Inactivas */}
      <div className="shrink-0 flex items-center">
        <button
          type="button"
          onClick={onToggleInactivas}
          title={
            verInactivas
              ? 'Viendo terminales revocadas/inactivas (Click para volver a activas)'
              : 'Ver terminales revocadas/inactivas'
          }
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
            verInactivas
              ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
              : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Icon name="delete" size="18px" className={verInactivas ? 'text-rose-600' : 'text-slate-400'} />
          {verInactivas && <span>Inactivas ({totalInactivas})</span>}
        </button>
      </div>
    </div>
  );
}
