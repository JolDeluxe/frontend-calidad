import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';

export interface SearchableOption {
  id: number | string;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: number | string | null;
  onChange: (value: number | string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allOptionLabel?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
  allOptionLabel = 'Todos',
  className = '',
  title = 'Seleccionar opción',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const componentId = useId();

  // Opción actualmente seleccionada
  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Abrir o cerrar y calcular coordenadas flotantes (Fixed Portal)
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 240);
      let left = rect.left;
      // Evitar que se desborde por la derecha de la ventana
      if (left + dropdownWidth > window.innerWidth - 12) {
        left = window.innerWidth - dropdownWidth - 12;
      }
      if (left < 10) left = 10;

      setCoords({
        top: rect.bottom + 4,
        left,
        width: dropdownWidth,
      });
      setBusqueda('');
    }
    setIsOpen((prev) => !prev);
  };

  // Enfocar input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = Math.max(rect.width, 240);
        let left = rect.left;
        if (left + dropdownWidth > window.innerWidth - 12) {
          left = window.innerWidth - dropdownWidth - 12;
        }
        if (left < 10) left = 10;

        setCoords({
          top: rect.bottom + 4,
          left,
          width: dropdownWidth,
        });
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
    };
  }, [isOpen]);

  // Filtrado de opciones
  const opcionesFiltradas = options.filter((opt) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  return (
    <div className={`relative block w-full min-w-0 ${className}`} title={title}>
      {/* Botón Trigger tipo Select */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full min-w-0 overflow-hidden h-8 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 flex items-center justify-between gap-1.5 shadow-2xs transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate text-left flex-1 min-w-0">
          {selectedOption ? selectedOption.label : allOptionLabel || placeholder}
        </span>
        <Icon
          name="arrow_drop_down"
          size="16px"
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {/* Menú Dropdown en Portal (z-[200] para quedar siempre por encima de modales z-[100]) */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            id={componentId}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="fixed z-[200] bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-72"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Buscador interno */}
            <div className="relative mb-1.5 shrink-0">
              <Icon
                name="search"
                size="14px"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-primary focus:border-brand-primary text-slate-800"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <Icon name="close" size="12px" />
                </button>
              )}
            </div>

            {/* Lista scrollable de opciones */}
            <div className="flex-1 overflow-y-auto space-y-0.5 max-h-48 pr-0.5">
              {/* Opción Todos */}
              {allOptionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                    !value
                      ? 'bg-marca-primario/10 text-marca-primario font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span>{allOptionLabel}</span>
                  {!value && <Icon name="check" size="14px" className="text-marca-primario" />}
                </button>
              )}

              {opcionesFiltradas.length === 0 ? (
                <div className="py-4 text-center text-text-muted text-xs">
                  {emptyText}
                </div>
              ) : (
                opcionesFiltradas.map((opt) => {
                  const isSelected = String(opt.id) === String(value);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-marca-primario/10 text-marca-primario font-bold'
                          : 'text-slate-800 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-text-muted truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Icon name="check" size="14px" className="text-marca-primario shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
