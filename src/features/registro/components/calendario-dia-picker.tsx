import { useState, useRef, useEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import {
  construirGrillaCalendarioMes,
  formatearEtiquetaAnio,
  formatearFechaCortaIso,
  getHoyMexicoIso,
} from '../utils/filtros-registro';
import type {
  PeriodoAnioDisponible,
  PeriodoDiaDisponible,
  PeriodoMesDisponible,
} from '../types/registro.types';

const DIAS_SEMANA_CABECERA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export interface CalendarioDiaPickerProps {
  value?: string;
  anio?: number;
  mes?: number;
  aniosDisponibles: PeriodoAnioDisponible[];
  mesesDisponibles: PeriodoMesDisponible[];
  diasDisponibles: PeriodoDiaDisponible[];
  hoyIso?: string;
  disabled?: boolean;
  className?: string;
  onSelectDia: (fechaIso: string, anio: number, mes: number) => void;
  onCambiarMesAnio?: (anio?: number, mes?: number) => void;
}

export function CalendarioDiaPicker({
  value,
  anio,
  mes,
  aniosDisponibles,
  mesesDisponibles,
  diasDisponibles,
  hoyIso = getHoyMexicoIso(),
  disabled = false,
  className = '',
  onSelectDia,
  onCambiarMesAnio,
}: CalendarioDiaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 280,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const componentId = useId();

  const [anioVista, setAnioVista] = useState<number | undefined>(anio);
  const [mesVista, setMesVista] = useState<number | undefined>(mes);

  useEffect(() => {
    if (anio !== undefined) {
      setAnioVista(anio);
    }
  }, [anio]);

  useEffect(() => {
    if (mes !== undefined) {
      setMesVista(mes);
    }
  }, [mes]);

  const anioActivo = anioVista ?? anio ?? aniosDisponibles[0]?.anio ?? Number(hoyIso.slice(0, 4));
  const mesesDelAnio = useMemo(
    () =>
      mesesDisponibles
        .filter((m) => !anioActivo || m.anio === anioActivo)
        .sort((a, b) => a.mes - b.mes),
    [mesesDisponibles, anioActivo]
  );

  const mesActivo = useMemo(() => {
    const candidato = mesVista ?? mes;
    if (candidato && (mesesDelAnio.length === 0 || mesesDelAnio.some((m) => m.mes === candidato))) {
      return candidato;
    }
    if (mesesDelAnio.length > 0) {
      return mesesDelAnio[mesesDelAnio.length - 1]!.mes;
    }
    return candidato ?? mesesDisponibles[0]?.mes ?? Number(hoyIso.slice(5, 7));
  }, [mesVista, mes, mesesDelAnio, mesesDisponibles, hoyIso]);

  const celdas = useMemo(
    () => construirGrillaCalendarioMes(anioActivo, mesActivo, diasDisponibles, hoyIso),
    [anioActivo, mesActivo, diasDisponibles, hoyIso]
  );

  const idxMesActual = mesesDelAnio.findIndex((m) => m.mes === mesActivo);
  const aniosOrdenadosAsc = useMemo(
    () => [...aniosDisponibles].sort((a, b) => a.anio - b.anio),
    [aniosDisponibles]
  );
  const idxAnioActual = aniosOrdenadosAsc.findIndex((a) => a.anio === anioActivo);

  const puedeMesAnterior = idxMesActual > 0 || idxAnioActual > 0;
  const puedeMesSiguiente =
    (idxMesActual >= 0 && idxMesActual < mesesDelAnio.length - 1) ||
    (idxAnioActual >= 0 && idxAnioActual < aniosOrdenadosAsc.length - 1);

  const handleIrMesAnterior = () => {
    if (idxMesActual > 0) {
      const prevMes = mesesDelAnio[idxMesActual - 1]!.mes;
      setMesVista(prevMes);
      onCambiarMesAnio?.(anioActivo, prevMes);
    } else if (idxAnioActual > 0) {
      const prevAnio = aniosOrdenadosAsc[idxAnioActual - 1]!.anio;
      setAnioVista(prevAnio);
      setMesVista(undefined);
      onCambiarMesAnio?.(prevAnio, undefined);
    }
  };

  const handleIrMesSiguiente = () => {
    if (idxMesActual >= 0 && idxMesActual < mesesDelAnio.length - 1) {
      const nextMes = mesesDelAnio[idxMesActual + 1]!.mes;
      setMesVista(nextMes);
      onCambiarMesAnio?.(anioActivo, nextMes);
    } else if (idxAnioActual >= 0 && idxAnioActual < aniosOrdenadosAsc.length - 1) {
      const nextAnio = aniosOrdenadosAsc[idxAnioActual + 1]!.anio;
      setAnioVista(nextAnio);
      setMesVista(undefined);
      onCambiarMesAnio?.(nextAnio, undefined);
    }
  };

  const calcularPosicion = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 284;
    const popoverEstimatedHeight = 310;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 10) left = 10;

    let top = rect.bottom + 4;
    if (top + popoverEstimatedHeight > window.innerHeight - 12) {
      if (rect.top - popoverEstimatedHeight - 4 >= 12) {
        top = rect.top - popoverEstimatedHeight - 4;
      } else {
        top = Math.max(12, window.innerHeight - popoverEstimatedHeight - 12);
      }
    }

    setCoords({
      top,
      left,
      width: popoverWidth,
    });
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      calcularPosicion();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        calcularPosicion();
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

  const etiquetaSeleccionada = value
    ? formatearFechaCortaIso(value)
    : 'Seleccionar fecha...';

  return (
    <div className={`relative inline-block min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        data-value={value || ''}
        title="Seleccionar día en el calendario"
        className={`w-full h-8 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 inline-flex items-center justify-between gap-2 shadow-2xs transition-colors ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 truncate min-w-0">
          <Icon name="calendar_month" size="15px" className="text-marca-primario shrink-0" />
          <span className="font-mono truncate">{etiquetaSeleccionada}</span>
        </span>
        <Icon
          name="arrow_drop_down"
          size="16px"
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            id={componentId}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="fixed z-[200] bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del calendario: Navegación de Mes y Año con registros */}
            <div className="flex items-center justify-between gap-1 mb-2 pb-2 border-b border-slate-100">
              <button
                type="button"
                disabled={!puedeMesAnterior}
                onClick={handleIrMesAnterior}
                title="Mes anterior con registros"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
              >
                <Icon name="chevron_left" size="16px" />
              </button>

              <select
                value={mesActivo}
                disabled={mesesDisponibles.length === 0}
                onChange={(e) => {
                  const nuevoMes = e.target.value ? Number(e.target.value) : undefined;
                  setMesVista(nuevoMes);
                  onCambiarMesAnio?.(anioActivo, nuevoMes);
                }}
                className="w-auto flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                title="Mes"
              >
                {mesesDisponibles.length === 0 && <option value={mesActivo}>Sin meses</option>}
                {(mesesDelAnio.length > 0 ? mesesDelAnio : mesesDisponibles).map((m) => (
                  <option key={`${m.anio}-${m.mes}`} value={m.mes}>
                    {m.nombre}
                  </option>
                ))}
              </select>

              <select
                value={anioActivo}
                disabled={aniosDisponibles.length === 0}
                onChange={(e) => {
                  const nuevoAnio = e.target.value ? Number(e.target.value) : undefined;
                  setAnioVista(nuevoAnio);
                  setMesVista(undefined);
                  onCambiarMesAnio?.(nuevoAnio, undefined);
                }}
                className="w-20 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
                title="Año"
              >
                {aniosDisponibles.length === 0 && (
                  <option value={anioActivo}>{formatearEtiquetaAnio(anioActivo)}</option>
                )}
                {aniosDisponibles.map((a) => (
                  <option key={a.anio} value={a.anio}>
                    {formatearEtiquetaAnio(a.anio)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!puedeMesSiguiente}
                onClick={handleIrMesSiguiente}
                title="Mes siguiente con registros"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
              >
                <Icon name="chevron_right" size="16px" />
              </button>
            </div>

            {/* Encabezado de días de la semana (Lunes a Domingo) */}
            <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
              {DIAS_SEMANA_CABECERA.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-0.5"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Cuadrícula de días */}
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((celda) => {
                const seleccionado = celda.fecha === value;

                if (!celda.esDelMesActual) {
                  return (
                    <div
                      key={celda.fecha}
                      className="h-7 flex items-center justify-center text-[11px] text-slate-300"
                    >
                      {celda.dia}
                    </div>
                  );
                }

                return (
                  <button
                    key={celda.fecha}
                    type="button"
                    disabled={!celda.seleccionable}
                    onClick={() => {
                      if (!celda.seleccionable) return;
                      onSelectDia(celda.fecha, celda.anio, celda.mes);
                      setIsOpen(false);
                    }}
                    title={
                      celda.esFuturo
                        ? 'Fecha futura no disponible'
                        : celda.tieneRegistros
                        ? `${formatearFechaCortaIso(celda.fecha)}`
                        : 'Sin registros en esta fecha'
                    }
                    className={`h-7 rounded-lg text-[11px] font-semibold flex flex-col items-center justify-center transition-colors relative ${
                      seleccionado
                        ? 'bg-marca-primario text-white font-extrabold shadow-2xs cursor-pointer'
                        : celda.seleccionable
                        ? 'bg-emerald-50/70 text-slate-800 hover:bg-marca-primario/15 hover:text-marca-primario border border-emerald-200/80 cursor-pointer font-bold'
                        : 'text-slate-300 bg-slate-50/50 cursor-not-allowed'
                    }`}
                  >
                    <span>{celda.dia}</span>
                    {celda.tieneRegistros && !seleccionado && (
                      <span className="w-1 h-1 rounded-full bg-emerald-600 absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leyenda discreta inferior */}
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Días con registros</span>
              </span>
              {value && (
                <span className="font-mono font-semibold text-slate-700">{value}</span>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
