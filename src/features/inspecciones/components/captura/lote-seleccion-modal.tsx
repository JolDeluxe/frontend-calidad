import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import type { LoteCoincidenciaResumen } from '../../types/inspecciones.types';

export interface LoteSeleccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: string;
  coincidencias: LoteCoincidenciaResumen[];
  listaActual?: string;
  onSeleccionar: (coincidencia: LoteCoincidenciaResumen) => void;
}

/**
 * Modal para seleccionar la lista de producción cuando existen múltiples listas activas.
 * Permite seleccionar una opción táctil y confirmar con el botón ACEPTAR.
 */
export function LoteSeleccionModal({
  isOpen,
  onClose,
  lote,
  coincidencias,
  listaActual,
  onSeleccionar,
}: LoteSeleccionModalProps) {
  const [seleccionado, setSeleccionado] = useState<LoteCoincidenciaResumen | null>(null);

  // Preseleccionar si coincide con listaActual o tomar la primera si no hay seleccionada
  useEffect(() => {
    if (isOpen && coincidencias.length > 0) {
      const match = listaActual
        ? coincidencias.find((c) => c.lista.trim().toUpperCase() === listaActual.trim().toUpperCase())
        : null;
      setSeleccionado(match || null);
    }
  }, [isOpen, coincidencias, listaActual]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || coincidencias.length === 0) return null;

  const handleAceptar = () => {
    if (seleccionado) {
      onSeleccionar(seleccionado);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-lote-seleccion-title"
    >
      <div className="bg-app-surface rounded-2xl shadow-2xl relative flex flex-col max-h-[92vh] w-full max-w-lg border border-border animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border bg-app-surface-muted/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700">
              <Icon name="layers" size="22px" />
            </div>
            <div>
              <h3
                id="modal-lote-seleccion-title"
                className="text-base sm:text-lg font-black text-text-primary tracking-tight"
              >
                Seleccionar Lista de Producción
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                El lote <span className="font-mono font-bold text-marca-primario">{lote}</span>{' '}
                se encuentra activo en{' '}
                <span className="font-bold">{coincidencias.length} listas</span> diferentes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-app-surface-muted transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <Icon name="close" size="20px" />
          </button>
        </div>

        {/* Listado de Opciones: Sin pares, sin cliente, lista sin badge, modelo legible y descripción grande */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {coincidencias.map((item) => {
              const estaSeleccionado =
                seleccionado?.id === item.id || seleccionado?.lista === item.lista;
              return (
                <div
                  key={`${item.lista}-${item.lote}-${item.id}`}
                  onClick={() => setSeleccionado(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSeleccionado(item);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={estaSeleccionado}
                  className={cn(
                    'relative bg-white dark:bg-slate-900 border-2 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between text-left select-none focus:outline-none',
                    estaSeleccionado
                      ? 'border-marca-primario bg-marca-primario/5 ring-2 ring-marca-primario/30 shadow-md'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700 hover:bg-app-surface-muted/30 shadow-2xs'
                  )}
                >
                  {/* Fila superior: Lista sin badge y selector de radio/check */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lista:
                      </span>
                      <span className="font-mono font-black text-sm sm:text-base text-slate-800 dark:text-slate-100">
                        {item.lista}
                      </span>
                    </div>

                    {/* Radio indicator */}
                    <div
                      className={cn(
                        'h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all',
                        estaSeleccionado
                          ? 'border-marca-primario bg-marca-primario text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-transparent'
                      )}
                    >
                      {estaSeleccionado && (
                        <Icon name="check" size="14px" className="stroke-[3]" />
                      )}
                    </div>
                  </div>

                  {/* Sección Central: MODELO bien proporcionado (text-xl sm:text-2xl) */}
                  <div className="pt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                      Modelo
                    </span>
                    <div className="text-xl sm:text-2xl font-black text-marca-primario tracking-tight font-mono uppercase leading-tight">
                      {item.modelo}
                    </div>

                    {/* Descripción GRANDE (text-sm sm:text-base font-extrabold) */}
                    {item.descripcion && (
                      <p className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1.5 leading-snug">
                        {item.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie de modal: CANCELAR y ACEPTAR */}
        <div className="flex items-center justify-end gap-3 p-3.5 sm:p-4 border-t border-border bg-app-surface-muted/40">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            className="font-bold text-xs sm:text-sm px-4 cursor-pointer"
          >
            CANCELAR
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!seleccionado}
            onClick={handleAceptar}
            className="font-black text-xs sm:text-sm px-6 cursor-pointer gap-1.5"
          >
            <Icon name="check" size="16px" />
            <span>ACEPTAR</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
