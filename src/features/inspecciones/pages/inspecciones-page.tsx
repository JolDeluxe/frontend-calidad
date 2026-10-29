import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import { ApiError, connectivityState } from '@/lib/api/http-client';
import { InspeccionesTabla } from '../components/inspecciones-tabla';
import { DefectoModalCaptura } from '../components/defecto-modal-captura';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { DefectoCancelarModal } from '../components/defecto-cancelar-modal';
import { InspeccionDetalleModal } from '../components/inspeccion-detalle-modal';
import { inspeccionesApi } from '../api/inspecciones-api';
import {
  inspeccionesOfflineService,
  type ResumenColaOffline,
} from '../services/inspecciones-offline.service';
import { useAuthSession } from '@/providers/auth-provider';
import { useTerminalStatus } from '@/features/terminales/hooks/use-terminal-status';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';
import { TerminalVinculacionModal } from '@/features/terminales/components/terminal-vinculacion-modal';
import type {
  InspeccionFilaResponse,
  LineaOperativa,
} from '../types/inspecciones.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

const ROLES_CON_CAMBIO_DEPTO = ['SUPER_ADMIN', 'ADMIN', 'COORD'];
const CACHE_FILAS_KEY_PREFIX = 'mbc_inspecciones_filas_cache_v1_';

function leerCacheFilasServidor(deptoId?: number, verEliminados?: boolean): InspeccionFilaResponse[] {
  if (typeof window === 'undefined') return [];
  try {
    const sufijo = verEliminados ? 'del' : 'act';

    // 1. Intentar con la clave específica del departamento si se indicó
    if (deptoId) {
      const key = `${CACHE_FILAS_KEY_PREFIX}${deptoId}_${sufijo}`;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    // 2. Intentar con la clave global de respaldo
    const keyGlobal = `${CACHE_FILAS_KEY_PREFIX}global_${sufijo}`;
    const rawGlobal = window.localStorage.getItem(keyGlobal);
    if (rawGlobal) {
      const parsedGlobal = JSON.parse(rawGlobal);
      if (Array.isArray(parsedGlobal) && parsedGlobal.length > 0) return parsedGlobal;
    }

    // 3. Intentar con el departamento por defecto de piso (MONTADO id 6)
    const keyMontado = `${CACHE_FILAS_KEY_PREFIX}6_${sufijo}`;
    const rawMontado = window.localStorage.getItem(keyMontado);
    if (rawMontado) {
      const parsedMontado = JSON.parse(rawMontado);
      if (Array.isArray(parsedMontado) && parsedMontado.length > 0) return parsedMontado;
    }

    // 4. Buscar cualquier clave disponible en localStorage que coincida con el sufijo
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHE_FILAS_KEY_PREFIX) && k.endsWith(`_${sufijo}`)) {
        const val = window.localStorage.getItem(k);
        if (val) {
          const p = JSON.parse(val);
          if (Array.isArray(p) && p.length > 0) return p;
        }
      }
    }

    return [];
  } catch {
    return [];
  }
}

function guardarCacheFilasServidor(
  items: InspeccionFilaResponse[],
  deptoId?: number,
  verEliminados?: boolean,
): void {
  if (typeof window === 'undefined') return;
  try {
    const sufijo = verEliminados ? 'del' : 'act';
    const key = `${CACHE_FILAS_KEY_PREFIX}${deptoId ?? 'global'}_${sufijo}`;
    const payload = JSON.stringify(items.slice(0, 120));
    window.localStorage.setItem(key, payload);
    // Guardar también copia en clave global para perfiles administrativos sin terminal fija
    if (deptoId) {
      window.localStorage.setItem(`${CACHE_FILAS_KEY_PREFIX}global_${sufijo}`, payload);
    }
  } catch {
    // Ignorar errores de cuota
  }
}

function reconciliarFilasLocalesYServidor(
  filasLocales: InspeccionFilaResponse[],
  filasServidor: InspeccionFilaResponse[],
  busqueda?: string,
): InspeccionFilaResponse[] {
  const foliosServidor = new Set(
    filasServidor.map((f) => f.folio?.trim().toUpperCase()).filter(Boolean),
  );
  const localesSinDuplicar = filasLocales.filter((f) => {
    const folioNorm = f.folio?.trim().toUpperCase();
    if (folioNorm && foliosServidor.has(folioNorm)) return false;
    return true;
  });

  let servidorFiltrado = filasServidor;
  if (busqueda && busqueda.trim().length > 0) {
    const q = busqueda.trim().toLowerCase();
    servidorFiltrado = filasServidor.filter(
      (r) =>
        r.lote?.toLowerCase().includes(q) ||
        r.modelo?.toLowerCase().includes(q) ||
        r.descripcion?.toLowerCase().includes(q) ||
        String(r.defectoClave ?? '').toLowerCase().includes(q) ||
        r.defectoNombre?.toLowerCase().includes(q) ||
        r.lista?.toLowerCase().includes(q) ||
        r.usuario?.toLowerCase().includes(q),
    );
  }

  return [...localesSinDuplicar, ...servidorFiltrado];
}

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
  const { user, isOfflineMode, refreshSession } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Integración física de terminal
  const {
    estado: terminalEstado,
    terminal,
    esOffline: terminalOffline,
    errorMensaje: terminalError,
    recargar: recargarTerminal,
  } = useTerminalStatus();
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false);

  // Estado de la cola offline y conectividad
  const [resumenCola, setResumenCola] = useState<ResumenColaOffline>({
    pendientes: 0,
    sincronizando: 0,
    erroresReintentables: 0,
    requierenRevision: 0,
    contingencias: 0,
    items: [],
  });
  const [sincronizandoManual, setSincronizandoManual] = useState(false);
  const [backendReachable, setBackendReachable] = useState<boolean>(() =>
    connectivityState.isBackendReachable(),
  );
  const cachedServerItemsRef = useRef<InspeccionFilaResponse[]>([]);

  useEffect(() => {
    const unsubscribe = inspeccionesOfflineService.subscribe((nuevoResumen) => {
      setResumenCola(nuevoResumen);
    });
    return unsubscribe;
  }, []);

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
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [mostrandoDatosLocales, setMostrandoDatosLocales] = useState(false);
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
      const cargarDesdeCacheLocal = async () => {
        let parsedDeptos: Departamento[] = [];
        try {
          const dStr = localStorage.getItem('mbc_cache_departamentos_v1');
          if (dStr) {
            const parsed = JSON.parse(dStr);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsedDeptos = parsed;
              setDepartamentos(parsed);
            }
          }
          const lStr = localStorage.getItem('mbc_cache_lineas_v1');
          if (lStr) {
            const parsedLineas = JSON.parse(lStr);
            if (Array.isArray(parsedLineas) && parsedLineas.length > 0) {
              setLineas(parsedLineas);
            }
          }
        } catch {}

        if (parsedDeptos.length === 0) {
          parsedDeptos = [
            { id: 6, codigo: 'MONTADO', nombre: 'MONTADO', numeroLineas: 2, estado: 'ACTIVO' },
          ];
          setDepartamentos(parsedDeptos);
        }

        const perfilLocal = terminal ?? (await terminalStorage.getProfileFromIdb());
        if (!cancelado) {
          if (deptoParam && parsedDeptos.length > 0) {
            const enc = parsedDeptos.find((d) => d.id === Number(deptoParam));
            if (enc) {
              setDeptoAuditor(enc);
              return;
            }
          }

          if (perfilLocal) {
            const enc = parsedDeptos.find((d) => d.id === perfilLocal.departamentoId);
            const numLineas =
              enc?.numeroLineas ??
              perfilLocal.numeroLineas ??
              (perfilLocal.departamentoCodigo === 'MONTADO' ? 2 : 1);
            setDeptoAuditor({
              id: perfilLocal.departamentoId,
              codigo: perfilLocal.departamentoCodigo,
              nombre: perfilLocal.departamentoNombre,
              numeroLineas: numLineas,
              estado: 'ACTIVO',
            } as Departamento);
          } else if (!esInspector) {
            // Perfiles administrativos (SUPER_ADMIN, ADMIN, etc.): seleccionar Montado por defecto si no hay terminal física vinculada
            const montado =
              parsedDeptos.find((d) => d.codigo === 'MONTADO') ||
              parsedDeptos[0];
            if (montado) {
              setDeptoAuditor(montado);
            }
          }
        }
      };

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await cargarDesdeCacheLocal();
        return;
      }

      try {
        const [deptosRes, lineasRes] = await Promise.all([
          inspeccionesApi.getDepartamentos(),
          inspeccionesApi.getLineas(),
        ]);
        if (!cancelado) {
          setDepartamentos(deptosRes);
          setLineas(lineasRes);

          try {
            localStorage.setItem('mbc_cache_departamentos_v1', JSON.stringify(deptosRes));
            localStorage.setItem('mbc_cache_lineas_v1', JSON.stringify(lineasRes));
          } catch {}

          // Si el usuario tiene departamento asignado o está en una terminal física vinculada
          const userDeptos = (user as any)?.departamentos || [];
          if (deptoParam) {
            const enc = deptosRes.find((d) => d.id === Number(deptoParam));
            if (enc) setDeptoAuditor(enc);
          } else if (esInspector && terminalEstado === 'vinculada' && terminal) {
            // En una terminal física vinculada, la vista por defecto del inspector es siempre el departamento de la estación
            const enc = deptosRes.find((d) => d.id === terminal.departamentoId);
            if (enc) setDeptoAuditor(enc);
          } else if (userDeptos.length > 0) {
            const primerDeptoId = userDeptos[0].departamentoId || userDeptos[0].id;
            const enc = deptosRes.find((d) => d.id === primerDeptoId);
            if (enc) setDeptoAuditor(enc);
          } else if (!esInspector) {
            // Solo para perfiles administrativos/consulta se preselecciona el primer departamento si no hay filtro
            const montado = deptosRes.find((d) => d.codigo === 'MONTADO') || deptosRes[0];
            if (montado) setDeptoAuditor(montado);
          } else {
            setDeptoAuditor(null);
          }
        }
      } catch (err) {
        console.warn('[Offline] Error cargando catálogos de inspecciones (usando perfil de terminal local)', err);
        await cargarDesdeCacheLocal();
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [user, deptoParam, terminal, isOfflineMode, terminalOffline, terminalEstado, esInspector]);

  // Consultar filas de inspección (combinando MySQL + capturas locales en cola de IndexedDB)
  const cargarRegistros = useCallback(
    async (pageTarget = 1, append = false, options?: { skipServerIfUnreachable?: boolean }) => {
      if (append) {
        setCargandoMas(true);
      } else {
        setIsLoading(true);
      }

      const perfilLocal = terminal ?? (await terminalStorage.getProfileFromIdb());
      const deptoFiltroId = deptoAuditor?.id ?? perfilLocal?.departamentoId;

      const persisted = leerCacheFilasServidor(deptoFiltroId, verEliminados);
      if (persisted.length > 0) {
        cachedServerItemsRef.current = persisted;
      }

      const filasLocales = await inspeccionesOfflineService.obtenerFilasEnColaLocal({
        departamentoAuditoriaId: deptoFiltroId,
        busqueda: busquedaParam || undefined,
        soloEliminados: verEliminados,
      });

      const sinConexionActiva =
        (typeof navigator !== 'undefined' && navigator.onLine === false) ||
        (options?.skipServerIfUnreachable && !connectivityState.isBackendReachable());

      if (sinConexionActiva) {
        const combinadas = reconciliarFilasLocalesYServidor(
          filasLocales,
          cachedServerItemsRef.current,
          busquedaParam,
        );
        setItems(combinadas);
        setTotalItems(combinadas.length);
        setPage(1);
        setTotalPages(1);
        setErrorConsulta(null);
        setMostrandoDatosLocales(true);
        setIsLoading(false);
        setCargandoMas(false);
        return;
      }

      try {
        const resp = await inspeccionesApi.getFilasInspeccion({
          periodo,
          busqueda: busquedaParam || undefined,
          departamentoAuditoriaId: deptoFiltroId,
          mes: mesParam ? Number(mesParam) : undefined,
          anio: anioParam ? Number(anioParam) : undefined,
          soloEliminados: verEliminados,
          page: pageTarget,
          limit: periodo === 'ultimos' ? 30 : 100,
        });

        setErrorConsulta(null);
        setMostrandoDatosLocales(filasLocales.length > 0);

        if (append) {
          cachedServerItemsRef.current = [...cachedServerItemsRef.current, ...resp.items];
          const combinadas = reconciliarFilasLocalesYServidor(
            filasLocales,
            cachedServerItemsRef.current,
          );
          setItems(combinadas);
        } else {
          cachedServerItemsRef.current = resp.items;
          if (!busquedaParam) {
            guardarCacheFilasServidor(resp.items, deptoFiltroId, verEliminados);
          }
          const combinadas = reconciliarFilasLocalesYServidor(filasLocales, resp.items);
          setItems(combinadas);
        }
        setTotalItems(resp.total + filasLocales.length);
        setPage(pageTarget);
        setTotalPages(resp.totalPages || 1);
      } catch (err: any) {
        const esErrorHttp = err instanceof ApiError && err.statusCode >= 400;
        const esErrorNegocio =
          err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;

        if (esErrorNegocio) {
          console.error('Error al consultar inspecciones', err);
          setErrorConsulta(err?.message || 'Error al consultar historial de inspecciones');
          toast.error(err?.message || 'Error al consultar historial de inspecciones', {
            title: 'Error de Consulta',
          });
        } else if (esErrorHttp) {
          setErrorConsulta(
            err?.message || 'El servidor respondió con un error al consultar las inspecciones.',
          );
        } else {
          // Error de red / conexión rechazada
          setErrorConsulta(null);
        }

        if (!append) {
          const combinadas = reconciliarFilasLocalesYServidor(
            filasLocales,
            cachedServerItemsRef.current,
            busquedaParam,
          );
          setItems(combinadas);
          setTotalItems(combinadas.length);
          setMostrandoDatosLocales(true);
        }
      } finally {
        setIsLoading(false);
        setCargandoMas(false);
      }
    },
    [
      periodo,
      busquedaParam,
      deptoAuditor,
      terminal,
      mesParam,
      anioParam,
      verEliminados,
      user?.id,
      isOfflineMode,
      terminalOffline,
    ],
  );

  const handleCargarMas = () => {
    if (cargandoMas || page >= totalPages) return;
    cargarRegistros(page + 1, true);
  };

  useEffect(() => {
    const prevReachableRef = { current: connectivityState.isBackendReachable() };
    return connectivityState.subscribe((reachable) => {
      const pasoDeOfflineAOnline = !prevReachableRef.current && reachable;
      prevReachableRef.current = reachable;
      setBackendReachable(reachable);
      if (pasoDeOfflineAOnline) {
        void refreshSession();
        recargarTerminal();
        void inspeccionesOfflineService
          .sincronizarCola({ forceIgnoreBackoff: true })
          .then(() => {
            void cargarRegistros(1, false);
          });
      }
    });
  }, [recargarTerminal, cargarRegistros, refreshSession]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void cargarRegistros(1, false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [cargarRegistros]);

  // Sincronización automática oportunista al recuperar conectividad o volver a la pestaña (sin polling cada segundo)
  const prevPendientesRef = useRef<number>(0);
  useEffect(() => {
    const pendientesActuales =
      resumenCola.pendientes + resumenCola.sincronizando + resumenCola.erroresReintentables;
    if (prevPendientesRef.current > 0 && pendientesActuales === 0 && backendReachable) {
      void cargarRegistros(1, false);
    }
    prevPendientesRef.current = pendientesActuales;
  }, [
    resumenCola.pendientes,
    resumenCola.sincronizando,
    resumenCola.erroresReintentables,
    backendReachable,
    cargarRegistros,
  ]);

  useEffect(() => {
    const intentarSincronizarAlVolver = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const res = await inspeccionesOfflineService.sincronizarCola({ forceIgnoreBackoff: true });
      if (res.sincronizadas > 0 || connectivityState.isBackendReachable()) {
        void cargarRegistros(1, false);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (
        resumenCola.pendientes > 0 ||
        resumenCola.erroresReintentables > 0 ||
        !connectivityState.isBackendReachable()
      ) {
        void intentarSincronizarAlVolver();
      }
    };

    const handleOnline = () => {
      void intentarSincronizarAlVolver();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [resumenCola.pendientes, resumenCola.erroresReintentables, cargarRegistros]);

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

  const handleSincronizarManual = async () => {
    setSincronizandoManual(true);
    try {
      const res = await inspeccionesOfflineService.sincronizarCola({ forceIgnoreBackoff: true });
      if (res.sincronizadas > 0) {
        toast.success(`Se sincronizaron ${res.sincronizadas} capturas pendientes con el servidor.`, {
          title: 'Sincronización Completada',
        });
        void cargarRegistros(1, false);
      } else if (res.pendientes > 0) {
        toast.warning(
          `Aún quedan ${res.pendientes} capturas pendientes de sincronización. Verifique la conexión con el servidor.`,
          { title: 'Sincronización Pendiente' },
        );
      } else {
        toast.info('No hay capturas pendientes por sincronizar.');
      }
    } finally {
      setSincronizandoManual(false);
    }
  };

  const totalColaPendiente =
    resumenCola.pendientes + resumenCola.sincronizando + resumenCola.erroresReintentables;
  const estaSinConexionBackend = isOfflineMode || terminalOffline || !backendReachable;
  const hayAlertasOffline =
    estaSinConexionBackend ||
    totalColaPendiente > 0 ||
    resumenCola.requierenRevision > 0 ||
    resumenCola.contingencias > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* VISTA BLOQUEANTE CUANDO EL INSPECTOR NO TIENE TERMINAL FÍSICA VINCULADA */}
      {esInspector && terminalEstado === 'no_vinculada' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center my-auto min-h-[460px]">
          <div className="h-20 w-20 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-6 shadow-xs">
            <Icon name="phonelink_erase" size="40px" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-200 mb-3">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
            Estación Física Desvinculada
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase max-w-xl">
            Estación de Trabajo No Vinculada
          </h2>

          <p className="text-sm text-slate-600 max-w-lg mt-3 leading-relaxed">
            {terminalError ||
              'Esta computadora física no está asociada a ninguna línea o departamento de producción. Para capturar o consultar defectos en planta, es obligatorio vincular la terminal mediante un código OTP de 6 dígitos.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setModalVinculacionAbierto(true)}
              className="font-bold text-sm h-11 px-6 shadow-md gap-2 cursor-pointer"
            >
              <Icon name="key" size="18px" />
              <span>Vincular Estación con Código OTP</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={recargarTerminal}
              className="text-sm h-11 px-5 border-slate-300 text-slate-700 hover:bg-slate-50 gap-2 cursor-pointer"
            >
              <Icon name="refresh" size="18px" />
              <span>Comprobar Estado</span>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Icon name="info" size="16px" />
            <span>Solicite a un Administrador o Coordinador un código de vinculación para esta PC.</span>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Estado de Continuidad Operativa Offline y Cola de Sincronización */}
          {hayAlertasOffline && (
            <div
              className={`shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold ${
                estaSinConexionBackend
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : resumenCola.erroresReintentables > 0 || resumenCola.requierenRevision > 0
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-800 dark:text-sky-300'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Icon
                    name={estaSinConexionBackend ? 'wifi_off' : 'cloud_sync'}
                    size="16px"
                  />
                  {estaSinConexionBackend ? 'Modo Offline Activo' : 'Cola de Sincronización'}
                </span>

                {totalColaPendiente > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/60 border border-current/20">
                    {totalColaPendiente} captura{totalColaPendiente === 1 ? '' : 's'} pendiente
                    {totalColaPendiente === 1 ? '' : 's'}
                  </span>
                )}

                {resumenCola.sincronizando > 0 && (
                  <span className="italic">Sincronizando con servidor...</span>
                )}

                {resumenCola.requierenRevision > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white">
                    {resumenCola.requierenRevision} en revisión de auditoría
                  </span>
                )}

                {resumenCola.contingencias > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    {resumenCola.contingencias} incidencia{resumenCola.contingencias === 1 ? '' : 's'} registrada
                    {resumenCola.contingencias === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {totalColaPendiente > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSincronizarManual}
                  disabled={sincronizandoManual || resumenCola.sincronizando > 0}
                  className="h-7 px-2.5 text-[11px] font-bold cursor-pointer"
                >
                  <Icon name="sync" size="14px" />
                  <span className="ml-1">
                    {sincronizandoManual ? 'Sincronizando...' : 'Sincronizar ahora'}
                  </span>
                </Button>
              )}
            </div>
          )}

          {/* Aviso claro si la estación tiene credencial pero no se pudo verificar su perfil por falta de conexión */}
          {esInspector && terminalEstado === 'error_conexion' && (
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Icon name="warning" size="16px" className="text-amber-700 shrink-0" />
                <span>
                  {terminalError ||
                    'No se puede verificar la vinculación de esta estación porque el servidor no responde y no hay un perfil local guardado. La captura se habilitará al recuperar la conexión.'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await connectivityState.checkBackendHealth();
                    await refreshSession();
                  } catch {}
                  await recargarTerminal();
                  void cargarRegistros(1, false);
                }}
                className="h-7 px-2.5 text-[11px] font-bold cursor-pointer"
              >
                <Icon name="refresh" size="14px" className="mr-1" />
                <span>Reintentar</span>
              </Button>
            </div>
          )}

          {/* Encabezado Principal: Nombre de Departamento en Grande y Botón de Captura */}
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
                {terminalEstado === 'vinculada' && terminal
                  ? terminal.departamentoNombre
                  : deptoAuditor?.nombre || 'Inspección de Calidad'}
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
        sinConexion={estaSinConexionBackend}
        errorConsulta={errorConsulta}
        mostrandoDatosLocales={mostrandoDatosLocales}
        onReintentar={async () => {
          setIsLoading(true);
          try {
            await connectivityState.checkBackendHealth();
            await refreshSession();
          } catch {}
          try {
            await recargarTerminal();
          } catch {}
          void cargarRegistros(1, false);
        }}
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
      </>
      )}

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
          void cargarRegistros(1, false, { skipServerIfUnreachable: true });
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
