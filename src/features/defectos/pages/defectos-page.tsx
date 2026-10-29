import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { defectosApi } from '../api/defectos-api';
import type {
  Defecto,
  ClasificacionDefecto,
  GrupoCodificacion,
  LoteDefectosPayload,
  LotePreviewResponse,
} from '../types/defectos.types';
import { departamentosApi } from '@/features/departamentos/api/departamentos-api';
import type { Departamento, Linea } from '@/features/departamentos/types/departamentos.types';
import { DefectosTabla } from '../components/defectos-tabla';
import { DefectosMatrizView } from '../components/defectos-matriz-view';
import { DefectoDetailModal } from '../components/defecto-detail-modal';
import { DefectoFormCreateModal } from '../components/defecto-form-create-modal';
import { DefectoFormEditModal } from '../components/defecto-form-edit-modal';
import { DefectoDepartamentosModal } from '../components/defecto-departamentos-modal';
import { DefectoDeleteModal } from '../components/defecto-delete-modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import { ApiError, connectivityState } from '@/lib/api/http-client';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';

/**
 * Controlador de vista del módulo de Defectos.
 * Conforme a frontend-architecture/SKILL.md, la URL actúa como fuente de la verdad para:
 * - Filtros navegables (sección/línea, vista, búsqueda, clasificación, eliminados, líneas seleccionadas).
 */
export function DefectosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [defectos, setDefectos] = useState<Defecto[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [gruposCodificacion, setGruposCodificacion] = useState<GrupoCodificacion[]>([]);
  // Conteos dinámicos por línea y catálogo total
  const [conteosPorLinea, setConteosPorLinea] = useState<Record<number, number>>({});
  const [conteoTodas, setConteoTodas] = useState<number>(0);

  // Estados derivados y sincronizados con SearchParams (URL State)
  const seccionParam = searchParams.get('seccion');
  const lineaActivaId: number | 'TODAS' =
    seccionParam === 'todas'
      ? 'TODAS'
      : seccionParam && !isNaN(Number(seccionParam))
      ? Number(seccionParam)
      : 1;

  const vistaParam = searchParams.get('vista');
  const vistaModo: 'tabla' | 'matriz' =
    lineaActivaId === 'TODAS'
      ? 'tabla'
      : vistaParam === 'tabla'
      ? 'tabla'
      : 'matriz';

  const busqueda = searchParams.get('q') || '';
  const filtroClasificacion = searchParams.get('clasif') || '';
  const deptoParam = searchParams.get('depto');
  const filtroDepartamento = deptoParam && !isNaN(Number(deptoParam)) ? Number(deptoParam) : null;
  const verEliminados = searchParams.get('eliminados') === '1';

  // Filtro multi-checkbox de líneas en vista TODAS (ej. lineas=1,2)
  const lineasParam = searchParams.get('lineas');
  const selectedLineas: number[] = lineasParam
    ? lineasParam
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)
    : [];

  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [mostrandoDatosLocales, setMostrandoDatosLocales] = useState(false);
  const cachedDefectosRef = useRef<Defecto[]>([]);

  // Funciones de actualización de URL (Navigable State)
  const updateUrlParams = (updates: Record<string, string | null | undefined>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, val]) => {
          if (val === null || val === undefined || val === '') {
            next.delete(key);
          } else {
            next.set(key, val);
          }
        });
        return next;
      },
      { replace: true }
    );
  };

  const handleSelectLinea = (seleccion: number | 'TODAS') => {
    updateUrlParams({
      seccion: seleccion === 'TODAS' ? 'todas' : seleccion.toString(),
      vista: seleccion === 'TODAS' ? 'tabla' : 'matriz',
      depto: null,
      page: null,
    });
  };

  const handleSetVistaModo = (modo: 'tabla' | 'matriz') => {
    updateUrlParams({ vista: modo });
  };

  const handleSetBusqueda = (val: string) => {
    updateUrlParams({ q: val || null, page: null });
  };

  const handleSetFiltroClasificacion = (val: string) => {
    updateUrlParams({ clasif: val || null, page: null });
  };

  const handleSetFiltroDepartamento = (val: number | null) => {
    updateUrlParams({ depto: val ? val.toString() : null, page: null });
  };

  const handleSetVerEliminados = (val: boolean) => {
    updateUrlParams({ eliminados: val ? '1' : null, page: null });
  };

  const handleToggleLinea = (lineaId: number) => {
    const exists = selectedLineas.includes(lineaId);
    const updated = exists
      ? selectedLineas.filter((id) => id !== lineaId)
      : [...selectedLineas, lineaId];

    updateUrlParams({
      lineas: updated.length > 0 ? updated.join(',') : null,
      page: null,
    });
  };

  const handleClearLineas = () => {
    updateUrlParams({ lineas: null, page: null });
  };

  // Paginación continua tipo "Ver más"
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modales
  const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);
  const [isModalEditOpen, setIsModalEditOpen] = useState(false);
  const [isModalDeptosOpen, setIsModalDeptosOpen] = useState(false);
  const [isModalDeleteOpen, setIsModalDeleteOpen] = useState(false);
  const [isModalDetailOpen, setIsModalDetailOpen] = useState(false);

  // Defecto actualmente seleccionado para modales de edición / detalle / etc.
  const [currentDefecto, setCurrentDefecto] = useState<Defecto | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConteosLineas = async () => {
    try {
      const data = await defectosApi.getConteosLineas();
      if (data) {
        const mapa: Record<number, number> = {};
        for (const item of data.lineas) {
          mapa[item.id] = item.total;
        }
        setConteosPorLinea(mapa);
        setConteoTodas(data.todas || 0);
      }
    } catch {
      // Silencioso
    }
  };

  const fetchCatalogos = async () => {
    try {
      const [deptosData, lineasData, gruposData] = await Promise.all([
        defectosApi.getDepartamentosParaDefectos(),
        departamentosApi.getLineas(),
        defectosApi.getGruposCodificacion().catch(() => [] as GrupoCodificacion[]),
        fetchConteosLineas(),
      ]);
      setDepartamentos(deptosData || []);
      setLineas((lineasData || []).filter((l) => l.estado === 'ACTIVO'));
      setGruposCodificacion(gruposData || []);
    } catch {
      // Ignorar fallback silencioso
    }
  };

  const fetchDefectosData = async (targetPage = 1, append = false) => {
    const cargarDesdeCacheLocal = async () => {
      const localRes = await catalogoOfflineService.consultarDefectosLocales({
        busqueda: busqueda.trim() || undefined,
        clasificacion: filtroClasificacion || undefined,
        departamentoId: filtroDepartamento || undefined,
        lineaId: lineaActivaId !== 'TODAS' ? lineaActivaId : undefined,
        lineasIds: lineaActivaId === 'TODAS' && selectedLineas.length > 0 ? selectedLineas : undefined,
        soloEliminados: verEliminados ? true : undefined,
        page: targetPage,
        limit,
      });

      setSinConexion(true);
      setError(null);

      if (localRes.items.length > 0) {
        if (append) {
          setDefectos((prev) => [...prev, ...localRes.items]);
        } else {
          setDefectos(localRes.items);
        }
        setMostrandoDatosLocales(true);
        setPage(targetPage);
        setTotalPages(localRes.totalPages || 1);
        setTotalItems(localRes.total || localRes.items.length);
      } else if (!append && cachedDefectosRef.current.length > 0 && !busqueda.trim()) {
        setDefectos(cachedDefectosRef.current);
        setMostrandoDatosLocales(true);
      } else if (!append) {
        setDefectos([]);
        setTotalItems(0);
        setTotalPages(1);
        setMostrandoDatosLocales(false);
      }
    };

    try {
      if (append) {
        setCargandoMas(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await cargarDesdeCacheLocal();
        return;
      }

      const params: Parameters<typeof defectosApi.getDefectos>[0] = {
        busqueda: busqueda.trim() || undefined,
        clasificacion: filtroClasificacion || undefined,
        departamentoId: filtroDepartamento || undefined,
        soloEliminados: verEliminados ? true : undefined,
        page: targetPage,
        limit,
      };

      if (lineaActivaId !== 'TODAS') {
        params.lineaId = lineaActivaId;
      } else if (selectedLineas.length > 0) {
        params.lineasIds = selectedLineas;
      }

      const data = await defectosApi.getDefectos(params);

      setSinConexion(false);
      setMostrandoDatosLocales(false);
      setError(null);

      if (data.items && data.items.length > 0) {
        void catalogoOfflineService.guardarDefectosEnCacheLocal(data.items);
      }

      if (append) {
        setDefectos((prev) => {
          const next = [...prev, ...(data.items || [])];
          cachedDefectosRef.current = next;
          return next;
        });
      } else {
        const next = data.items || [];
        cachedDefectosRef.current = next;
        setDefectos(next);
      }

      setPage(targetPage);
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || 0);
    } catch (err: unknown) {
      const esErrorHttp = err instanceof ApiError && err.statusCode >= 400;
      if (esErrorHttp) {
        const msg = err instanceof Error ? err.message : 'Error al consultar el catálogo de defectos';
        setSinConexion(false);
        setMostrandoDatosLocales(false);
        setError(msg);
      } else {
        await cargarDesdeCacheLocal();
      }
    } finally {
      setLoading(false);
      setCargandoMas(false);
    }
  };

  useEffect(() => {
    fetchCatalogos();
  }, []);

  useEffect(() => {
    const prevReachableRef = { current: connectivityState.isBackendReachable() };
    const unsub = connectivityState.subscribe((reachable) => {
      const pasoDeOfflineAOnline = !prevReachableRef.current && reachable;
      prevReachableRef.current = reachable;
      if (pasoDeOfflineAOnline) {
        void fetchCatalogos();
        void fetchDefectosData(1, false);
      }
    });
    const handleOnline = () => {
      void fetchCatalogos();
      void fetchDefectosData(1, false);
    };
    window.addEventListener('online', handleOnline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
    };
  }, [busqueda, filtroClasificacion, filtroDepartamento, verEliminados, lineaActivaId, lineasParam]);

  // Recargar al cambiar filtros con debounce para la barra de búsqueda general
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchDefectosData(1, false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [busqueda, filtroClasificacion, filtroDepartamento, verEliminados, lineaActivaId, lineasParam]);

  const handleCargarMas = () => {
    if (page < totalPages && !cargandoMas) {
      fetchDefectosData(page + 1, true);
    }
  };

  // Handlers para abrir modales
  const openCreateModal = () => {
    setIsModalCreateOpen(true);
  };

  const openEditModal = (def: Defecto) => {
    setCurrentDefecto(def);
    setIsModalEditOpen(true);
  };

  const openDeptosModal = (def: Defecto) => {
    setCurrentDefecto(def);
    setIsModalDeptosOpen(true);
  };

  const openDeleteModal = (def: Defecto) => {
    setCurrentDefecto(def);
    setIsModalDeleteOpen(true);
  };

  const openDetailModal = (def: Defecto) => {
    setCurrentDefecto(def);
    setIsModalDetailOpen(true);
  };

  // Operaciones de Mutación conectadas a la API
  const handleCreateSubmit = async (data: {
    defecto: string;
    clasificacion: ClasificacionDefecto;
    departamentoId: number;
    lineaId: number;
    departamentosIds: number[];
  }) => {
    try {
      await defectosApi.createDefecto(data);
      await Promise.all([
        fetchDefectosData(1, false),
        fetchConteosLineas(),
        defectosApi.getGruposCodificacion().then(setGruposCodificacion).catch(() => {}),
      ]);
      toast.success(`Defecto "${data.defecto}" creado exitosamente`);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear defecto');
      throw err;
    }
  };

  const handlePreviewLote = async (data: LoteDefectosPayload): Promise<LotePreviewResponse> => {
    return await defectosApi.previsualizarLote(data);
  };

  const handleSubmitLote = async (data: LoteDefectosPayload): Promise<void> => {
    try {
      await defectosApi.crearLote(data);
      await Promise.all([
        fetchDefectosData(1, false),
        fetchConteosLineas(),
        defectosApi.getGruposCodificacion().then(setGruposCodificacion).catch(() => {}),
      ]);
      toast.success(`Lote de ${data.filas.length} defectos guardado exitosamente`);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar lote de defectos');
      throw err;
    }
  };

  const handleEditSubmit = async (data: {
    defecto: string;
    clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
    departamentoId?: number;
    nuevaClave?: number;
    departamentosList?: Array<{ departamentoId: number; activo: boolean }>;
  }) => {
    if (!currentDefecto) return;

    try {
      if (data.nuevaClave && data.nuevaClave !== currentDefecto.clave) {
        await defectosApi.updateClaveDefecto(currentDefecto.id, {
          nuevaClave: data.nuevaClave,
        });
      }

      await defectosApi.updateDefecto(currentDefecto.id, {
        defecto: data.defecto,
        clasificacion: data.clasificacion,
        departamentoId: data.departamentoId,
      });

      if (data.departamentosList) {
        await defectosApi.syncDefectoDepartamentos(currentDefecto.id, data.departamentosList);
      }

      await Promise.all([fetchDefectosData(1, false), fetchConteosLineas()]);
      toast.success('Defecto actualizado correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar defecto');
      throw err;
    }
  };

  const handleDeptosSubmit = async (
    list: Array<{ departamentoId: number; activo: boolean }>
  ) => {
    if (!currentDefecto) return;
    try {
      await defectosApi.syncDefectoDepartamentos(currentDefecto.id, list);
      await Promise.all([fetchDefectosData(page, false), fetchConteosLineas()]);
      toast.success('Departamentos sincronizados exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al sincronizar departamentos');
      throw err;
    }
  };

  const handleDeleteConfirm = async (def: Defecto) => {
    try {
      await defectosApi.deleteDefecto(def.id);
      await Promise.all([fetchDefectosData(1, false), fetchConteosLineas()]);
      toast.success(`Defecto #${def.clave} "${def.defecto}" eliminado exitosamente`);
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar defecto');
      throw err;
    }
  };

  const handleReactivar = async (def: Defecto) => {
    try {
      setLoading(true);
      await defectosApi.reactivarDefecto(def.id);
      await Promise.all([fetchDefectosData(1, false), fetchConteosLineas()]);
      toast.success(`Defecto #${def.clave} reactivado exitosamente`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reactivar defecto';
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  const handleToggleEtapa = async (
    defectoId: number,
    departamentoId: number,
    nuevoPermitido: boolean
  ) => {
    // Actualización optimista en memoria
    setDefectos((prev) =>
      prev.map((d) => {
        if (d.id !== defectoId) return d;
        const etapasExistentes = d.etapas ? [...d.etapas] : [];
        const idx = etapasExistentes.findIndex((e) => e.departamentoId === departamentoId);
        if (idx >= 0) {
          etapasExistentes[idx] = { ...etapasExistentes[idx], permitido: nuevoPermitido };
        } else {
          etapasExistentes.push({
            id: 0,
            departamentoId,
            permitido: nuevoPermitido,
          });
        }
        return { ...d, etapas: etapasExistentes };
      })
    );

    // Persistir en backend
    try {
      await defectosApi.syncDefectoEtapas(defectoId, [
        { departamentoId, permitido: nuevoPermitido },
      ]);
      toast.success('Matriz de etapas actualizada');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar etapa de defecto');
      // Revertir recargando
      fetchDefectosData(page, false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Encabezado Principal Homogéneo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Icon name="report_problem" className="text-marca-primario" />
              Catálogo de Defectos
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-marca-primario/10 text-marca-primario border border-marca-primario/20">
              Total: {totalItems}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Vista: Disponible exclusivamente cuando se consulta una línea específica */}
          {lineaActivaId !== 'TODAS' && (
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => handleSetVistaModo('matriz')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  vistaModo === 'matriz'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="grid_view" size="16px" />
                <span>Matriz Deptos</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetVistaModo('tabla')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  vistaModo === 'tabla'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon name="view_list" size="16px" />
                <span>Lista</span>
              </button>
            </div>
          )}

          <Button onClick={openCreateModal} variant="primary" className="flex items-center gap-2">
            <Icon name="add" size="18px" />
            <span>Nuevo Defecto</span>
          </Button>
        </div>
      </div>

      {/* Barra de Navegación por Líneas de Producción (BOTA | ACCESORIOS ... TODAS) */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2">
        <div className="flex items-center justify-between w-full">
          {/* Bloque de Líneas de Producción: BOTA | ACCESORIOS | (más líneas futuras) */}
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white/90 p-1 shadow-xs backdrop-blur-sm">
            {lineas.map((lin) => {
              const count = conteosPorLinea[lin.id] ?? 0;
              const isSelected = lineaActivaId === lin.id;
              return (
                <button
                  key={lin.id}
                  type="button"
                  onClick={() => handleSelectLinea(lin.id)}
                  className={`inline-flex min-h-8 items-center gap-2 rounded-md px-3.5 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-marca-primario text-white shadow-xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-marca-primario'
                  }`}
                >
                  <Icon name="linear_scale" size="15px" className="shrink-0" />
                  <span>{lin.nombre}</span>
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bloque Separado a la derecha: TODAS (Catálogo general) */}
          <div className="inline-flex items-center rounded-lg border border-neutral-200/80 bg-white/90 p-1 shadow-xs backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleSelectLinea('TODAS')}
              className={`inline-flex min-h-8 items-center gap-2 rounded-md px-4 py-1 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                lineaActivaId === 'TODAS'
                  ? 'bg-marca-primario text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-marca-primario'
              }`}
            >
              <Icon name="layers" size="15px" className="shrink-0" />
              <span>TODAS</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                  lineaActivaId === 'TODAS'
                    ? 'bg-white/25 text-white'
                    : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {conteoTodas}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Renderizado condicional según vista activa */}
      {vistaModo === 'tabla' ? (
        <DefectosTabla
          defectos={defectos}
          loading={loading}
          error={error}
          sinConexion={sinConexion}
          mostrandoDatosLocales={mostrandoDatosLocales}
          onReintentar={() => {
            void fetchCatalogos();
            void fetchDefectosData(1, false);
          }}
          busqueda={busqueda}
          setBusqueda={handleSetBusqueda}
          filtroDepartamento={filtroDepartamento}
          setFiltroDepartamento={handleSetFiltroDepartamento}
          filtroClasificacion={filtroClasificacion}
          setFiltroClasificacion={handleSetFiltroClasificacion}
          verEliminados={verEliminados}
          setVerEliminados={handleSetVerEliminados}
          totalItems={totalItems}
          puedeCargarMas={page < totalPages}
          cargandoMas={cargandoMas}
          onCargarMas={handleCargarMas}
          onVerDetalle={openDetailModal}
          onOpenEdit={openEditModal}
          onOpenDeptos={openDeptosModal}
          onOpenDelete={openDeleteModal}
          onReactivar={handleReactivar}
          departamentos={lineaActivaId === 'TODAS' ? departamentos : departamentos.filter((d) => d.lineasAsociadas?.some((l) => l.activo && l.lineaId === lineaActivaId))}
          mostrarColumnaLinea={lineaActivaId === 'TODAS'}
          lineas={lineas}
          selectedLineas={selectedLineas}
          onToggleLinea={handleToggleLinea}
          onClearLineas={handleClearLineas}
        />
      ) : (
        <DefectosMatrizView
          defectos={defectos}
          departamentos={
            lineaActivaId === 'TODAS'
              ? departamentos
              : departamentos.filter((d) =>
                  d.lineasAsociadas?.some((l) => l.activo && l.lineaId === lineaActivaId)
                )
          }
          loading={loading}
          error={error}
          sinConexion={sinConexion}
          mostrandoDatosLocales={mostrandoDatosLocales}
          onReintentar={() => {
            void fetchCatalogos();
            void fetchDefectosData(1, false);
          }}
          busqueda={busqueda}
          setBusqueda={handleSetBusqueda}
          filtroDepartamento={filtroDepartamento}
          setFiltroDepartamento={handleSetFiltroDepartamento}
          filtroClasificacion={filtroClasificacion}
          setFiltroClasificacion={handleSetFiltroClasificacion}
          verEliminados={verEliminados}
          setVerEliminados={handleSetVerEliminados}
          puedeCargarMas={page < totalPages}
          cargandoMas={cargandoMas}
          onCargarMas={handleCargarMas}
          totalItems={totalItems}
          onVerDetalle={openDetailModal}
          onOpenEdit={openEditModal}
          onOpenDelete={openDeleteModal}
          onReactivar={handleReactivar}
          onToggleEtapa={handleToggleEtapa}
        />
      )}

      {/* Modales modulares desacoplados */}
      <DefectoDetailModal
        isOpen={isModalDetailOpen}
        onClose={() => setIsModalDetailOpen(false)}
        defecto={currentDefecto}
        departamentos={departamentos}
        onReactivar={handleReactivar}
      />

      <DefectoFormCreateModal
        isOpen={isModalCreateOpen}
        onClose={() => setIsModalCreateOpen(false)}
        departamentos={departamentos}
        lineas={lineas}
        grupos={gruposCodificacion}
        lineaInicialId={lineaActivaId !== 'TODAS' ? lineaActivaId : null}
        onSubmit={handleCreateSubmit}
        onPreviewLote={handlePreviewLote}
        onSubmitLote={handleSubmitLote}
      />

      <DefectoFormEditModal
        isOpen={isModalEditOpen}
        onClose={() => setIsModalEditOpen(false)}
        defecto={currentDefecto}
        departamentos={departamentos}
        onSubmit={handleEditSubmit}
      />

      <DefectoDepartamentosModal
        isOpen={isModalDeptosOpen}
        onClose={() => setIsModalDeptosOpen(false)}
        defecto={currentDefecto}
        departamentos={departamentos}
        onSubmit={handleDeptosSubmit}
      />

      <DefectoDeleteModal
        isOpen={isModalDeleteOpen}
        onClose={() => setIsModalDeleteOpen(false)}
        defecto={currentDefecto}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
