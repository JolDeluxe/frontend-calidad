import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';

export interface BotonExportarMenuProps {
  onExportarExcel: () => Promise<void> | void;
  onExportarPdf: () => Promise<void> | void;
  cargando?: boolean;
  totalDefectos?: number;
}

export function BotonExportarMenu({
  onExportarExcel,
  onExportarPdf,
  cargando = false,
  totalDefectos = 0,
}: BotonExportarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 200;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      setCoords({
        top: rect.bottom + 4,
        left,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        disabled={cargando}
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 shadow-2xs cursor-pointer transition-colors"
        title="Exportar reporte"
      >
        {cargando ? (
          <Spinner size="xs" className="text-marca-primario" />
        ) : (
          <Icon name="download" size="15px" className="text-slate-500" />
        )}
        <span>Exportar</span>
        <Icon
          name="arrow_drop_down"
          size="16px"
          className={`text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
              Exportar ({totalDefectos} defectos)
            </div>

            {/* Opción Excel */}
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await onExportarExcel();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="h-6 w-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200">
                <Icon name="table_view" size="14px" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Exportar a Excel</span>
                <span className="text-[10px] text-slate-500">Hoja de cálculo (.csv / Excel)</span>
              </div>
            </button>

            {/* Opción PDF */}
            <button
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await onExportarPdf();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-800 hover:bg-rose-50 hover:text-rose-800 rounded-lg text-left transition-colors cursor-pointer group mt-0.5"
            >
              <div className="h-6 w-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-200">
                <Icon name="picture_as_pdf" size="14px" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold">Exportar a PDF</span>
                <span className="text-[10px] text-slate-500">Documento imprimible</span>
              </div>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
