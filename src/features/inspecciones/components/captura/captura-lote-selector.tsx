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
  onLimpiarLote?: () => void;
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
  onLimpiarLote,
}: CapturaLoteSelectorProps) {
  return (
    <div className="shrink-0">
      <div className="flex items-end gap-2.5 xl:gap-3 w-full">
        {/* Si solo hay 1 línea (ej. CORTE), el input de lote ocupa todo el ancho flex-1 */}
        <div className={tieneMultiplesLineas ? 'flex-1 min-w-[110px]' : 'w-full'}>
          <Label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-text-primary">
            Número de Lote *
          </Label>
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
                if (!val.trim()) {
                  onLimpiarLote?.();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleBuscarLote();
                }
              }}
              disabled={guardando}
              className="h-10 xl:h-12 font-mono font-bold text-base xl:text-lg text-brand-primary tracking-wider pr-18 xl:pr-20 rounded-xl"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {cargandoLote ? (
                <div className="text-brand-primary mr-1">
                  <Spinner size="18px" />
                </div>
              ) : (
                <>
                  {loteInput.length > 0 && !guardando && onLimpiarLote && (
                    <button
                      type="button"
                      onClick={onLimpiarLote}
                      title="Borrar lote y defectos"
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <Icon name="close" size="18px" />
                    </button>
                  )}
                  {onAbrirTeclado && (
                    <button
                      type="button"
                      onClick={onAbrirTeclado}
                      title={tecladoActivo ? 'Cerrar teclado numérico' : 'Abrir teclado numérico'}
                      className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer',
                        tecladoActivo
                          ? 'bg-marca-primario text-white shadow-xs'
                          : 'text-slate-400 hover:text-marca-primario hover:bg-slate-100'
                      )}
                    >
                      <Icon name="dialpad" size="18px" />
                    </button>
                  )}
                </>
              )}
            </div>
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
