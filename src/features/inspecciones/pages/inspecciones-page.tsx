import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import { InspeccionesTabla } from '../components/inspecciones-tabla';
import { DefectoModalCaptura } from '../components/defecto-modal-captura';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { DefectoCancelarModal } from '../components/defecto-cancelar-modal';
import { InspeccionDetalleModal } from '../components/inspeccion-detalle-modal';
import { inspeccionesApi } from '../api/inspecciones-api';
import { useAuthSession } from '@/providers/auth-provider';
import { useTerminalStatus } from '@/features/terminales/hooks/use-terminal-status';
import { TerminalStatusBanner } from '@/features/terminales/components/terminal-status-banner';
import { TerminalVinculacionModal } from '@/features/terminales/components/terminal-vinculacion-modal';
import type {
  InspeccionFilaResponse,
  LineaOperativa,
} from '../types/inspecciones.types';
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

export function InspeccionesPage() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Integración física de terminal
  const {
    estado: terminalEstado,
    terminal,
    errorMensaje: terminalError,
    recargar: recargarTerminal,
  } = useTerminalStatus();
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false);

  const rolCodigo = user?.rol?.codigo || '';
  const esInspector = rolCodigo === 'INSPECTOR';
  const puedeCapturar = esInspector;
  // Eliminar/recuperar defectos y ver la papelera: SUPER_ADMIN, ADMIN o INSPECTOR en su estación/departamento
  const { can } = usePermissions();
  const puedeEliminar = can('defectos.eliminar') || esInspector;
  const puedeCambiarDepto = ROLES_CON_CAMBIO_DEPTO.includes(rolCodigo);

  // Estados de Filtros sincronizados con la URL
  const periodo = (searchParams.get('periodo') as 'hoy' | 'ultimos' | 'todos') || 'ultimos';
  const busquedaParam = searchParams.get('q') || '';
  const fechaActual = new Date();
  const mesParam = searchParams.get('mes') || (periodo === 'todos' ? (fechaActual.getMonth() + 1).toString() : '');
  const anioParam = searchParams.get('anio') || (periodo === 'todos' ? fechaActual.getFullYear().toString() : '');
  const deptoParam = searchParams.get('depto') || '';
  const verEliminados = searchParams.get('eliminados') === 'true' && puedeEliminar;

  const [inputBusqueda, setInputBusqueda] = useState(busquedaParam);
  const [items, setItems] = useState<InspeccionFilaResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [destacadosIds, setDestacadosIds] = useState<number[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // Catálogos auxiliares
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineas, setLineas] = useState<LineaOperativa[]>([]);
  const [deptoAuditor, setDeptoAuditor] = useState<Departamento | null>(null);

  // Modales
  const [modalCapturaAbierto, setModalCapturaAbierto] = useState(false);
  const [itemACancelar, setItemACancelar] = useState<InspeccionFilaResponse | null>(null);
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [itemDetalle, setItemDetalle] = useState<InspeccionFilaResponse | null>(null);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [mostrarBotonArriba, setMostrarBotonArriba] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detectar scroll para mostrar el botón de regresar arriba
  useEffect(() => {
    // Buscar el contenedor con scroll (main o window)
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

  // Cargar catálogos
  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [deptosRes, lineasRes] = await Promise.all([
          inspeccionesApi.getDepartamentos(),
          inspeccionesApi.getLineas(),
        ]);
        if (!cancelado) {
          setDepartamentos(deptosRes);
          setLineas(lineasRes);

          // Si el usuario tiene departamento asignado
          const userDeptos = (user as any)?.departamentos || [];
          if (deptoParam) {
            const enc = deptosRes.find((d) => d.id === Number(deptoParam));
            if (enc) setDeptoAuditor(enc);
          } else if (userDeptos.length > 0) {
            const primerDeptoId = userDeptos[0].departamentoId || userDeptos[0].id;
            const enc = deptosRes.find((d) => d.id === primerDeptoId);
            if (enc) setDeptoAuditor(enc);
          } else {
            const montado = deptosRes.find((d) => d.codigo === 'MONTADO') || deptosRes[0];
            if (montado) setDeptoAuditor(montado);
          }
        }
      } catch (err) {
        console.error('Error cargando catálogos de inspecciones', err);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [user, deptoParam]);

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
          departamentoAuditoriaId: deptoAuditor ? deptoAuditor.id : undefined,
          mes: mesParam ? Number(mesParam) : undefined,
          anio: anioParam ? Number(anioParam) : undefined,
          soloEliminados: verEliminados,
          page: pageTarget,
          limit: periodo === 'ultimos' ? 30 : 100,
        });

        if (append) {
          setItems((prev) => [...prev, ...resp.items]);
        } else {
          setItems(resp.items);
        }
        setTotalItems(resp.total);
        setPage(pageTarget);
        setTotalPages(resp.totalPages || 1);
      } catch (err: any) {
        console.error('Error al consultar inspecciones', err);
        if (!append) setItems([]);
        toast.error(err?.message || 'Error al consultar historial de inspecciones', {
          title: 'Error de Consulta',
        });
      } finally {
        setIsLoading(false);
        setCargandoMas(false);
      }
    },
    [periodo, busquedaParam, deptoAuditor, mesParam, anioParam, verEliminados]
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

  const handlePeriodoChange = (nuevoPeriodo: 'hoy' | 'ultimos' | 'todos') => {
    const nuevos = new URLSearchParams(searchParams);
    nuevos.set('periodo', nuevoPeriodo);
    if (nuevoPeriodo === 'todos') {
      const fechaActual = new Date();
      nuevos.set('mes', (fechaActual.getMonth() + 1).toString());
      nuevos.set('anio', fechaActual.getFullYear().toString());
    } else {
      nuevos.delete('mes');
      nuevos.delete('anio');
    }
    setSearchParams(nuevos, { replace: true });
  };

  const handleDeptoAuditorChange = (id: number) => {
    if (!puedeCambiarDepto) return;
    const d = departamentos.find((dep) => dep.id === id);
    if (d) {
      setDeptoAuditor(d);
      actualizarParametro('depto', d.id.toString());
    }
  };

  const handleAbrirCancelar = (item: InspeccionFilaResponse) => {
    setItemACancelar(item);
    setModalCancelarAbierto(true);
  };

  const handleAbrirDetalle = (item: InspeccionFilaResponse) => {
    setItemDetalle(item);
    setModalDetalleAbierto(true);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Banner de estación física: solo para INSPECTOR y EXCLUSIVAMENTE cuando NO está vinculada */}
      {esInspector && terminalEstado === 'no_vinculada' && (
        <TerminalStatusBanner
          estado={terminalEstado}
          terminal={terminal}
          errorMensaje={terminalError}
          onAbrirVinculacion={() => setModalVinculacionAbierto(true)}
          onReintentar={recargarTerminal}
        />
      )}

      {/* Encabezado Principal: Nombre de Departamento en Grande y Botón de Captura */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            {terminal ? terminal.departamentoNombre : deptoAuditor?.nombre || 'ESTACIÓN DE INSPECCIÓN'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {puedeCapturar ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={terminalEstado !== 'vinculada'}
              onClick={() => setModalCapturaAbierto(true)}
              className="h-9 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                terminalEstado !== 'vinculada'
                  ? 'Vincule la estación de trabajo física para habilitar la captura'
                  : 'Registrar defectos en la estación'
              }
            >
              <Icon name="add" size="18px" />
              <span>Capturar Defecto</span>
            </Button>
          ) : (
            <div className="px-3 py-1.5 bg-app-surface-muted text-text-muted rounded-lg text-xs font-semibold uppercase tracking-wider border border-border">
              Modo Consulta
            </div>
          )}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE INSPECCIONES */}
      <InspeccionesTabla
        items={items}
        busqueda={busquedaParam}
        isLoading={isLoading}
        totalItems={totalItems}
        destacadosIds={destacadosIds}
        puedeCargarMas={page < totalPages}
        cargandoMas={cargandoMas}
        verEliminados={verEliminados}
        onCargarMas={handleCargarMas}
        onVerDetalle={handleAbrirDetalle}
        onCancelar={puedeEliminar ? handleAbrirCancelar : undefined}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
            {/* Lado izquierdo: Buscador y Pestañas de Período agrupadas */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Buscador */}
              <div className="relative w-56 sm:w-64 shrink-0">
                <Icon
                  name="search"
                  size="16px"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por lote, modelo, defecto..."
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

              {/* Botones de Período al lado izquierdo: RECIENTES | HOY | HISTÓRICO (Ocultos en Papelera) */}
              {!verEliminados && (
                <>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePeriodoChange('ultimos')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        periodo === 'ultimos'
                          ? 'bg-marca-primario text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Recientes (30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodoChange('hoy')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
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
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
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
                </>
              )}
            </div>

            {/* Lado derecho: Selector de Departamento y Papelera */}
            <div className="shrink-0 flex items-center justify-end gap-2">
              {puedeCambiarDepto && (
                <select
                  value={deptoAuditor?.id.toString() || ''}
                  onChange={(e) => handleDeptoAuditorChange(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40"
                  title="Estación de inspección"
                >
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              )}

              {/* Botón Papelera al final de los filtros (solo con permiso defectos.eliminar) */}
              {puedeEliminar && (<button
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
              </button>)}
            </div>
          </div>
        }
      />

      {/* MODAL DE CAPTURA */}
      <DefectoModalCaptura
        isOpen={modalCapturaAbierto}
        onClose={() => setModalCapturaAbierto(false)}
        onSuccess={(nuevosIds) => {
          if (nuevosIds && nuevosIds.length > 0) {
            setDestacadosIds(nuevosIds);
            setTimeout(() => {
              setDestacadosIds([]);
            }, 6000);
          }
          cargarRegistros();
        }}
        departamentoAuditor={deptoAuditor}
        lineas={lineas}
        departamentos={departamentos}
      />

      {/* MODAL DE CANCELACIÓN CON AUTORIZACIÓN (ADMIN / COORD) */}
      <DefectoCancelarModal
        isOpen={modalCancelarAbierto}
        onClose={() => {
          setModalCancelarAbierto(false);
          setItemACancelar(null);
        }}
        onSuccess={cargarRegistros}
        item={itemACancelar}
      />

      {/* MODAL DE DETALLE PEQUEÑO CON FECHA Y HORA EXACTA */}
      <InspeccionDetalleModal
        isOpen={modalDetalleAbierto}
        onClose={() => {
          setModalDetalleAbierto(false);
          setItemDetalle(null);
        }}
        item={itemDetalle}
      />

      {/* MODAL DE VINCULACIÓN FÍSICA OTP */}
      <TerminalVinculacionModal
        isOpen={modalVinculacionAbierto}
        onClose={() => setModalVinculacionAbierto(false)}
        onSuccess={() => {
          recargarTerminal();
          cargarRegistros();
        }}
      />

      {/* BOTÓN FLOTANTE REGRESAR ARRIBA (Liquid Glass & Discreto) */}
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
