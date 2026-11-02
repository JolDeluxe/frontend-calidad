import { type RefObject } from 'react';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { Defecto } from '@/features/defectos/types/defectos.types';

export interface CapturaDefectoFormProps {
  loteActivo: boolean;
  departamentoAuditorId?: number;
  claveDefecto: string;
  setClaveDefecto: (val: string) => void;
  claveInputRef: RefObject<HTMLInputElement | null>;
  buscandoDefecto: boolean;
  handleBuscarDefecto: (clave: string) => Promise<Defecto | null>;
  defectoSeleccionado: Defecto | null;
  setDefectoSeleccionado: (d: Defecto | null) => void;
  catalogoDefectos: Defecto[];
  selectorAbierto: boolean;
  setSelectorAbierto: React.Dispatch<React.SetStateAction<boolean>>;
  selectorRef: RefObject<HTMLDivElement | null>;
  filtroTextoDefecto: string;
  setFiltroTextoDefecto: (val: string) => void;
  paresDefecto: number;
  handleModificarPares: (delta: number) => void;
  handleParesDirecto: (val: string) => void;
  maxParesPermitido: number;
  handleAgregarDefecto: (defectoPersonalizado?: Defecto) => void;
  guardando: boolean;
  errorDefecto: string | null;
  setErrorDefecto: (err: string | null) => void;
  onAbrirTeclado?: () => void;
  tecladoActivo?: boolean;
}

export function CapturaDefectoForm({
  loteActivo,
  departamentoAuditorId,
  claveDefecto,
  setClaveDefecto,
  claveInputRef,
  buscandoDefecto,
  handleBuscarDefecto,
  defectoSeleccionado,
  setDefectoSeleccionado,
  catalogoDefectos,
  selectorAbierto,
  setSelectorAbierto,
  selectorRef,
  filtroTextoDefecto,
  setFiltroTextoDefecto,
  paresDefecto,
  handleModificarPares,
  handleParesDirecto,
  maxParesPermitido,
  handleAgregarDefecto,
  guardando,
  errorDefecto,
  setErrorDefecto,
  onAbrirTeclado,
  tecladoActivo,
}: CapturaDefectoFormProps) {
  return (
    <div
      className={cn(
        'p-2.5 xl:p-4 rounded-xl border space-y-2 transition-all',
        loteActivo
          ? 'bg-app-surface-muted/50 border-border'
          : 'bg-app-surface-muted/20 border-border-subtle opacity-50 pointer-events-none select-none'
      )}
    >
      <div className="flex items-end gap-2 xl:gap-3 w-full">
        {/* 1. CLAVE DEFECTO */}
        <div className="w-18 xl:w-22 shrink-0">
          <Label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary truncate">
            Clave *
          </Label>
          <div className="relative">
            <Input
              ref={claveInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={claveDefecto}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setClaveDefecto(val);
                setErrorDefecto(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (defectoSeleccionado) {
                    handleAgregarDefecto(defectoSeleccionado);
                  } else {
                    const encontrado = await handleBuscarDefecto(claveDefecto);
                    if (encontrado) {
                      handleAgregarDefecto(encontrado);
                    }
                  }
                }
              }}
              disabled={guardando || !loteActivo}
              placeholder={!loteActivo ? '—' : ''}
              className={cn(
                'h-10 xl:h-12 text-xs xl:text-sm font-mono font-bold text-center rounded-xl',
                claveDefecto.length > 0 && loteActivo ? 'pr-14' : 'pr-8'
              )}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {buscandoDefecto ? (
                <div className="text-brand-primary">
                  <Spinner size="14px" />
                </div>
              ) : (
                <>
                  {claveDefecto.length > 0 && loteActivo && !guardando && (
                    <button
                      type="button"
                      onClick={() => {
                        setClaveDefecto('');
                        setDefectoSeleccionado(null);
                        setErrorDefecto(null);
                        claveInputRef.current?.focus();
                      }}
                      title="Borrar clave"
                      className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    >
                      <Icon name="close" size="14px" />
                    </button>
                  )}
                  {onAbrirTeclado && loteActivo && (
                    <button
                      type="button"
                      onClick={onAbrirTeclado}
                      title={tecladoActivo ? 'Cerrar teclado numérico' : 'Abrir teclado numérico'}
                      className={cn(
                        'h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer',
                        tecladoActivo
                          ? 'bg-marca-primario text-white shadow-xs'
                          : 'text-slate-400 hover:text-marca-primario hover:bg-slate-100'
                      )}
                    >
                      <Icon name="dialpad" size="15px" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. DESCRIPCION CON BARRA DE BUSQUEDA INCORPORADA */}
        <div className="flex-1 min-w-0 relative" ref={selectorRef}>
          <Label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary truncate">
            Descripción Defecto *
          </Label>
          <div className="relative">
            <button
              type="button"
              disabled={guardando || !loteActivo}
              onClick={() => setSelectorAbierto((prev) => !prev)}
              className="w-full h-10 xl:h-12 px-2.5 xl:px-3.5 text-left border border-border rounded-xl bg-app-surface flex items-center justify-between text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-[0.99] transition-all shadow-xs"
              title={
                defectoSeleccionado
                  ? `${defectoSeleccionado.clave} — ${defectoSeleccionado.defecto}${
                      departamentoAuditorId &&
                      defectoSeleccionado.departamentoId &&
                      defectoSeleccionado.departamentoId !== departamentoAuditorId
                        ? ` — ${defectoSeleccionado.departamento?.nombre || defectoSeleccionado.departamento?.codigo}`
                        : ''
                    }`
                  : undefined
              }
            >
              <span className="truncate pr-2">
                {!loteActivo
                  ? '-- Ingrese lote primero --'
                  : defectoSeleccionado
                  ? `${defectoSeleccionado.clave} — ${defectoSeleccionado.defecto}`
                  : '-- Seleccionar defecto --'}
              </span>
              <Icon name="arrow_drop_down" size="24px" className="shrink-0 text-text-muted" />
            </button>

            {/* Popover de búsqueda rápida de defectos optimizado para touch */}
            {selectorAbierto && loteActivo && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-app-surface border border-border rounded-2xl shadow-2xl z-50 p-2.5 flex flex-col max-h-80 w-full sm:min-w-[380px]">
                <div className="relative mb-2.5 shrink-0">
                  <Icon name="search" size="18px" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar defecto o clave..."
                    value={filtroTextoDefecto}
                    onChange={(e) => setFiltroTextoDefecto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const filtrados = catalogoDefectos
                          .filter((d) => {
                            if (!filtroTextoDefecto.trim()) return true;
                            const q = filtroTextoDefecto.toLowerCase();
                            return String(d.clave).includes(q) || d.defecto.toLowerCase().includes(q);
                          })
                          .sort((a, b) => {
                            if (departamentoAuditorId) {
                              const aEsMismo = a.departamentoId === departamentoAuditorId ? 1 : 0;
                              const bEsMismo = b.departamentoId === departamentoAuditorId ? 1 : 0;
                              if (aEsMismo !== bEsMismo) return bEsMismo - aEsMismo;
                            }
                            return a.clave - b.clave;
                          });

                        if (filtrados.length > 0) {
                          const primerDefecto = filtrados[0];
                          setDefectoSeleccionado(primerDefecto);
                          setClaveDefecto(String(primerDefecto.clave));
                          setSelectorAbierto(false);
                          setFiltroTextoDefecto('');
                          setErrorDefecto(null);
                        }
                      }
                    }}
                    autoFocus
                    className="w-full h-11 pl-9 pr-3 text-sm border border-border rounded-xl bg-app-surface-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-border-subtle custom-scrollbar">
                  {catalogoDefectos.length === 0 ? (
                    <div className="py-8 px-4 text-center text-xs text-text-muted">
                      No hay catálogo local de defectos disponible en este equipo. Reconecte al servidor para descargarlo.
                    </div>
                  ) : (
                    catalogoDefectos
                      .filter((d) => {
                        if (!filtroTextoDefecto.trim()) return true;
                        const q = filtroTextoDefecto.toLowerCase();
                        return (
                          String(d.clave).includes(q) ||
                          d.defecto.toLowerCase().includes(q)
                        );
                      })
                      .sort((a, b) => {
                        // Priorizar primero los defectos que pertenecen al departamento auditor actual
                        if (departamentoAuditorId) {
                          const aEsMismoDepto = a.departamentoId === departamentoAuditorId ? 1 : 0;
                          const bEsMismoDepto = b.departamentoId === departamentoAuditorId ? 1 : 0;
                          if (aEsMismoDepto !== bEsMismoDepto) {
                            return bEsMismoDepto - aEsMismoDepto;
                          }
                        }
                        return a.clave - b.clave;
                      })
                      .map((d) => {
                        const esDeptoExterno =
                          departamentoAuditorId && d.departamentoId && d.departamentoId !== departamentoAuditorId;
                        const nombreDepto = d.departamento?.nombre || d.departamento?.codigo;

                        return (
                          <div key={d.id} className="group relative w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setDefectoSeleccionado(d);
                                setClaveDefecto(String(d.clave));
                                setSelectorAbierto(false);
                                setFiltroTextoDefecto('');
                                setErrorDefecto(null);
                              }}
                              className={`w-full min-h-[44px] p-2.5 text-left flex items-center justify-between gap-3 text-xs cursor-pointer touch-manipulation transition-colors rounded-lg ${
                                esDeptoExterno
                                  ? 'bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/30'
                                  : 'hover:bg-app-surface-muted active:bg-brand-primary/10'
                              } ${defectoSeleccionado?.id === d.id ? 'ring-2 ring-brand-primary/30 font-bold' : ''}`}
                            >
                              <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                <strong className="font-mono text-brand-primary shrink-0">{d.clave} —</strong>
                                <span className="truncate text-text-primary">{d.defecto}</span>
                              </div>

                              {/* Columna / punto fijo a la derecha para el departamento cuando es externo */}
                              <div className="shrink-0 w-24 text-right">
                                {esDeptoExterno && nombreDepto ? (
                                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 truncate block">
                                    {nombreDepto}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-text-muted/40 font-mono block">
                                    —
                                  </span>
                                )}
                              </div>
                            </button>

                            {/* Tooltip flotante enriquecido con retardo de 4s para no interferir con la navegación */}
                            <div className="absolute left-2 bottom-full mb-1 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 delay-[2000ms] flex flex-col z-50">
                              <div className="bg-slate-900/95 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-xl max-w-sm whitespace-normal leading-tight backdrop-blur-xs">
                                <span className="font-mono text-brand-secondary font-bold mr-1">{d.clave}</span>
                                {d.defecto}
                                {esDeptoExterno && nombreDepto && (
                                  <span className="text-amber-300 ml-1 font-semibold">({nombreDepto})</span>
                                )}
                              </div>
                              <div className="w-2 h-1 bg-slate-900/95 rotate-45 ml-4 -mt-0.5" />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. PARES CON BOTONES TOUCH PROMINENTES [-] [número] [+] */}
        <div className="shrink-0">
          <Label className="block text-xs font-bold uppercase mb-1.5 text-text-secondary truncate">
            Pares *
          </Label>
          <div className="flex items-center h-10 xl:h-12 border border-border rounded-xl bg-app-surface shadow-xs p-1 gap-0.5 xl:gap-1">
            <button
              type="button"
              onClick={() => handleModificarPares(-1)}
              disabled={guardando || !loteActivo || paresDefecto <= 1}
              className="w-8 xl:w-9 h-full shrink-0 flex items-center justify-center bg-app-surface-muted hover:bg-border/90 text-text-primary rounded-lg font-black active:scale-90 disabled:opacity-20 transition-all touch-manipulation cursor-pointer select-none border border-border/60"
              title="Disminuir un par"
            >
              <Icon name="remove" size="20px" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={paresDefecto}
              onChange={(e) => handleParesDirecto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAgregarDefecto();
                }
              }}
              disabled={guardando || !loteActivo}
              className="w-9 xl:w-11 h-full text-center font-black text-sm xl:text-lg text-brand-primary focus:outline-none bg-transparent shrink-0"
            />
            <button
              type="button"
              onClick={() => handleModificarPares(1)}
              disabled={guardando || !loteActivo || paresDefecto >= maxParesPermitido}
              className="w-8 xl:w-9 h-full shrink-0 flex items-center justify-center bg-app-surface-muted hover:bg-border/90 text-text-primary rounded-lg font-black active:scale-90 disabled:opacity-20 transition-all touch-manipulation cursor-pointer select-none border border-border/60"
              title="Aumentar un par"
            >
              <Icon name="add" size="20px" />
            </button>
          </div>
        </div>

        {/* 4. BOTÓN AGREGAR VERDE CON ICONO GRANDE [+] CON SEPARACIÓN VISUAL MARCADA */}
        <div className="shrink-0 pl-2 xl:pl-3 border-l border-border-subtle">
          <Label className="block text-xs font-bold uppercase mb-1.5 text-transparent select-none truncate">
            Agregar
          </Label>
          <button
            type="button"
            onClick={() => handleAgregarDefecto()}
            disabled={guardando || !defectoSeleccionado || !loteActivo}
            className="w-10 xl:w-12 h-10 xl:h-12 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md font-bold text-xl xl:text-2xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation select-none ring-2 ring-emerald-600/20"
            title="Agregar defecto a la lista"
          >
            +
          </button>
        </div>
      </div>

      {errorDefecto && (
        <p className="text-xs font-semibold text-danger flex items-center gap-1 pt-1">
          <Icon name="error" size="14px" />
          <span>{errorDefecto}</span>
        </p>
      )}
    </div>
  );
}
