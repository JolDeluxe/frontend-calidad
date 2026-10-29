import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { RegistroHistoricoTabla } from '../components/registro-historico-tabla';
import { SearchableSelect } from '../components/searchable-select';
import { RegistroExportModal, type ExportModalConfig } from '../components/registro-export-modal';
import { exportarRegistrosAExcel, exportarRegistrosAPdf } from '../utils/exportar-reporte';
import { InspeccionDetalleModal } from '@/features/inspecciones/components/inspeccion-detalle-modal';
import { inspeccionesApi } from '@/features/inspecciones/api/inspecciones-api';
import { useAuthSession } from '@/providers/auth-provider';
import { toast } from '@/components/ui/toast';
import type { InspeccionFilaResponse } from '../types/registro.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

const ROLES_CON_CAMBIO_DEPTO = ['SUPER_ADMIN', 'ADMIN', 'COORD'];

const MESES = [
  { val: '1', label: 'Enero' },
  { val: '2', label: 'Febrero' },
  { val: '3', label: 'Marzo' },
  { val: '4', label: 'Abril' },
  { val: '5', label: 'Mayo' },
  { val: '6', label: 'Junio' },
  { val: '7', label: 'Julio' },
  { val: '8', label: 'Agosto' },
  { val: '9', label: 'Septiembre' },
  { val: '10', label: 'Octubre' },
  { val: '11', label: 'Noviembre' },
  { val: '12', label: 'Diciembre' },
];

const ANIOS = ['2026', '2025', '2024'];

interface InspectorItem {
  id: number;
  nombre: string;
  usuario: string;
  rol?: { id: number; codigo: string; nombre: string };
}

export function RegistroPage() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const rolCodigo = user?.rol?.codigo || '';
  const puedeCambiarDepto = ROLES_CON_CAMBIO_DEPTO.includes(rolCodigo);

  // Estados de Filtros sincronizados con la URL: Por defecto 'todos' (Histórico) con mes y año actual
  const fechaActual = new Date();
  const periodo = (searchParams.get('periodo') as 'hoy' | 'todos') || 'todos';
  const busquedaParam = searchParams.get('q') || '';
  const mesParam = searchParams.get('mes') || (fechaActual.getMonth() + 1).toString();
  const anioParam = searchParams.get('anio') || fechaActual.getFullYear().toString();
  const deptoParam = searchParams.get('depto') || '';
  const inspectorParam = searchParams.get('inspector') || '';
  const lineaParam = searchParams.get('linea') || '';
  const verEliminados = searchParams.get('eliminados') === 'true';

  const [inputBusqueda, setInputBusqueda] = useState(busquedaParam);
  const [items, setItems] = useState<InspeccionFilaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Catálogos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [deptoSeleccionado, setDeptoSeleccionado] = useState<Departamento | null>(null);
  const [inspectores, setInspectores] = useState<InspectorItem[]>([]);

  // Modales
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
  const [itemDetalle, setItemDetalle] = useState<InspeccionFilaResponse | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [mostrarBotonArriba, setMostrarBotonArriba] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Sincronizar input con cambios de URL
  useEffect(() => {
    setInputBusqueda(busquedaParam);
  }, [busquedaParam]);

  // Cargar catálogos auxiliares (departamentos e inspectores)
  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [deptosRes, inspectoresRes] = await Promise.all([
          inspeccionesApi.getDepartamentos(),
          inspeccionesApi.getInspectores(),
        ]);
        if (!cancelado) {
          setDepartamentos(deptosRes);
          setInspectores(inspectoresRes);

          // Si hay depto en la URL
          if (deptoParam) {
            const enc = deptosRes.find((d) => d.id === Number(deptoParam));
            if (enc) setDeptoSeleccionado(enc);
          } else {
            setDeptoSeleccionado(null);
          }
        }
      } catch (err) {
        console.error('Error cargando catálogos en registro', err);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [deptoParam]);

  // Consultar filas de inspección
  const cargarRegistros = useCallback(
    async (pageTarget = 1, append = false) => {
      if (append) {
        setCargandoMas(true);
      } else {
        setIsLoading(true);
      }

      try {
        const resp = await inspeccionesApi.getFilasInspeccion({
          periodo,
          busqueda: busquedaParam || undefined,
          departamentoResponsableId: deptoSeleccionado ? deptoSeleccionado.id : undefined,
          lineaTexto: lineaParam || undefined,
          inspectorId: inspectorParam ? Number(inspectorParam) : undefined,
          mes: periodo === 'todos' && mesParam ? Number(mesParam) : undefined,
          anio: periodo === 'todos' && anioParam ? Number(anioParam) : undefined,
          soloEliminados: verEliminados,
          page: pageTarget,
          limit: 100, // 100 por bloque en Registro
        });

        if (append) {
          setItems((prev) => [...prev, ...resp.items]);
        } else {
          setItems(resp.items);
        }
        setTotalItems(resp.total);
        setPage(pageTarget);
        setTotalPages(resp.totalPages || 1);
      } catch (err) {
        console.error('Error al consultar registros de defectos', err);
        if (!append) setItems([]);
      } finally {
        setIsLoading(false);
        setCargandoMas(false);
      }
    },
    [periodo, busquedaParam, deptoSeleccionado, lineaParam, inspectorParam, mesParam, anioParam, verEliminados]
  );

  const handleCargarMas = () => {
    if (cargandoMas || page >= totalPages) return;
    cargarRegistros(page + 1, true);
  };

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      cargarRegistros(1, false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [cargarRegistros]);

  // Manejadores de Filtros en URL
  const actualizarParametro = (clave: string, valor: string | null) => {
    const nuevos = new URLSearchParams(searchParams);
    if (valor) {
      nuevos.set(clave, valor);
    } else {
      nuevos.delete(clave);
    }
    setSearchParams(nuevos, { replace: true });
  };

  const handlePeriodoChange = (nuevoPeriodo: 'hoy' | 'todos') => {
    const nuevos = new URLSearchParams(searchParams);
    nuevos.set('periodo', nuevoPeriodo);
    if (nuevoPeriodo === 'todos') {
      const fecha = new Date();
      nuevos.set('mes', (fecha.getMonth() + 1).toString());
      nuevos.set('anio', fecha.getFullYear().toString());
    } else {
      nuevos.delete('mes');
      nuevos.delete('anio');
    }
    setSearchParams(nuevos, { replace: true });
  };

  const handleDeptoChange = (idStr: string) => {
    if (!idStr) {
      setDeptoSeleccionado(null);
      actualizarParametro('depto', null);
      actualizarParametro('linea', null); // Resetear línea si cambia o quita depto
      return;
    }
    const d = departamentos.find((dep) => dep.id === Number(idStr));
    if (d) {
      setDeptoSeleccionado(d);
      actualizarParametro('depto', d.id.toString());
      // Si el nuevo depto solo tiene 1 línea, resetear línea seleccionada
      if ((d.numeroLineas || 1) <= 1) {
        actualizarParametro('linea', null);
      }
    }
  };

  const handleInspectorChange = (id: number | string | null) => {
    actualizarParametro('inspector', id ? String(id) : null);
  };

  const handleAbrirDetalle = (item: InspeccionFilaResponse) => {
    setItemDetalle(item);
    setModalDetalleAbierto(true);
  };

  // Determinar si el departamento seleccionado tiene más de 1 línea operativa
  const tieneMultiplesLineas = Boolean(
    deptoSeleccionado && (deptoSeleccionado.numeroLineas || 1) > 1
  );

  // Opciones para el selector de inspectores
  const inspectorOptions = inspectores.map((insp) => ({
    id: insp.id,
    label: insp.nombre || insp.usuario,
    sublabel: insp.rol?.nombre ? `${insp.rol.nombre} (${insp.usuario})` : `${insp.usuario}`,
  }));

  // Procesar la exportación configurada en el Modal
  const handleProcesarExportacion = async (cfg: ExportModalConfig) => {
    // 1. Consultar los registros conforme a la configuración elegida en el modal
    const deptoObj = departamentos.find((d) => d.id === cfg.departamentoId);
    const inspectorObj = inspectores.find((i) => i.id === cfg.inspectorId);
    const mesObj = MESES.find((m) => m.val === cfg.mes);

    const periodoNombre =
      cfg.periodo === 'hoy'
        ? `Hoy (${new Date().toLocaleDateString('es-MX')})`
        : cfg.periodo === 'mes'
        ? `${mesObj?.label || 'Mes actual'} ${cfg.anio}`
        : 'Histórico Completo';

    const res = await inspeccionesApi.getFilasInspeccion({
      periodo: cfg.periodo === 'hoy' ? 'hoy' : 'todos',
      busqueda: busquedaParam || undefined,
      departamentoResponsableId: cfg.departamentoId || undefined,
      lineaTexto: cfg.lineaTexto || undefined,
      inspectorId: cfg.inspectorId || undefined,
      mes: cfg.periodo === 'mes' ? Number(cfg.mes) : undefined,
      anio: cfg.periodo === 'mes' ? Number(cfg.anio) : undefined,
      page: 1,
      limit: 500, // Exportación amplia
    });

    const datosAExportar = res.items || [];

    if (datosAExportar.length === 0) {
      toast.warning('No se encontraron registros para exportar con los criterios seleccionados');
      return;
    }

    if (cfg.formato === 'excel') {
      exportarRegistrosAExcel(
        datosAExportar,
        {
          periodoNombre,
          departamentoNombre: deptoObj?.nombre,
          lineaNombre: cfg.lineaTexto || undefined,
          inspectorNombre: inspectorObj?.nombre || inspectorObj?.usuario,
        },
        `defectos_${deptoObj?.codigo?.toLowerCase() || 'general'}`
      );
      toast.success(`Reporte Excel generado con ${datosAExportar.length} registros`);
    } else {
      exportarRegistrosAPdf(datosAExportar, {
        periodoNombre,
        departamentoNombre: deptoObj?.nombre,
        lineaNombre: cfg.lineaTexto || undefined,
        inspectorNombre: inspectorObj?.nombre || inspectorObj?.usuario,
      });
      toast.success(`Reporte PDF generado con ${datosAExportar.length} registros`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal: Título del módulo de Registro */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            REGISTRO HISTÓRICO DE DEFECTOS
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-marca-primario/10 text-marca-primario">
            {totalItems} defectos
          </span>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE REGISTROS CON FILTROS Y CABECERA STICKY */}
      <RegistroHistoricoTabla
        items={items}
        busqueda={busquedaParam}
        isLoading={isLoading}
        totalItems={totalItems}
        puedeCargarMas={page < totalPages}
        cargandoMas={cargandoMas}
        onCargarMas={handleCargarMas}
        onVerDetalle={handleAbrirDetalle}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
            {/* Lado izquierdo: Buscador, Pestañas HOY | HISTÓRICO, Mes/Año e Inspector */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Buscador */}
              <div className="relative w-56 sm:w-60 shrink-0">
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
                    setInputBusqueda(e.target.value);
                    actualizarParametro('q', e.target.value.trim() || null);
                  }}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
                />
                {inputBusqueda && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputBusqueda('');
                      actualizarParametro('q', null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <Icon name="close" size="14px" />
                  </button>
                )}
              </div>

              {/* Botones de Período: HOY | HISTÓRICO */}
              {/* Pestañas HOY | HISTÓRICO, Mes/Año e Inspector (Ocultos en Papelera) */}
              {!verEliminados && (
                <>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePeriodoChange('hoy')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        periodo === 'hoy'
                          ? 'bg-marca-primario text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodoChange('todos')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        periodo === 'todos'
                          ? 'bg-marca-primario text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Histórico
                    </button>
                  </div>

                  {/* Selectores de Mes y Año si el período es 'todos' (Histórico) */}
                  {periodo === 'todos' && (
                    <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
                      <select
                        value={mesParam}
                        onChange={(e) => actualizarParametro('mes', e.target.value || null)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-28 shrink-0"
                        title="Filtrar por mes"
                      >
                        {MESES.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={anioParam}
                        onChange={(e) => actualizarParametro('anio', e.target.value || null)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-20 shrink-0"
                        title="Filtrar por año"
                      >
                        {ANIOS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Selector con buscador de Inspector */}
                  <div className="w-44 shrink-0">
                    <SearchableSelect
                      options={inspectorOptions}
                      value={inspectorParam ? Number(inspectorParam) : null}
                      onChange={handleInspectorChange}
                      allOptionLabel="Todos los Inspectores"
                      placeholder="Inspector..."
                      emptyText="No se encontraron inspectores"
                      title="Filtrar por inspector"
                    />
                  </div>

                  {/* Selector de Línea: Solo aplica si el departamento seleccionado tiene más de 1 línea */}
                  {tieneMultiplesLineas && deptoSeleccionado && (
                    <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
                      <select
                        value={lineaParam}
                        onChange={(e) => actualizarParametro('linea', e.target.value || null)}
                        className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-28"
                        title="Filtrar por línea operativa del departamento"
                      >
                        <option value="">Todas Líneas</option>
                        {Array.from({ length: deptoSeleccionado.numeroLineas || 1 }, (_, i) => `L${i + 1}`).map((lin) => (
                          <option key={lin} value={lin}>
                            {lin}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Lado derecho: Selector de Departamento y Botón de Exportar con Modal */}
            <div className="shrink-0 flex items-center justify-end gap-2">
              {/* Selector de Departamento */}
              {puedeCambiarDepto ? (
                <select
                  value={deptoSeleccionado?.id.toString() || ''}
                  onChange={(e) => handleDeptoChange(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40"
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
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Depto:
                  </span>
                  <span className="font-bold text-marca-primario truncate max-w-[130px]" title="Departamento asignado">
                    {deptoSeleccionado?.nombre || 'Todos'}
                  </span>
                </div>
              )}

              {/* Botón Exportar que abre el Modal de selección (Oculto en Papelera) */}
              {!verEliminados && (
                <button
                  type="button"
                  onClick={() => setModalExportarAbierto(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 shadow-2xs cursor-pointer transition-colors"
                  title="Configurar y exportar reporte"
                >
                  <Icon name="download" size="15px" className="text-slate-500" />
                  <span>Exportar</span>
                </button>
              )}

              {/* Botón Papelera a un lado de Exportar con ligera separación */}
              <button
                type="button"
                onClick={() => actualizarParametro('eliminados', verEliminados ? null : 'true')}
                title={
                  verEliminados
                    ? 'Papelera: Viendo defectos eliminados (Click para volver a activos)'
                    : 'Papelera: Ver defectos eliminados'
                }
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                  verEliminados
                    ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
                    : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon name="delete" size="18px" className={verEliminados ? 'text-rose-600' : 'text-slate-400'} />
                {verEliminados && <span>Eliminados</span>}
              </button>
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
        periodoActual={periodo}
        mesActual={mesParam}
        anioActual={anioParam}
        departamentoActualId={deptoSeleccionado?.id || null}
        lineaActualTexto={lineaParam || null}
        inspectorActualId={inspectorParam ? Number(inspectorParam) : null}
        totalDefectosVista={totalItems}
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
