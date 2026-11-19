import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { inspeccionesApi } from '@/features/inspecciones/api/inspecciones-api';
import { CalendarioDiaPicker } from './calendario-dia-picker';
import {
  construirQueryPeriodosDisponibles,
  describirPeriodoActivo,
  formatearEtiquetaAnio,
  formatearEtiquetaSemana,
  formatearSemanaIsoCodigo,
  getHoyMexicoIso,
  MODALIDADES_PERIODO_OPCIONES,
  obtenerConteoPeriodoSeleccionado,
  obtenerSemanasDeAnio,
  parsearSemanaIsoCodigo,
  puedeEjecutarConsultaTemporal,
  sincronizarFiltrosConPeriodosDisponibles,
} from '../utils/filtros-registro';
import { UMBRAL_ADVERTENCIA_PDF } from '../utils/exportar-reporte';
import type { ProgresoExportacion } from '@/features/inspecciones/types/inspecciones.types';
import type {
  FiltrosRegistroState,
  InspectorActivoItem,
  ModalidadPeriodoRegistro,
  PeriodosDisponiblesResponse,
} from '../types/registro.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface ExportModalConfig {
  formato: 'excel' | 'pdf';
  filtros: FiltrosRegistroState;
  confirmarPdfVolumenAlto?: boolean;
  onProgreso?: (progreso: ProgresoExportacion) => void;
  signal?: AbortSignal;
}

export interface RegistroExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportar: (
    config: ExportModalConfig
  ) => Promise<{
    requiereConfirmacionPdf?: boolean;
    totalDefectos?: number;
    totalInspecciones?: number;
  } | void>;
  departamentos: Departamento[];
  inspectores: InspectorActivoItem[];
  filtrosActivos: FiltrosRegistroState;
  periodosIniciales?: PeriodosDisponiblesResponse | null;
  totalDefectosVista: number;
  totalInspeccionesVista?: number;
  puedeCambiarDepto?: boolean;
  puedeFiltrarInspector?: boolean;
}

export function RegistroExportModal({
  isOpen,
  onClose,
  onExportar,
  departamentos,
  inspectores: _inspectores,
  filtrosActivos,
  periodosIniciales = null,
  totalDefectosVista,
  totalInspeccionesVista = 0,
  puedeCambiarDepto = true,
  puedeFiltrarInspector: _puedeFiltrarInspector = true,
}: RegistroExportModalProps) {
  const [formato, setFormato] = useState<'excel' | 'pdf'>('excel');
  const [filtros, setFiltros] = useState<FiltrosRegistroState>(filtrosActivos);
  const [periodos, setPeriodos] = useState<PeriodosDisponiblesResponse | null>(periodosIniciales);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [progreso, setProgreso] = useState<ProgresoExportacion | null>(null);
  const [confirmarPdfVolumenAlto, setConfirmarPdfVolumenAlto] = useState(false);
  const [volumenDetectadoServidor, setVolumenDetectadoServidor] = useState<{
    totalDefectos: number;
    totalInspecciones: number;
  } | null>(null);
  const [dropdownDeptosAbierto, setDropdownDeptosAbierto] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const dropdownDeptosRef = useRef<HTMLDivElement>(null);
  const hoyIso = useMemo(() => getHoyMexicoIso(), []);

  // Cerrar dropdown de departamentos al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!dropdownDeptosAbierto) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownDeptosRef.current && !dropdownDeptosRef.current.contains(e.target as Node)) {
        setDropdownDeptosAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownDeptosAbierto(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownDeptosAbierto]);

  // Inicializar con los filtros activos de la tabla al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setFiltros({ ...filtrosActivos, esSeleccionInicial: false });
      setPeriodos(periodosIniciales);
      setExportando(false);
      setProgreso(null);
      setConfirmarPdfVolumenAlto(false);
      setVolumenDetectadoServidor(null);
    }
  }, [isOpen, filtrosActivos, periodosIniciales]);

  // Consultar periodos disponibles cuando cambian los selectores en el modal
  const queryPeriodos = useMemo(
    () => construirQueryPeriodosDisponibles(filtros),
    [
      filtros.departamentoId,
      filtros.departamentosIds,
      filtros.lineaTexto,
      filtros.inspectorId,
      filtros.busqueda,
      filtros.soloEliminados,
      filtros.anio,
      filtros.mes,
      filtros.anioIso,
      filtros.semana,
    ]
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    setCargandoPeriodos(true);

    inspeccionesApi
      .getPeriodosDisponibles(queryPeriodos)
      .then((res) => {
        if (cancelado) return;
        setPeriodos(res);
        setFiltros((prev) => sincronizarFiltrosConPeriodosDisponibles(prev, res));
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error al consultar periodos disponibles en modal de exportación', err);
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPeriodos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, queryPeriodos]);

  // Resetear confirmación de PDF si cambia formato o filtros
  useEffect(() => {
    setConfirmarPdfVolumenAlto(false);
    setVolumenDetectadoServidor(null);
  }, [
    formato,
    filtros.periodo,
    filtros.anio,
    filtros.mes,
    filtros.anioIso,
    filtros.semana,
    filtros.dia,
    filtros.departamentoId,
    filtros.departamentosIds,
    filtros.lineaTexto,
    filtros.inspectorId,
  ]);

  const deptosSeleccionados = useMemo(() => {
    if (filtros.departamentosIds && filtros.departamentosIds.length > 0) {
      return departamentos.filter((d) => filtros.departamentosIds!.includes(d.id));
    }
    if (filtros.departamentoId) {
      const found = departamentos.find((d) => d.id === filtros.departamentoId);
      return found ? [found] : [];
    }
    return [];
  }, [departamentos, filtros.departamentoId, filtros.departamentosIds]);

  const textoTriggerDeptos = useMemo(() => {
    if (deptosSeleccionados.length === 0 || deptosSeleccionados.length === departamentos.length) {
      return 'Todos los departamentos';
    }
    if (deptosSeleccionados.length === 1) {
      return deptosSeleccionados[0].nombre;
    }
    if (deptosSeleccionados.length === 2) {
      return `${deptosSeleccionados[0].nombre}, ${deptosSeleccionados[1].nombre}`;
    }
    return `${deptosSeleccionados.length} departamentos seleccionados`;
  }, [deptosSeleccionados, departamentos.length]);

  // Departamentos base para evaluar si aplican múltiples líneas
  const deptosParaLineas = useMemo(() => {
    return deptosSeleccionados.length > 0 ? deptosSeleccionados : departamentos;
  }, [deptosSeleccionados, departamentos]);

  // Líneas disponibles dinámicamente según los departamentos en alcance
  const maxLineas = useMemo(() => {
    if (deptosParaLineas.length === 0) return 1;
    return Math.max(1, ...deptosParaLineas.map((d) => d.numeroLineas || 1));
  }, [deptosParaLineas]);

  const tieneMultiplesLineas = maxLineas > 1;

  const lineasDisponibles = useMemo(
    () => Array.from({ length: maxLineas }, (_, i) => `L${i + 1}`),
    [maxLineas]
  );

  useEffect(() => {
    if (!tieneMultiplesLineas && filtros.lineaTexto) {
      setFiltros((prev) => ({ ...prev, lineaTexto: undefined }));
    } else if (filtros.lineaTexto && !lineasDisponibles.includes(filtros.lineaTexto)) {
      setFiltros((prev) => ({ ...prev, lineaTexto: undefined }));
    }
  }, [tieneMultiplesLineas, lineasDisponibles, filtros.lineaTexto]);

  const estadoConsulta = useMemo(
    () => puedeEjecutarConsultaTemporal(filtros, periodos, hoyIso),
    [filtros, periodos, hoyIso]
  );

  // Determinar si los filtros del modal coinciden exactamente con los de la vista actual
  const coincideConVistaActual = useMemo(() => {
    const sonMismosDeptos =
      (!filtros.departamentosIds?.length &&
        !filtrosActivos.departamentosIds?.length &&
        filtros.departamentoId === filtrosActivos.departamentoId) ||
      (Boolean(filtros.departamentosIds?.length) &&
        Boolean(filtrosActivos.departamentosIds?.length) &&
        filtros.departamentosIds!.length === filtrosActivos.departamentosIds!.length &&
        filtros.departamentosIds!.every((id) => filtrosActivos.departamentosIds!.includes(id)));

    return (
      filtros.periodo === filtrosActivos.periodo &&
      filtros.anio === filtrosActivos.anio &&
      filtros.mes === filtrosActivos.mes &&
      filtros.anioIso === filtrosActivos.anioIso &&
      filtros.semana === filtrosActivos.semana &&
      filtros.dia === filtrosActivos.dia &&
      sonMismosDeptos &&
      filtros.lineaTexto === filtrosActivos.lineaTexto &&
      filtros.inspectorId === filtrosActivos.inspectorId
    );
  }, [filtros, filtrosActivos]);

  const conteoEstimado = useMemo(() => {
    if (volumenDetectadoServidor) return volumenDetectadoServidor;
    if (coincideConVistaActual) {
      return {
        totalDefectos: totalDefectosVista,
        totalInspecciones: totalInspeccionesVista,
      };
    }
    return obtenerConteoPeriodoSeleccionado(filtros, periodos);
  }, [
    volumenDetectadoServidor,
    coincideConVistaActual,
    totalDefectosVista,
    totalInspeccionesVista,
    filtros,
    periodos,
  ]);

  const superaUmbralPdf = Boolean(
    formato === 'pdf' &&
      conteoEstimado &&
      conteoEstimado.totalDefectos > UMBRAL_ADVERTENCIA_PDF
  );

  const semanasDelAnioSeleccionado = useMemo(
    () => obtenerSemanasDeAnio(periodos?.semanas, filtros.anioIso ?? filtros.anio),
    [periodos?.semanas, filtros.anioIso, filtros.anio]
  );

  const handleModalidadChange = (nuevaModalidad: ModalidadPeriodoRegistro) => {
    setFiltros((prev) =>
      sincronizarFiltrosConPeriodosDisponibles(
        {
          ...prev,
          periodo: nuevaModalidad,
          esSeleccionInicial: false,
        },
        periodos
      )
    );
  };

  const handleToggleDepto = (idNum: number) => {
    setFiltros((prev) => {
      const idsActuales =
        prev.departamentosIds && prev.departamentosIds.length > 0
          ? [...prev.departamentosIds]
          : prev.departamentoId
          ? [prev.departamentoId]
          : [];

      const existe = idsActuales.includes(idNum);
      const nuevosIds = existe
        ? idsActuales.filter((id) => id !== idNum)
        : [...idsActuales, idNum];

      const nuevoDeptoId = nuevosIds.length === 1 ? nuevosIds[0] : undefined;
      const dep = nuevoDeptoId ? departamentos.find((d) => d.id === nuevoDeptoId) : null;

      return {
        ...prev,
        departamentoId: nuevoDeptoId,
        departamentosIds: nuevosIds.length > 0 ? nuevosIds : undefined,
        lineaTexto: !dep || (dep.numeroLineas || 1) <= 1 ? undefined : prev.lineaTexto,
      };
    });
  };

  const handleSeleccionarTodosDeptos = () => {
    setFiltros((prev) => ({
      ...prev,
      departamentoId: undefined,
      departamentosIds: undefined,
      lineaTexto: undefined,
    }));
  };

  const handleCloseSeguro = () => {
    if (exportando) {
      abortControllerRef.current?.abort();
    }
    onClose();
  };

  const handleSubmit = async (forzarFormato?: 'excel' | 'pdf', confirmarAltoVolumen = false) => {
    if (!estadoConsulta.listo) return;
    const formatoFinal = forzarFormato || formato;
    setExportando(true);
    setProgreso({
      cargados: 0,
      total: conteoEstimado?.totalDefectos || 0,
      porcentaje: 0,
      paginaActual: 1,
      totalPaginas: 1,
    });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const resultado = await onExportar({
        formato: formatoFinal,
        filtros,
        confirmarPdfVolumenAlto: confirmarAltoVolumen || confirmarPdfVolumenAlto,
        onProgreso: (p) => setProgreso(p),
        signal: controller.signal,
      });

      if (resultado && resultado.requiereConfirmacionPdf) {
        setVolumenDetectadoServidor({
          totalDefectos: resultado.totalDefectos || 0,
          totalInspecciones: resultado.totalInspecciones || 0,
        });
        return;
      }

      onClose();
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('cancelada')) {
        console.warn('Exportación cancelada por el usuario');
      } else {
        console.error('Error al exportar:', err);
      }
    } finally {
      setExportando(false);
      setProgreso(null);
      abortControllerRef.current = null;
    }
  };

  const periodoActivoTexto = useMemo(
    () => describirPeriodoActivo(filtros, periodos),
    [filtros, periodos]
  );

  const sinDatosEnModalidad = Boolean(
    periodos &&
      ((filtros.periodo === 'anio' && periodos.anios.length === 0) ||
        (filtros.periodo === 'mes' && periodos.meses.length === 0) ||
        (filtros.periodo === 'semana' && semanasDelAnioSeleccionado.length === 0) ||
        (filtros.periodo === 'dia' && periodos.dias.length === 0))
  );

  return (
    <Modal isOpen={isOpen} onClose={handleCloseSeguro} size="xl">
      <ModalHeader title="Exportar Reporte de Defectos" onClose={handleCloseSeguro} />
      <ModalBody className="space-y-4 text-xs">
        {/* 1. Selección de Formato */}
        <div>
          <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            1. Formato de Exportación
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormato('excel')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                formato === 'excel'
                  ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  formato === 'excel'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Icon name="table_view" size="20px" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block text-xs">Excel (.csv completo)</span>

              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormato('pdf')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                formato === 'pdf'
                  ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  formato === 'pdf'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Icon name="picture_as_pdf" size="20px" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block text-xs">Documento PDF</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Alcance Temporal / Período */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-600">
              2. Período a Exportar
            </label>
            {cargandoPeriodos && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Spinner size="xs" />
                <span>Actualizando periodos...</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {MODALIDADES_PERIODO_OPCIONES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleModalidadChange(mod.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                  filtros.periodo === mod.id
                    ? 'bg-marca-primario text-white border-marca-primario shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {mod.shortLabel}
              </button>
            ))}
          </div>

          {/* Selector dinámico por Año (sin conteos) */}
          {filtros.periodo === 'anio' && (
            <div className="pt-1 animate-in fade-in duration-150">
              <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Año:</span>
              {periodos && periodos.anios.length > 0 ? (
                <select
                  value={filtros.anio ?? ''}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      anio: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {periodos.anios.map((a) => (
                    <option key={a.anio} value={a.anio}>
                      {formatearEtiquetaAnio(a.anio)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  No existen años con registros para los filtros seleccionados.
                </p>
              )}
            </div>
          )}

          {/* Selectores dinámicos por Mes y Año */}
          {filtros.periodo === 'mes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Año:</span>
                <select
                  value={filtros.anio ?? ''}
                  disabled={!periodos || periodos.anios.length === 0}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      anio: e.target.value ? Number(e.target.value) : undefined,
                      mes: undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {(!periodos || periodos.anios.length === 0) && (
                    <option value="">Sin años disponibles</option>
                  )}
                  {periodos?.anios.map((a) => (
                    <option key={a.anio} value={a.anio}>
                      {formatearEtiquetaAnio(a.anio)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Mes:</span>
                <select
                  value={filtros.mes ?? ''}
                  disabled={!periodos || periodos.meses.length === 0}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      mes: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {(!periodos || periodos.meses.length === 0) && (
                    <option value="">Sin meses con registros</option>
                  )}
                  {periodos?.meses.map((m) => (
                    <option key={`${m.anio}-${m.mes}`} value={m.mes}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selectores dinámicos por Semana (sin texto ISO ni conteos) */}
          {filtros.periodo === 'semana' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 animate-in fade-in duration-150">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Año:</span>
                <select
                  value={filtros.anioIso ?? ''}
                  disabled={!periodos || (periodos.aniosIso || []).length === 0}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      anioIso: e.target.value ? Number(e.target.value) : undefined,
                      semana: undefined,
                      semanaIsoCodigo: undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {(!periodos || (periodos.aniosIso || []).length === 0) && (
                    <option value="">Sin años</option>
                  )}
                  {(periodos?.aniosIso || []).map((a) => (
                    <option key={a.anioIso} value={a.anioIso}>
                      {formatearEtiquetaAnio(a.anioIso)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Semana:
                </span>
                <select
                  value={
                    filtros.anioIso && filtros.semana
                      ? formatearSemanaIsoCodigo(filtros.anioIso, filtros.semana)
                      : ''
                  }
                  disabled={semanasDelAnioSeleccionado.length === 0}
                  onChange={(e) => {
                    const parsed = parsearSemanaIsoCodigo(e.target.value);
                    if (parsed) {
                      setFiltros((prev) => ({
                        ...prev,
                        anioIso: parsed.anioIso,
                        semana: parsed.semana,
                        semanaIsoCodigo: parsed.codigo,
                      }));
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {semanasDelAnioSeleccionado.length === 0 && (
                    <option value="">Sin semanas con registros</option>
                  )}
                  {semanasDelAnioSeleccionado.map((s) => (
                    <option key={s.codigo} value={s.codigo}>
                      {formatearEtiquetaSemana(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selector de Día mediante Calendario */}
          {filtros.periodo === 'dia' && (
            <div className="pt-1 animate-in fade-in duration-150">
              <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                Fecha con registros disponibles:
              </span>
              <CalendarioDiaPicker
                value={filtros.dia}
                anio={filtros.anio}
                mes={filtros.mes}
                aniosDisponibles={periodos?.anios || []}
                mesesDisponibles={periodos?.meses || []}
                diasDisponibles={periodos?.dias || []}
                hoyIso={periodos?.rangoTotal.hoy || hoyIso}
                disabled={!periodos || periodos.anios.length === 0}
                className="w-full sm:w-56"
                onSelectDia={(fechaIso, anioSel, mesSel) =>
                  setFiltros((prev) => ({
                    ...prev,
                    dia: fechaIso,
                    anio: anioSel,
                    mes: mesSel,
                  }))
                }
                onCambiarMesAnio={(nuevoAnio, nuevoMes) =>
                  setFiltros((prev) => ({
                    ...prev,
                    anio: nuevoAnio,
                    mes: nuevoMes,
                    dia: undefined,
                  }))
                }
              />
            </div>
          )}

          {/* Selector de Rango Personalizado (Desde y Hasta) */}
          {filtros.periodo === 'rango' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Fecha Desde:
                </span>
                <input
                  type="date"
                  value={filtros.fechaDesde || ''}
                  max={filtros.fechaHasta || periodos?.rangoTotal.hoy || hoyIso}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      fechaDesde: e.target.value || undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                  Fecha Hasta:
                </span>
                <input
                  type="date"
                  value={filtros.fechaHasta || ''}
                  min={filtros.fechaDesde || undefined}
                  max={periodos?.rangoTotal.hoy || hoyIso}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      fechaHasta: e.target.value || undefined,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Filtros de Alcance: Departamentos y Líneas */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-600">
              3. Alcance: Departamentos y Líneas
            </label>
            {deptosSeleccionados.length > 0 && (
              <button
                type="button"
                onClick={handleSeleccionarTodosDeptos}
                className="text-[10px] font-bold text-marca-primario hover:underline cursor-pointer"
              >
                Restablecer a todos ({deptosSeleccionados.length} seleccionado{deptosSeleccionados.length > 1 ? 's' : ''})
              </button>
            )}
          </div>

          <div className={tieneMultiplesLineas ? "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start" : "space-y-3"}>
            {/* 1. Selector de Departamento(s) mediante Dropdown con Checkboxes perfectamente alineados */}
            <div ref={dropdownDeptosRef}>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Departamento(s):
              </span>
              <button
                type="button"
                disabled={!puedeCambiarDepto}
                onClick={() => setDropdownDeptosAbierto((prev) => !prev)}
                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-left text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer disabled:opacity-60 flex items-center justify-between gap-2 shadow-2xs hover:bg-slate-50/80 transition-colors"
                title={textoTriggerDeptos}
              >
                <div className="truncate flex items-center gap-2 min-w-0">
                  <Icon name="domain" size="16px" className="text-slate-400 shrink-0" />
                  <span className="truncate">{textoTriggerDeptos}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {deptosSeleccionados.length > 1 && deptosSeleccionados.length < departamentos.length && (
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-marca-primario/10 text-marca-primario">
                      {deptosSeleccionados.length}
                    </span>
                  )}
                  <Icon
                    name="expand_more"
                    size="16px"
                    className={`text-slate-400 transition-transform duration-200 ${
                      dropdownDeptosAbierto ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Menú desplegable en flujo normal (expande el modal hacia abajo sin cortarse) */}
              {dropdownDeptosAbierto && (
                <div className="mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xs p-1.5 animate-in fade-in-50 duration-150">
                  {/* Opción Todos los Departamentos */}
                  <button
                    type="button"
                    onClick={handleSeleccionarTodosDeptos}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          deptosSeleccionados.length === 0 || deptosSeleccionados.length === departamentos.length
                            ? 'bg-marca-primario border-marca-primario text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {(deptosSeleccionados.length === 0 || deptosSeleccionados.length === departamentos.length) && (
                          <Icon name="check" size="13px" className="stroke-[3]" />
                        )}
                      </div>
                      <span>Todos los Departamentos</span>
                    </div>
                    {deptosSeleccionados.length > 0 && deptosSeleccionados.length < departamentos.length && (
                      <span className="text-[10px] font-semibold text-marca-primario">
                        Restablecer
                      </span>
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Lista de Departamentos (Solo nombres limpios, sin códigos) */}
                  <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                    {departamentos.map((d) => {
                      const isSelected = deptosSeleccionados.some((sel) => sel.id === d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => handleToggleDepto(d.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-marca-primario/5 text-slate-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-marca-primario border-marca-primario text-white'
                                  : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Icon name="check" size="13px" className="stroke-[3]" />}
                            </div>
                            <span className="truncate">{d.nombre}</span>
                          </div>
                          {(d.numeroLineas ?? 1) > 1 && (
                            <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                              {d.numeroLineas} líneas
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Selector de Línea Operativa (SOLO visible si hay departamentos con más de 1 línea) */}
            {tieneMultiplesLineas && (
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  Línea Operativa:
                </span>
                <select
                  value={filtros.lineaTexto || ''}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      lineaTexto: e.target.value || undefined,
                    }))
                  }
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shadow-2xs"
                  title="Filtrar por línea operativa"
                >
                  <option value="">Todas las líneas</option>
                  {lineasDisponibles.map((lin) => (
                    <option key={lin} value={lin}>
                      Línea {lin}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de alcance */}
        <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Alcance de la Exportación
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <strong className="font-extrabold text-slate-900">{periodoActivoTexto}</strong>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-marca-primario">
                {deptosSeleccionados.length === 0
                  ? 'Planta Completa (Todos los Deptos)'
                  : deptosSeleccionados.length === 1
                  ? `Depto: ${deptosSeleccionados[0].nombre}`
                  : `Deptos (${deptosSeleccionados.length}): ${deptosSeleccionados.map((d) => d.nombre).join(', ')}`}
              </span>
              {filtros.lineaTexto && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-semibold">Línea {filtros.lineaTexto}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cargandoPeriodos ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600 animate-pulse">
                <Spinner size="xs" />
                <span>Calculando registros...</span>
              </span>
            ) : conteoEstimado ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-marca-primario/10 text-marca-primario shadow-2xs">
                {conteoEstimado.totalDefectos.toLocaleString('es-MX')} registros
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600">
                0 registros
              </span>
            )}
          </div>
        </div>

        {/* Barra de progreso interactiva para exportaciones de cualquier volumen */}
        {exportando && (
          <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 text-blue-950 space-y-3 animate-in fade-in duration-200 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-2 text-blue-950">
                <Spinner size="xs" className="text-blue-700" />
                <span>Descargando registros ({progreso?.porcentaje ?? 0}%)</span>
              </span>
              <span className="font-mono font-extrabold text-blue-800">
                {progreso?.cargados.toLocaleString('es-MX') || 0} /{' '}
                {(progreso?.total || conteoEstimado?.totalDefectos || 0).toLocaleString('es-MX')}
              </span>
            </div>

            {/* Barra animada de progreso */}
            <div className="w-full bg-blue-200/80 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(4, progreso?.porcentaje || 0)}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-blue-900 gap-1 leading-snug">
              <span>
                {progreso && progreso.totalPaginas > 1
                  ? `Recuperando bloque ${progreso.paginaActual} de ${progreso.totalPaginas} de forma segura...`
                  : 'Iniciando descarga segura por bloques desde el servidor...'}
              </span>
              <span className="text-[10px] font-semibold text-blue-700">
                Por favor, no cierre esta ventana.
              </span>
            </div>
          </div>
        )}

        {/* Advertencia preventiva no bloqueante cuando PDF supera 2,500 registros */}
        {superaUmbralPdf && conteoEstimado && !exportando && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-start gap-2">
              <Icon name="warning" size="18px" className="text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs">
                  Volumen elevado para impresión PDF ({conteoEstimado.totalDefectos.toLocaleString('es-MX')}{' '}
                  registros)
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  La generación del documento PDF para más de {UMBRAL_ADVERTENCIA_PDF.toLocaleString('es-MX')}{' '}
                  defectos puede tardar varios segundos en el motor de impresión del navegador. Para análisis masivos recomendamos exportar en Excel (.csv), o bien confirme si desea continuar con PDF.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exportando}
                onClick={() => {
                  setFormato('excel');
                  void handleSubmit('excel', false);
                }}
                className="text-xs font-bold border-emerald-600 text-emerald-800 hover:bg-emerald-50 cursor-pointer gap-1.5"
              >
                <Icon name="table_view" size="14px" />
                <span>Exportar en Excel (.csv)</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={exportando}
                onClick={() => {
                  setConfirmarPdfVolumenAlto(true);
                  void handleSubmit('pdf', true);
                }}
                className="text-xs font-bold bg-amber-700 hover:bg-amber-800 cursor-pointer gap-1.5"
              >
                <Icon name="picture_as_pdf" size="14px" />
                <span>Continuar con PDF de todas formas</span>
              </Button>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exportando}
          onClick={handleCloseSeguro}
          className="text-xs font-semibold cursor-pointer"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={exportando || !estadoConsulta.listo || sinDatosEnModalidad}
          onClick={() => void handleSubmit()}
          className="gap-2 text-xs font-bold cursor-pointer px-5"
        >
          {exportando ? (
            <>
              <Spinner size="xs" />
              <span>
                Exportando {progreso ? `${progreso.porcentaje}%` : '...'}
              </span>
            </>
          ) : (
            <>
              <Icon
                name={formato === 'excel' ? 'table_view' : 'picture_as_pdf'}
                size="16px"
              />
              <span>
                Descargar {formato === 'excel' ? 'Excel (.csv)' : 'PDF'}
              </span>
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
