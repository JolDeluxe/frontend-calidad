import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { RegistroHistoricoTabla } from '../components/registro-historico-tabla';
import { SearchableSelect } from '../components/searchable-select';
import { CalendarioDiaPicker } from '../components/calendario-dia-picker';
import { RegistroExportModal, type ExportModalConfig } from '../components/registro-export-modal';
import {
  exportarRegistrosAExcel,
  exportarRegistrosAPdf,
  UMBRAL_ADVERTENCIA_PDF,
} from '../utils/exportar-reporte';
import {
  construirQueryInspecciones,
  construirQueryPeriodosDisponibles,
  describirPeriodoActivo,
  formatearEtiquetaAnio,
  formatearEtiquetaSemana,
  formatearSemanaIsoCodigo,
  getHoyMexicoIso,
  leerFiltrosDesdeSearchParams,
  MODALIDADES_PERIODO_OPCIONES,
  obtenerSemanasDeAnio,
  parsearSemanaIsoCodigo,
  puedeEjecutarConsultaTemporal,
  serializarFiltrosASearchParams,
  sincronizarFiltrosConPeriodosDisponibles,
  tieneFiltrosActivos,
} from '../utils/filtros-registro';
import { InspeccionDetalleModal } from '@/features/inspecciones/components/inspeccion-detalle-modal';
import { inspeccionesApi } from '@/features/inspecciones/api/inspecciones-api';
import { useAuthSession } from '@/providers/auth-provider';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { toast } from '@/components/ui/toast';
import type {
  FiltrosRegistroState,
  InspeccionFilaResponse,
  InspectorActivoItem,
  ModalidadPeriodoRegistro,
  PeriodosDisponiblesResponse,
} from '../types/registro.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

const ROLES_CON_CAMBIO_DEPTO = ['SUPER_ADMIN', 'ADMIN', 'COORD'];

export function RegistroPage() {
  const { user } = useAuthSession();
  const { can, canAny } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const rolCodigo = user?.rol?.codigo || '';
  const puedeCambiarDepto = ROLES_CON_CAMBIO_DEPTO.includes(rolCodigo);
  const puedeFiltrarInspector =
    puedeCambiarDepto || canAny('calidad.ver', 'reportes.ver', 'inspecciones.todas');
  const puedeVerEliminados = can('defectos.eliminar');

  const hoyIso = useMemo(() => getHoyMexicoIso(), []);

  // Estado de filtros leído desde la URL de forma tipada y acotada
  const filtrosUrl = useMemo(() => {
    const base = leerFiltrosDesdeSearchParams(searchParams);
    if (!puedeVerEliminados && base.soloEliminados) {
      return { ...base, soloEliminados: false };
    }
    return base;
  }, [searchParams, puedeVerEliminados]);

  // Periodos reales devueltos por el backend según los filtros activos
  const [periodosDisponibles, setPeriodosDisponibles] =
    useState<PeriodosDisponiblesResponse | null>(null);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);

  // Filtros efectivos sincronizados con los periodos reales disponibles
  const filtros = useMemo(
    () => sincronizarFiltrosConPeriodosDisponibles(filtrosUrl, periodosDisponibles),
    [filtrosUrl, periodosDisponibles]
  );

  const [inputBusqueda, setInputBusqueda] = useState(filtros.busqueda || '');
  const [items, setItems] = useState<InspeccionFilaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalInspecciones, setTotalInspecciones] = useState(0);
  const [page, setPage] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Catálogos dinámicos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [inspectores, setInspectores] = useState<InspectorActivoItem[]>([]);

  // Modales
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
  const [itemDetalle, setItemDetalle] = useState<InspeccionFilaResponse | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [mostrarBotonArriba, setMostrarBotonArriba] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtrosUrlRef = useRef<FiltrosRegistroState>(filtrosUrl);
  filtrosUrlRef.current = filtrosUrl;

  // Detectar scroll para mostrar el botón de regresar arriba
  useEffect(() => {
    const mainEl = document.querySelector('main');

    const handleScroll = () => {
      const scrollY = mainEl ? mainEl.scrollTop : window.scrollY;
      setMostrarBotonArriba(scrollY > 280);
    };

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleScrollArriba = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sincronizar input de búsqueda con cambios de URL
  useEffect(() => {
    setInputBusqueda(filtros.busqueda || '');
  }, [filtros.busqueda]);

  // Cargar departamentos una sola vez
  useEffect(() => {
    let cancelado = false;
    inspeccionesApi
      .getDepartamentos()
      .then((res) => {
        if (!cancelado) setDepartamentos(res);
      })
      .catch((err) => {
        console.error('Error cargando departamentos en registro', err);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Cargar inspectores activos según departamento seleccionado
  useEffect(() => {
    if (!puedeFiltrarInspector) {
      setInspectores([]);
      return;
    }

    let cancelado = false;
    const deptoId = filtros.departamentoId ?? undefined;

    inspeccionesApi
      .getInspectores({ departamentoId: deptoId })
      .then((inspectoresRes) => {
        if (!cancelado) setInspectores(inspectoresRes);
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error cargando inspectores activos en registro', err);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [filtros.departamentoId, puedeFiltrarInspector]);

  // Consultar periodos disponibles reales en el backend cuando cambian los filtros de contexto
  const queryPeriodos = useMemo(
    () => construirQueryPeriodosDisponibles(filtrosUrl),
    [
      filtrosUrl.departamentoId,
      filtrosUrl.lineaTexto,
      filtrosUrl.inspectorId,
      filtrosUrl.busqueda,
      filtrosUrl.soloEliminados,
      filtrosUrl.anio,
      filtrosUrl.mes,
      filtrosUrl.anioIso,
      filtrosUrl.semana,
    ]
  );

  useEffect(() => {
    let cancelado = false;
    setCargandoPeriodos(true);

    inspeccionesApi
      .getPeriodosDisponibles(queryPeriodos)
      .then((res) => {
        if (cancelado) return;
        setPeriodosDisponibles(res);
        const sincronizado = sincronizarFiltrosConPeriodosDisponibles(filtrosUrlRef.current, res);
        const actualParams = serializarFiltrosASearchParams(filtrosUrlRef.current).toString();
        const nuevoParams = serializarFiltrosASearchParams(sincronizado).toString();
        if (actualParams !== nuevoParams) {
          setSearchParams(serializarFiltrosASearchParams(sincronizado), { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelado) {
          console.error('Error al consultar periodos disponibles', err);
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPeriodos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [queryPeriodos, setSearchParams]);

  const deptoSeleccionado = useMemo(
    () => departamentos.find((d) => d.id === filtros.departamentoId) || null,
    [departamentos, filtros.departamentoId]
  );

  const estadoConsulta = useMemo(
    () =>
      puedeEjecutarConsultaTemporal(
        filtros,
        periodosDisponibles,
        periodosDisponibles?.rangoTotal.hoy || hoyIso
      ),
    [filtros, periodosDisponibles, hoyIso]
  );

  const semanasDelAnioSeleccionado = useMemo(
    () =>
      obtenerSemanasDeAnio(
        periodosDisponibles?.semanas,
        filtros.anioIso ?? filtros.anio
      ),
    [periodosDisponibles?.semanas, filtros.anioIso, filtros.anio]
  );

  // Consultar filas de inspección paginadas
  const cargarRegistros = useCallback(
    async (pageTarget = 1, append = false) => {
      // Si es entrada inicial sin período explícito en URL, esperar a resolver `periodosDisponibles`
      if (filtrosUrl.esSeleccionInicial && !periodosDisponibles && cargandoPeriodos) {
        return;
      }

      if (!estadoConsulta.listo) {
        if (cargandoPeriodos) {
          return;
        }
        setItems([]);
        setTotalItems(0);
        setTotalInspecciones(0);
        setTotalPages(1);
        setIsLoading(false);
        setCargandoMas(false);
        return;
      }

      if (append) {
        setCargandoMas(true);
      } else {
        setIsLoading(true);
        setErrorConsulta(null);
      }

      try {
        const queryBase = construirQueryInspecciones(filtros);
        const resp = await inspeccionesApi.getFilasInspeccion({
          ...queryBase,
          page: pageTarget,
          limit: 100,
        });

        if (append) {
          setItems((prev) => [...prev, ...resp.items]);
        } else {
          setItems(resp.items);
        }
        setTotalItems(resp.totalDefectos ?? resp.total ?? 0);
        setTotalInspecciones(resp.totalInspecciones ?? 0);
        setPage(pageTarget);
        setTotalPages(resp.totalPages || 1);
      } catch (err: any) {
        console.error('Error al consultar registros de defectos', err);
        const mensaje =
          err?.message || 'Ocurrió un error al consultar los registros de inspección.';
        setErrorConsulta(mensaje);
        if (!append) {
          setItems([]);
          setTotalItems(0);
          setTotalInspecciones(0);
        }
      } finally {
        setIsLoading(false);
        setCargandoMas(false);
      }
    },
    [
      filtros,
      filtrosUrl.esSeleccionInicial,
      periodosDisponibles,
      cargandoPeriodos,
      estadoConsulta.listo,
    ]
  );

  const handleCargarMas = () => {
    if (cargandoMas || page >= totalPages) return;
    void cargarRegistros(page + 1, true);
  };

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void cargarRegistros(1, false);
    }, 220);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [cargarRegistros]);

  // Actualizar filtros en URL
  const aplicarNuevosFiltros = useCallback(
    (actualizador: (actual: FiltrosRegistroState) => FiltrosRegistroState) => {
      const siguiente = sincronizarFiltrosConPeriodosDisponibles(
        {
          ...actualizador(filtros),
          esSeleccionInicial: false,
        },
        periodosDisponibles
      );
      setSearchParams(serializarFiltrosASearchParams(siguiente), { replace: true });
    },
    [filtros, periodosDisponibles, setSearchParams]
  );

  const handleModalidadChange = (nuevaModalidad: ModalidadPeriodoRegistro) => {
    aplicarNuevosFiltros((prev) => ({
      ...prev,
      periodo: nuevaModalidad,
      esSeleccionInicial: false,
    }));
  };

  const handleDeptoChange = (idStr: string) => {
    const idNum = idStr ? Number(idStr) : undefined;
    const d = departamentos.find((dep) => dep.id === idNum);
    aplicarNuevosFiltros((prev) => ({
      ...prev,
      departamentoId: idNum,
      lineaTexto: !d || (d.numeroLineas || 1) <= 1 ? undefined : prev.lineaTexto,
    }));
  };

  const handleInspectorChange = (id: number | string | null) => {
    aplicarNuevosFiltros((prev) => ({
      ...prev,
      inspectorId: id ? Number(id) : undefined,
    }));
  };

  const handleLimpiarFiltros = () => {
    setInputBusqueda('');
    const limpio = sincronizarFiltrosConPeriodosDisponibles(
      {
        periodo: 'hoy',
        esSeleccionInicial: true,
        soloEliminados: false,
      },
      periodosDisponibles
    );
    setSearchParams(serializarFiltrosASearchParams(limpio), { replace: true });
  };

  const handleAbrirDetalle = (item: InspeccionFilaResponse) => {
    setItemDetalle(item);
    setModalDetalleAbierto(true);
  };

  // Determinar si el departamento seleccionado tiene más de 1 línea operativa
  const tieneMultiplesLineas = Boolean(
    deptoSeleccionado && (deptoSeleccionado.numeroLineas || 1) > 1
  );

  // Opciones para el selector de inspectores activos
  const inspectorOptions = useMemo(
    () =>
      inspectores.map((insp) => ({
        id: insp.id,
        label: insp.nombre || insp.usuario,
        sublabel: insp.rol?.nombre ? `${insp.rol.nombre} (${insp.usuario})` : insp.usuario,
      })),
    [inspectores]
  );

  const periodoActivoDescripcion = useMemo(
    () => describirPeriodoActivo(filtros, periodosDisponibles),
    [filtros, periodosDisponibles]
  );

  const hayFiltrosActivos = useMemo(() => tieneFiltrosActivos(filtros), [filtros]);

  // Procesar la exportación completa sin truncamiento mediante GET /api/v1/inspecciones/exportar
  const handleProcesarExportacion = async (cfg: ExportModalConfig) => {
    const deptoObj = departamentos.find((d) => d.id === cfg.filtros.departamentoId);
    const inspectorObj = inspectores.find((i) => i.id === cfg.filtros.inspectorId);
    const periodoNombre = describirPeriodoActivo(cfg.filtros, periodosDisponibles);

    const queryExport = construirQueryInspecciones(cfg.filtros);
    const res = await inspeccionesApi.exportarFilasInspeccion(queryExport);

    const datosAExportar = res.items || [];
    const totalDefectosExport = res.totalDefectos ?? datosAExportar.length;
    const totalInspeccionesExport = res.totalInspecciones ?? 0;

    if (datosAExportar.length === 0) {
      toast.warning('No se encontraron registros para exportar con los criterios seleccionados');
      return;
    }

    // Si es PDF y supera el umbral de 2,500 defectos sin confirmación previa, solicitar confirmación en el modal
    if (
      cfg.formato === 'pdf' &&
      totalDefectosExport > UMBRAL_ADVERTENCIA_PDF &&
      !cfg.confirmarPdfVolumenAlto
    ) {
      return {
        requiereConfirmacionPdf: true,
        totalDefectos: totalDefectosExport,
        totalInspecciones: totalInspeccionesExport,
      };
    }

    const configReporte = {
      periodoNombre,
      departamentoNombre: deptoObj?.nombre,
      lineaNombre: cfg.filtros.lineaTexto || undefined,
      inspectorNombre: inspectorObj?.nombre || inspectorObj?.usuario,
      busqueda: cfg.filtros.busqueda || undefined,
      soloEliminados: cfg.filtros.soloEliminados,
      totalDefectos: totalDefectosExport,
      totalInspecciones: totalInspeccionesExport,
    };

    if (cfg.formato === 'excel') {
      const resultado = exportarRegistrosAExcel(
        datosAExportar,
        configReporte,
        `defectos_${deptoObj?.codigo?.toLowerCase() || 'general'}`
      );
      toast.success(
        `Reporte Excel (.csv) generado: ${resultado.totalDefectos.toLocaleString('es-MX')} registros`
      );
    } else {
      const resultado = exportarRegistrosAPdf(datosAExportar, configReporte);
      if (!resultado.ok) {
        toast.warning(
          resultado.error || 'No se pudo abrir la ventana de impresión del reporte PDF.'
        );
        return;
      }
      toast.success(
        `Reporte PDF generado: ${resultado.totalDefectos.toLocaleString('es-MX')} registros`
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal: Título del módulo de Registro, contador y período activo */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            REGISTRO HISTÓRICO DE DEFECTOS
          </h1>
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-marca-primario/10 text-marca-primario"
            title="Total de registros que cumplen con los filtros"
          >
            {totalItems.toLocaleString('es-MX')} registros
          </span>
        </div>

        {/* Indicador de período activo */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Icon name="calendar_today" size="14px" className="text-marca-primario shrink-0" />
          <span className="font-semibold text-slate-700 truncate max-w-xs sm:max-w-md">
            {periodoActivoDescripcion}
          </span>
          {cargandoPeriodos && <Spinner size="xs" className="ml-1" />}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REGISTROS CON FILTROS Y CABECERA STICKY */}
      <RegistroHistoricoTabla
        items={items}
        busqueda={filtros.busqueda || ''}
        isLoading={isLoading}
        totalItems={totalItems}
        totalInspecciones={totalInspecciones}
        periodoDescripcion={periodoActivoDescripcion}
        errorMensaje={errorConsulta}
        tieneFiltrosActivos={hayFiltrosActivos}
        onReintentar={() => void cargarRegistros(1, false)}
        onLimpiarFiltros={handleLimpiarFiltros}
        puedeCargarMas={page < totalPages}
        cargandoMas={cargandoMas}
        onCargarMas={handleCargarMas}
        onVerDetalle={handleAbrirDetalle}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full select-none py-1">
            {/* Lado izquierdo: Buscador, Segmentación Temporal, Inspector y Línea */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Buscador */}
              <div className="relative w-52 sm:w-56 shrink-0">
                <Icon
                  name="search"
                  size="16px"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar lote, modelo, defecto..."
                  value={inputBusqueda}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputBusqueda(val);
                    aplicarNuevosFiltros((prev) => ({
                      ...prev,
                      busqueda: val.trim() || undefined,
                    }));
                  }}
                  className="w-full h-8 pl-8 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
                />
                {inputBusqueda && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputBusqueda('');
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        busqueda: undefined,
                      }));
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <Icon name="close" size="14px" />
                  </button>
                )}
              </div>

              {/* Selector de Modalidad de Período (Hoy, Día, Semana, Mes, Año) */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs shrink-0">
                {MODALIDADES_PERIODO_OPCIONES.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleModalidadChange(mod.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      filtros.periodo === mod.id
                        ? 'bg-marca-primario text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mod.shortLabel}
                  </button>
                ))}
              </div>

              {/* Selectores Dependientes: Modalidad AÑO (sin conteos) */}
              {filtros.periodo === 'anio' && (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                  <select
                    value={filtros.anio ?? ''}
                    disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                    onChange={(e) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        anio: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shrink-0"
                    title="Filtrar por año"
                  >
                    {(!periodosDisponibles || periodosDisponibles.anios.length === 0) && (
                      <option value="">Sin años</option>
                    )}
                    {periodosDisponibles?.anios.map((a) => (
                      <option key={a.anio} value={a.anio}>
                        {formatearEtiquetaAnio(a.anio)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selectores Dependientes: Modalidad MES */}
              {filtros.periodo === 'mes' && (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                  <select
                    value={filtros.anio ?? ''}
                    disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                    onChange={(e) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        anio: e.target.value ? Number(e.target.value) : undefined,
                        mes: undefined,
                      }))
                    }
                    className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shrink-0"
                    title="Seleccionar año"
                  >
                    {(!periodosDisponibles || periodosDisponibles.anios.length === 0) && (
                      <option value="">Sin años</option>
                    )}
                    {periodosDisponibles?.anios.map((a) => (
                      <option key={a.anio} value={a.anio}>
                        {formatearEtiquetaAnio(a.anio)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtros.mes ?? ''}
                    disabled={!periodosDisponibles || periodosDisponibles.meses.length === 0}
                    onChange={(e) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        mes: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-32 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shrink-0"
                    title="Seleccionar mes"
                  >
                    {(!periodosDisponibles || periodosDisponibles.meses.length === 0) && (
                      <option value="">Sin meses</option>
                    )}
                    {periodosDisponibles?.meses.map((m) => (
                      <option key={`${m.anio}-${m.mes}`} value={m.mes}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selectores Dependientes: Modalidad SEMANA (sin palabra ISO ni conteos) */}
              {filtros.periodo === 'semana' && (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                  <select
                    value={filtros.anioIso ?? ''}
                    disabled={
                      !periodosDisponibles || (periodosDisponibles.aniosIso || []).length === 0
                    }
                    onChange={(e) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        anioIso: e.target.value ? Number(e.target.value) : undefined,
                        semana: undefined,
                        semanaIsoCodigo: undefined,
                      }))
                    }
                    className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shrink-0"
                    title="Seleccionar año"
                  >
                    {(!periodosDisponibles ||
                      (periodosDisponibles.aniosIso || []).length === 0) && (
                      <option value="">Sin años</option>
                    )}
                    {(periodosDisponibles?.aniosIso || []).map((a) => (
                      <option key={a.anioIso} value={a.anioIso}>
                        {formatearEtiquetaAnio(a.anioIso)}
                      </option>
                    ))}
                  </select>

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
                        aplicarNuevosFiltros((prev) => ({
                          ...prev,
                          anioIso: parsed.anioIso,
                          semana: parsed.semana,
                          semanaIsoCodigo: parsed.codigo,
                        }));
                      }
                    }}
                    className="w-32 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer shrink-0"
                    title="Seleccionar semana"
                  >
                    {semanasDelAnioSeleccionado.length === 0 && (
                      <option value="">Sin semanas</option>
                    )}
                    {semanasDelAnioSeleccionado.map((s) => (
                      <option key={s.codigo} value={s.codigo}>
                        {formatearEtiquetaSemana(s)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selector Dependiente: Modalidad DÍA mediante Calendario */}
              {filtros.periodo === 'dia' && (
                <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                  <CalendarioDiaPicker
                    value={filtros.dia}
                    anio={filtros.anio}
                    mes={filtros.mes}
                    aniosDisponibles={periodosDisponibles?.anios || []}
                    mesesDisponibles={periodosDisponibles?.meses || []}
                    diasDisponibles={periodosDisponibles?.dias || []}
                    hoyIso={periodosDisponibles?.rangoTotal.hoy || hoyIso}
                    disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                    className="w-36"
                    onSelectDia={(fechaIso, anioSel, mesSel) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        dia: fechaIso,
                        anio: anioSel,
                        mes: mesSel,
                      }))
                    }
                    onCambiarMesAnio={(nuevoAnio, nuevoMes) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        anio: nuevoAnio,
                        mes: nuevoMes,
                        dia: undefined,
                      }))
                    }
                  />
                </div>
              )}

              {/* Selector de Línea: Solo aplica si el departamento seleccionado tiene más de 1 línea */}
              {tieneMultiplesLineas && deptoSeleccionado && (
                <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
                  <select
                    value={filtros.lineaTexto || ''}
                    onChange={(e) =>
                      aplicarNuevosFiltros((prev) => ({
                        ...prev,
                        lineaTexto: e.target.value || undefined,
                      }))
                    }
                    className="h-8 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-28 shrink-0"
                    title="Filtrar por línea operativa del departamento"
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

              {/* Botón Limpiar filtros */}
              {hayFiltrosActivos && (
                <button
                  type="button"
                  onClick={handleLimpiarFiltros}
                  className="inline-flex items-center gap-1 h-8 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
                  title="Restablecer filtros"
                >
                  <Icon name="filter_alt_off" size="14px" className="text-slate-500" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {/* Lado derecho: Selector de Inspector, Departamento, Exportar y Papelera */}
            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              {/* Selector con buscador de Inspector activo junto al de Departamento */}
              {puedeFiltrarInspector && (
                <div className="w-44 sm:w-48 shrink-0 min-w-0">
                  <SearchableSelect
                    options={inspectorOptions}
                    value={filtros.inspectorId ?? null}
                    onChange={handleInspectorChange}
                    allOptionLabel="Todos los Inspectores"
                    placeholder="Inspector..."
                    searchPlaceholder="Buscar inspector activo..."
                    emptyText="No se encontraron inspectores activos"
                    title="Filtrar por inspector activo"
                    className="w-full"
                  />
                </div>
              )}

              {/* Selector de Departamento */}
              {puedeCambiarDepto ? (
                <select
                  value={deptoSeleccionado?.id.toString() || ''}
                  onChange={(e) => handleDeptoChange(e.target.value)}
                  className="h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40 shrink-0"
                  title="Filtrar por departamento"
                >
                  <option value="">Todos los Deptos</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Depto:
                  </span>
                  <span
                    className="font-bold text-marca-primario truncate max-w-[130px]"
                    title="Departamento asignado"
                  >
                    {deptoSeleccionado?.nombre || 'Asignado'}
                  </span>
                </div>
              )}

              {/* Botón Exportar que abre el Modal de selección */}
              <button
                type="button"
                onClick={() => setModalExportarAbierto(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 shadow-2xs cursor-pointer transition-colors"
                title="Configurar y exportar reporte completo"
              >
                <Icon name="download" size="15px" className="text-slate-500" />
                <span>Exportar</span>
              </button>

              {/* Botón Papelera (solo si el usuario tiene permiso defectos.eliminar) */}
              {puedeVerEliminados && (
                <button
                  type="button"
                  onClick={() =>
                    aplicarNuevosFiltros((prev) => ({
                      ...prev,
                      soloEliminados: !prev.soloEliminados,
                    }))
                  }
                  title={
                    filtros.soloEliminados
                      ? 'Papelera: Viendo defectos eliminados (Click para volver a activos)'
                      : 'Papelera: Ver defectos eliminados'
                  }
                  className={`h-8 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                    filtros.soloEliminados
                      ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
                      : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    name="delete"
                    size="16px"
                    className={filtros.soloEliminados ? 'text-rose-600' : 'text-slate-400'}
                  />
                  {filtros.soloEliminados && <span>Eliminados</span>}
                </button>
              )}
            </div>
          </div>
        }
      />

      {/* MODAL PARA ESCOGER QUÉ Y CÓMO EXPORTAR */}
      <RegistroExportModal
        isOpen={modalExportarAbierto}
        onClose={() => setModalExportarAbierto(false)}
        onExportar={handleProcesarExportacion}
        departamentos={departamentos}
        inspectores={inspectores}
        filtrosActivos={filtros}
        periodosIniciales={periodosDisponibles}
        totalDefectosVista={totalItems}
        totalInspeccionesVista={totalInspecciones}
        puedeCambiarDepto={puedeCambiarDepto}
        puedeFiltrarInspector={puedeFiltrarInspector}
      />

      {/* MODAL DE DETALLE COMPLETO */}
      <InspeccionDetalleModal
        isOpen={modalDetalleAbierto}
        onClose={() => {
          setModalDetalleAbierto(false);
          setItemDetalle(null);
        }}
        item={itemDetalle}
      />

      {/* BOTÓN FLOTANTE REGRESAR ARRIBA */}
      {mostrarBotonArriba && (
        <button
          type="button"
          onClick={handleScrollArriba}
          className="fixed bottom-6 right-6 z-40 h-10 w-10 rounded-full bg-white/40 dark:bg-slate-900/40 hover:bg-white/75 dark:hover:bg-slate-900/70 active:scale-90 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-lg shadow-black/5 hover:shadow-xl border border-white/60 dark:border-white/10 backdrop-blur-md cursor-pointer transition-all duration-300 animate-in fade-in zoom-in-90 flex items-center justify-center group"
          title="Regresar al inicio"
          aria-label="Regresar al inicio"
        >
          <Icon
            name="arrow_upward"
            size="18px"
            className="opacity-75 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all"
          />
        </button>
      )}
    </div>
  );
}
