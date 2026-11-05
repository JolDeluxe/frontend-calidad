import { useState, useEffect, useMemo } from 'react';
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
  inspectores,
  filtrosActivos,
  periodosIniciales = null,
  totalDefectosVista,
  totalInspeccionesVista = 0,
  puedeCambiarDepto = true,
  puedeFiltrarInspector = true,
}: RegistroExportModalProps) {
  const [formato, setFormato] = useState<'excel' | 'pdf'>('excel');
  const [filtros, setFiltros] = useState<FiltrosRegistroState>(filtrosActivos);
  const [periodos, setPeriodos] = useState<PeriodosDisponiblesResponse | null>(periodosIniciales);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [confirmarPdfVolumenAlto, setConfirmarPdfVolumenAlto] = useState(false);
  const [volumenDetectadoServidor, setVolumenDetectadoServidor] = useState<{
    totalDefectos: number;
    totalInspecciones: number;
  } | null>(null);

  const hoyIso = useMemo(() => getHoyMexicoIso(), []);

  // Inicializar con los filtros activos de la tabla al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setFiltros({ ...filtrosActivos, esSeleccionInicial: false });
      setPeriodos(periodosIniciales);
      setExportando(false);
      setConfirmarPdfVolumenAlto(false);
      setVolumenDetectadoServidor(null);
    }
  }, [isOpen, filtrosActivos, periodosIniciales]);

  // Consultar periodos disponibles cuando cambian los selectores en el modal
  const queryPeriodos = useMemo(
    () => construirQueryPeriodosDisponibles(filtros),
    [
      filtros.departamentoId,
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
    filtros.lineaTexto,
    filtros.inspectorId,
  ]);

  const deptoSeleccionado = departamentos.find((d) => d.id === filtros.departamentoId);
  const tieneMultiplesLineas = Boolean(
    deptoSeleccionado && (deptoSeleccionado.numeroLineas || 1) > 1
  );

  const estadoConsulta = useMemo(
    () => puedeEjecutarConsultaTemporal(filtros, periodos, hoyIso),
    [filtros, periodos, hoyIso]
  );

  // Determinar si los filtros del modal coinciden exactamente con los de la vista actual
  const coincideConVistaActual = useMemo(() => {
    return (
      filtros.periodo === filtrosActivos.periodo &&
      filtros.anio === filtrosActivos.anio &&
      filtros.mes === filtrosActivos.mes &&
      filtros.anioIso === filtrosActivos.anioIso &&
      filtros.semana === filtrosActivos.semana &&
      filtros.dia === filtrosActivos.dia &&
      filtros.departamentoId === filtrosActivos.departamentoId &&
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

  const handleDeptoChange = (idNum: number | undefined) => {
    const dep = departamentos.find((d) => d.id === idNum);
    setFiltros((prev) => ({
      ...prev,
      departamentoId: idNum,
      lineaTexto: !dep || (dep.numeroLineas || 1) <= 1 ? undefined : prev.lineaTexto,
    }));
  };

  const handleSubmit = async (forzarFormato?: 'excel' | 'pdf', confirmarAltoVolumen = false) => {
    if (!estadoConsulta.listo) return;
    const formatoFinal = forzarFormato || formato;
    setExportando(true);
    try {
      const resultado = await onExportar({
        formato: formatoFinal,
        filtros,
        confirmarPdfVolumenAlto: confirmarAltoVolumen || confirmarPdfVolumenAlto,
      });

      if (resultado && resultado.requiereConfirmacionPdf) {
        setVolumenDetectadoServidor({
          totalDefectos: resultado.totalDefectos || 0,
          totalInspecciones: resultado.totalInspecciones || 0,
        });
        return;
      }

      onClose();
    } catch (err) {
      console.error('Error al exportar:', err);
    } finally {
      setExportando(false);
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Exportar Reporte de Defectos" onClose={onClose} />
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
                <span className="text-[11px] text-slate-500">
                  Sin límite de filas para el período elegido
                </span>
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
                <span className="text-[11px] text-slate-500">Formato horizontal imprimible</span>
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
        </div>

        {/* 3. Filtros de Alcance: Departamento, Inspector y Línea */}
        <div className="space-y-3">
          <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500">
            3. Filtros de Alcance
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Departamento */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Departamento:
              </span>
              <select
                value={filtros.departamentoId ? String(filtros.departamentoId) : ''}
                disabled={!puedeCambiarDepto}
                onChange={(e) =>
                  handleDeptoChange(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer disabled:opacity-60"
              >
                <option value="">Todos los Departamentos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Inspector (solo inspectores activos) */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Inspector activo:
              </span>
              <select
                value={filtros.inspectorId ? String(filtros.inspectorId) : ''}
                disabled={!puedeFiltrarInspector}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    inspectorId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer disabled:opacity-60"
              >
                <option value="">Todos los Inspectores</option>
                {inspectores.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.nombre || insp.usuario}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Línea Operativa (solo si el depto tiene más de 1 línea) */}
          {tieneMultiplesLineas && deptoSeleccionado && (
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Icon name="linear_scale" size="16px" className="text-amber-700" />
                <span className="text-xs font-bold text-amber-950">
                  Línea operativa ({deptoSeleccionado.nombre}):
                </span>
              </div>
              <select
                value={filtros.lineaTexto || ''}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    lineaTexto: e.target.value || undefined,
                  }))
                }
                className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer w-36"
              >
                <option value="">Todas Líneas</option>
                {Array.from(
                  { length: deptoSeleccionado.numeroLineas || 1 },
                  (_, i) => `L${i + 1}`
                ).map((lin) => (
                  <option key={lin} value={lin}>
                    {lin}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Resumen de alcance */}
        <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Alcance seleccionado
            </span>
            <strong className="text-xs font-bold text-slate-900 truncate block">
              {periodoActivoTexto}
            </strong>
          </div>
          {conteoEstimado && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-marca-primario/10 text-marca-primario">
                {conteoEstimado.totalDefectos.toLocaleString('es-MX')} registros
              </span>
            </div>
          )}
        </div>

        {/* Advertencia preventiva no bloqueante cuando PDF supera 2,500 registros */}
        {superaUmbralPdf && conteoEstimado && (
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
          onClick={onClose}
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
              <span>Generando {formato.toUpperCase()}...</span>
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
