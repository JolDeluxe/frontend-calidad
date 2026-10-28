import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import type { TerminalBindingState } from '../hooks/use-terminal-status';
import type { TerminalPublicInfo } from '../services/terminal-storage';

export interface TerminalStatusBannerProps {
  estado: TerminalBindingState;
  terminal: TerminalPublicInfo | null;
  errorMensaje?: string | null;
  onAbrirVinculacion: () => void;
  onReintentar?: () => void;
}

export function TerminalStatusBanner({
  estado,
  terminal,
  errorMensaje,
  onAbrirVinculacion,
  onReintentar,
}: TerminalStatusBannerProps) {
  if (estado === 'vinculada' && terminal) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl mb-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
            <Icon name="computer" size="16px" className="text-emerald-700" />
            <span>Estación Vinculada:</span>
          </div>

          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs shadow-2xs">
            {terminal.nombre}
          </span>

          <span className="text-slate-300 hidden sm:inline">•</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Departamento de Captura:</span>
            <span className="font-black text-emerald-950 uppercase bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300/80 text-xs tracking-wide">
              {terminal.departamentoNombre}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <Icon name="verified" size="14px" className="text-emerald-600" />
          <span>Activa para captura</span>
        </div>
      </div>
    );
  }

  if (estado === 'error_conexion') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-3 shadow-2xs text-xs">
        <div className="flex items-center gap-2.5 text-amber-900">
          <Icon name="wifi_off" size="18px" className="text-amber-600 shrink-0" />
          <div>
            <span className="font-bold text-amber-950">Aviso de estación:</span>{' '}
            <span className="text-amber-800">{errorMensaje || 'No se pudo contactar al servidor para comprobar la terminal física.'}</span>
          </div>
        </div>
        {onReintentar && (
          <Button size="sm" variant="outline" onClick={onReintentar} className="h-7 text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100/50">
            <Icon name="refresh" size="14px" className="mr-1" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  // estado === 'no_vinculada'
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-rose-50/90 border border-rose-200 rounded-xl mb-3 shadow-2xs">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0">
          <Icon name="phonelink_erase" size="20px" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>Estación de Trabajo No Vinculada</span>
          </h4>
          <p className="text-xs text-rose-700/90 mt-0.5">
            {errorMensaje || 'Esta computadora física requiere vincularse presencialmente para capturar defectos en planta.'}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="primary"
        onClick={onAbrirVinculacion}
        className="shrink-0 font-semibold h-8 text-xs px-3 shadow-2xs"
      >
        <Icon name="key" size="14px" className="mr-1.5" />
        Vincular con Código OTP
      </Button>
    </div>
  );
}
