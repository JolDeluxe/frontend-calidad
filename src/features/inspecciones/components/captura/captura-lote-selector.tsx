import { type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';

export interface CapturaLoteSelectorProps {
  loteInput: string;
  setLoteInput: (val: string) => void;
  setErrorLote: (err: string | null) => void;
  handleBuscarLote: () => void;
  loteInputRef: RefObject<HTMLInputElement | null>;
  cargandoLote: boolean;
  guardando: boolean;
  tieneMultiplesLineas: boolean;
  totalLineasDepto: number;
  lineaCodigo: string;
  setLineaCodigo: (val: string) => void;
  onAbrirTeclado?: () => void;
  tecladoActivo?: boolean;
}

export function CapturaLoteSelector({
  loteInput,
  setLoteInput,
  setErrorLote,
  handleBuscarLote,
  loteInputRef,
  cargandoLote,
  guardando,
  tieneMultiplesLineas,
  totalLineasDepto,
  lineaCodigo,
  setLineaCodigo,
  onAbrirTeclado,
  tecladoActivo,
}: CapturaLoteSelectorProps) {
  return (
    <div className="shrink-0">
      <div className="flex items-end gap-2.5 xl:gap-3 w-full">
        {/* Si solo hay 1 línea (ej. CORTE), el input de lote ocupa todo el ancho flex-1 */}
        <div className={tieneMultiplesLineas ? 'flex-1 min-w-[110px]' : 'w-full'}>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="block text-xs font-bold uppercase tracking-wider text-text-primary">
              Número de Lote *
            </Label>
            {onAbrirTeclado && (
              <button
                type="button"
                onClick={onAbrirTeclado}
                title={tecladoActivo ? 'Ocultar teclado táctil' : 'Abrir teclado táctil'}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 border transition-colors cursor-pointer',
                  tecladoActivo
                    ? 'bg-marca-primario text-white border-marca-primario shadow-2xs'
                    : 'bg-app-surface text-slate-500 border-slate-300 hover:text-marca-primario hover:border-marca-primario'
                )}
              >
                <Icon name="dialpad" size="14px" />
                <span>Teclado</span>
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              ref={loteInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={loteInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setLoteInput(val);
                setErrorLote(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBuscarLote();
                }
              }}
              disabled={guardando}
              className="h-10 xl:h-12 font-mono font-bold text-base xl:text-lg text-brand-primary tracking-wider pr-8 rounded-xl"
            />
            {cargandoLote && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-primary">
                <Spinner size="18px" />
              </div>
            )}
          </div>
        </div>

        {/* Selector interactivo de líneas sólo si hay más de 1 línea disponible */}
        {tieneMultiplesLineas && (
          <div className="shrink-0">
            <Label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 truncate">
              Línea
            </Label>
            <div className="flex flex-nowrap items-center gap-1.5 xl:gap-2">
              {Array.from({ length: totalLineasDepto }, (_, i) => `L${i + 1}`).map((lin) => {
                const isSelected = lineaCodigo === lin;
                return (
                  <button
                    key={lin}
                    type="button"
                    onClick={() => setLineaCodigo(lin)}
                    disabled={guardando}
                    className={cn(
                      'h-10 xl:h-12 min-w-[38px] xl:min-w-[48px] px-2.5 xl:px-3.5 rounded-xl font-mono text-xs xl:text-sm font-black transition-all border shrink-0 touch-manipulation cursor-pointer active:scale-95 select-none shadow-xs',
                      isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-md ring-2 ring-brand-primary/20'
                        : 'bg-app-surface text-text-secondary border-border hover:bg-app-surface-muted hover:text-text-primary'
                    )}
                  >
                    {lin}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
