import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { IntegrityVerificationResponse } from '../../api/auditoria-api';

export interface EventosFiltrosProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  accion: string;
  onAccionChange: (val: string) => void;
  entidad: string;
  onEntidadChange: (val: string) => void;
  accionesDisponibles: string[];
  entidadesDisponibles: string[];
  onLimpiar: () => void;
  integrityStatus: IntegrityVerificationResponse | null;
  checkingIntegrity: boolean;
  onVerifyIntegrity: () => void;
}

export function EventosFiltros({
  busqueda,
  onBusquedaChange,
  accion,
  onAccionChange,
  entidad,
  onEntidadChange,
  accionesDisponibles,
  entidadesDisponibles,
  onLimpiar,
  integrityStatus,
  checkingIntegrity,
  onVerifyIntegrity,
}: EventosFiltrosProps) {
  const hayFiltros = Boolean(busqueda || accion || entidad);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
      {/* Lado izquierdo: Buscador y Filtros desplegables */}
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
            placeholder="Buscar por descripción o ID..."
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

        {/* Selector de Acción */}
        <div className="shrink-0">
          <select
            value={accion}
            onChange={(e) => onAccionChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-44"
            title="Filtrar por tipo de acción"
          >
            <option value="">Todas las Acciones</option>
            {accionesDisponibles.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de Entidad */}
        <div className="shrink-0">
          <select
            value={entidad}
            onChange={(e) => onEntidadChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40"
            title="Filtrar por entidad afectada"
          >
            <option value="">Todas las Entidades</option>
            {entidadesDisponibles.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {hayFiltros && (
          <Button
            type="button"
            variant="ghost"
            onClick={onLimpiar}
            className="h-8 text-xs px-2 text-text-muted hover:text-danger cursor-pointer"
          >
            <Icon name="filter_alt_off" size="14px" className="mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Lado derecho: Estado de Integridad Criptográfica */}
      <div className="shrink-0 flex items-center gap-2">
        {integrityStatus && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              integrityStatus.cadenaValida
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
            }`}
          >
            <Icon name={integrityStatus.cadenaValida ? 'verified' : 'warning'} size="15px" />
            <span>
              {integrityStatus.cadenaValida
                ? `Cadena SHA-256 Íntegra (${integrityStatus.eventosVerificados})`
                : `Alteración (#${integrityStatus.primerAlteradoId})`}
            </span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onVerifyIntegrity}
          disabled={checkingIntegrity}
          className="h-8 text-xs px-2.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
          title="Verificar integridad de la cadena SHA-256"
        >
          {checkingIntegrity ? (
            <Spinner size="14px" />
          ) : (
            <>
              <Icon name="sync" size="14px" className="mr-1" />
              <span>Verificar</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
