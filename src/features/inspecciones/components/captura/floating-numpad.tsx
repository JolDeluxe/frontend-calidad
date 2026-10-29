import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils/cn';

export interface FloatingNumpadProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  targetInputName?: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}

export function FloatingNumpad({
  isOpen,
  onClose,
  title,
  targetInputName,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  submitLabel = 'Aceptar',
}: FloatingNumpadProps) {
  // Posición inicial flotante en la esquina inferior derecha para no tapar los inputs
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, window.innerWidth - 300),
        y: Math.max(80, window.innerHeight - 440),
      };
    }
    return { x: 50, y: 100 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Reubicar si cambia el tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => ({
        x: Math.min(prev.x, Math.max(10, window.innerWidth - 290)),
        y: Math.min(prev.y, Math.max(10, window.innerHeight - 420)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Control de arrastre con Mouse y Touch
  const handleStartDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: clientX - pos.x,
      y: clientY - pos.y,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Solo arrastrar desde la barra superior de título
    if ((e.target as HTMLElement).closest('.numpad-drag-handle')) {
      handleStartDrag(e.clientX, e.clientY);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 270, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 380, e.clientY - dragOffsetRef.current.y));
      setPos({ x: newX, y: newY });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  if (!isOpen) return null;

  const DIGITS = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
  ];

  return (
    <div
      ref={panelRef}
      onPointerDown={handlePointerDown}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
      }}
      className={cn(
        'fixed left-0 top-0 z-[120] w-[290px] bg-white border border-slate-300 shadow-2xl rounded-2xl p-3 flex flex-col gap-2.5 select-none touch-manipulation transition-shadow',
        isDragging ? 'shadow-marca-primario/20 ring-2 ring-marca-primario cursor-grabbing' : 'shadow-2xl'
      )}
    >
      {/* Barra superior de arrastre */}
      <div className="numpad-drag-handle flex items-center justify-between px-3 py-2 bg-slate-100 rounded-xl cursor-grab active:cursor-grabbing border border-slate-200">
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon name="drag_indicator" size="20px" className="text-slate-500 shrink-0" />
          <div className="flex flex-col truncate">
            <span className="text-xs font-black uppercase tracking-wider text-marca-primario truncate">
              {title}
            </span>
            {targetInputName && (
              <span className="text-[10px] text-slate-600 font-mono font-bold truncate">
                {targetInputName}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Cerrar teclado"
        >
          <Icon name="close" size="20px" />
        </button>
      </div>

      {/* Grid numérico táctil */}
      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map((fila, fIdx) =>
          fila.map((dig) => (
            <button
              key={`${fIdx}-${dig}`}
              type="button"
              onClick={() => onDigit(dig)}
              className="h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl font-mono text-2xl font-black border border-slate-300 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              {dig}
            </button>
          ))
        )}

        {/* Fila inferior: Borrar todo (C), 0 y Retroceso */}
        <button
          type="button"
          onClick={onClear}
          className="h-14 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-xl font-black text-sm border border-rose-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer uppercase tracking-wider shadow-xs"
          title="Borrar todo"
        >
          C
        </button>

        <button
          type="button"
          onClick={() => onDigit('0')}
          className="h-14 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl font-mono text-2xl font-black border border-slate-300 active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
        >
          0
        </button>

        <button
          type="button"
          onClick={onBackspace}
          className="h-14 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 rounded-xl border border-amber-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          title="Borrar dígito"
        >
          <Icon name="backspace" size="24px" />
        </button>
      </div>

      {/* Botón Enter / Aceptar */}
      <button
        type="button"
        onClick={onSubmit}
        className="h-12 w-full bg-marca-primario hover:bg-marca-primario-hover text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer"
      >
        <Icon name="keyboard_return" size="20px" />
        <span>{submitLabel}</span>
      </button>
    </div>
  );
}
