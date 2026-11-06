import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuthSession } from '@/providers/auth-provider';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useTerminalStatus } from '@/features/terminales/hooks/use-terminal-status';
import { TerminalVinculacionModal } from '@/features/terminales/components/terminal-vinculacion-modal';
import {
  inspeccionesApi,
  type ContadorDeptoMetrica,
  type TopDefectoDashboardItem,
  type RutaCruzadaDashboardItem,
  type DefectoCruzadoDashboardItem,
} from '@/features/inspecciones/api/inspecciones-api';
import { CalendarioDiaPicker } from '@/features/registro/components/calendario-dia-picker';
import {
  describirPeriodoActivo,
  formatearEtiquetaAnio,
  formatearEtiquetaSemana,
  formatearSemanaIsoCodigo,
  getHoyMexicoIso,
  MODALIDADES_PERIODO_OPCIONES,
  obtenerSemanasDeAnio,
  parsearSemanaIsoCodigo,
} from '@/features/registro/utils/filtros-registro';
import type {
  ModalidadPeriodoRegistro,
  PeriodosDisponiblesResponse,
  FiltrosRegistroState,
} from '@/features/registro/types/registro.types';

export function HomePage() {
  const { user } = useAuthSession();
  const { estado: terminalEstado, terminal, recargar } = useTerminalStatus();
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const rolCodigo = user?.rol?.codigo || '';
  const esAdmin = ['SUPER_ADMIN', 'ADMIN', 'COORD'].includes(rolCodigo);
  const hoyIso = useMemo(() => getHoyMexicoIso(), []);

  // 1. Periodos reales disponibles en la base de datos
  const [periodosDisponibles, setPeriodosDisponibles] =
    useState<PeriodosDisponiblesResponse | null>(null);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);

  // 2. Estado de filtros temporales (Por defecto: SEMANA)
  const [periodo, setPeriodo] = useState<ModalidadPeriodoRegistro>(() => {
    const raw = searchParams.get('periodo');
    if (raw === 'hoy' || raw === 'dia' || raw === 'semana' || raw === 'mes' || raw === 'anio') {
      return raw;
    }
    return 'semana'; // Requisito: por defecto Semana
  });

  const [anio, setAnio] = useState<number | undefined>(() => {
    const raw = searchParams.get('anio');
    return raw && /^\d{4}$/.test(raw) ? Number(raw) : undefined;
  });

  const [anioIso, setAnioIso] = useState<number | undefined>(() => {
    const raw = searchParams.get('anioIso') || searchParams.get('anio');
    return raw && /^\d{4}$/.test(raw) ? Number(raw) : undefined;
  });

  const [semana, setSemana] = useState<number | undefined>(() => {
    const raw = searchParams.get('semana');
    return raw && /^\d{1,2}$/.test(raw) ? Number(raw) : undefined;
  });

  const [mes, setMes] = useState<number | undefined>(() => {
    const raw = searchParams.get('mes');
    return raw && /^\d{1,2}$/.test(raw) ? Number(raw) : undefined;
  });

  const [dia, setDia] = useState<string | undefined>(() => {
    const raw = searchParams.get('dia');
    return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
  });

  // Estados de datos del dashboard
  const [contadoresDepto, setContadoresDepto] = useState<ContadorDeptoMetrica[]>([]);
  const [rutasCruzadas, setRutasCruzadas] = useState<RutaCruzadaDashboardItem[]>([]);
  const [defectosCruzados, setDefectosCruzados] = useState<DefectoCruzadoDashboardItem[]>([]);
  const [topPorLinea, setTopPorLinea] = useState<Record<string, TopDefectoDashboardItem[]>>({});
  const [cargandoMetricas, setCargandoMetricas] = useState(true);

  // Cargar periodos disponibles reales al montar
  useEffect(() => {
    let cancelado = false;
    setCargandoPeriodos(true);

    inspeccionesApi
      .getPeriodosDisponibles()
      .then((res) => {
        if (cancelado) return;
        setPeriodosDisponibles(res);

        // Si es la primera carga y no hay filtros explícitos en URL, inicializar con la semana más reciente
        if (!searchParams.get('semana') && !searchParams.get('dia') && !searchParams.get('mes')) {
          if (res.semanas && res.semanas.length > 0) {
            const ultimaSem = res.semanas[0];
            setPeriodo('semana');
            setAnioIso(ultimaSem.anioIso);
            setSemana(ultimaSem.semana);
          } else if (res.aniosIso && res.aniosIso.length > 0) {
            setAnioIso(res.aniosIso[0].anioIso);
          }
        }
      })
      .catch((err) => {
        if (!cancelado) console.error('Error al cargar periodos disponibles en dashboard:', err);
      })
      .finally(() => {
        if (!cancelado) setCargandoPeriodos(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Consultar métricas del dashboard según el período seleccionado
  const cargarMetricas = useCallback(async () => {
    setCargandoMetricas(true);
    try {
      const resp = await inspeccionesApi.getDashboardMetricas({
        periodo,
        dia: periodo === 'dia' ? dia : undefined,
        semana: periodo === 'semana' ? semana : undefined,
        anioIso: periodo === 'semana' ? anioIso : undefined,
        mes: periodo === 'mes' ? mes : undefined,
        anio: periodo === 'mes' || periodo === 'anio' ? anio : undefined,
      });

      // 1. Departamentos con registros
      if (resp.contadoresDepto && resp.contadoresDepto.length > 0) {
        setContadoresDepto(resp.contadoresDepto);
      } else if (resp.contadoresDeptoHoy) {
        const list: ContadorDeptoMetrica[] = [];
        for (const [deptoIdStr, val] of Object.entries(resp.contadoresDeptoHoy)) {
          if (val.incidencias > 0 || val.pares > 0) {
            list.push({
              departamentoId: Number(deptoIdStr),
              departamentoNombre: `Depto ${deptoIdStr}`,
              incidencias: val.incidencias,
              pares: val.pares,
            });
          }
        }
        setContadoresDepto(list);
      } else {
        setContadoresDepto([]);
      }

      // 2. Defectos encontrados en otros departamentos (cruzados)
      setRutasCruzadas(resp.rutasCruzadas || []);
      setDefectosCruzados(resp.defectosCruzados || []);

      // 3. Top por línea (BOTA)
      setTopPorLinea(resp.topSemanal || { BOTA: [] });
    } catch (err) {
      console.error('Error al consultar métricas del dashboard:', err);
      setContadoresDepto([]);
      setRutasCruzadas([]);
      setDefectosCruzados([]);
      setTopPorLinea({ BOTA: [] });
    } finally {
      setCargandoMetricas(false);
    }
  }, [periodo, dia, semana, anioIso, mes, anio]);

  useEffect(() => {
    // Si estamos en semana pero aún no se define la semana y hay periodos cargados, esperar
    if (periodo === 'semana' && !semana && periodosDisponibles?.semanas?.length) {
      const ult = periodosDisponibles.semanas[0];
      setAnioIso(ult.anioIso);
      setSemana(ult.semana);
      return;
    }
    void cargarMetricas();
  }, [cargarMetricas, periodo, semana, periodosDisponibles]);

  // Actualización automática al recibir reconexión del backend
  useEffect(() => {
    const handleReachable = () => {
      void cargarMetricas();
    };
    window.addEventListener('backend:reachable', handleReachable);
    return () => window.removeEventListener('backend:reachable', handleReachable);
  }, [cargarMetricas]);

  // Sincronizar URL searchParams con los filtros
  const actualizarFiltrosUrl = useCallback(
    (
      nuevoPeriodo: ModalidadPeriodoRegistro,
      valores?: {
        anio?: number;
        anioIso?: number;
        semana?: number;
        mes?: number;
        dia?: string;
      }
    ) => {
      const p = new URLSearchParams();
      p.set('periodo', nuevoPeriodo);

      if (nuevoPeriodo === 'semana') {
        const aIso = valores?.anioIso ?? anioIso;
        const sem = valores?.semana ?? semana;
        if (aIso) p.set('anioIso', String(aIso));
        if (sem) p.set('semana', String(sem));
      } else if (nuevoPeriodo === 'mes') {
        const a = valores?.anio ?? anio;
        const m = valores?.mes ?? mes;
        if (a) p.set('anio', String(a));
        if (m) p.set('mes', String(m));
      } else if (nuevoPeriodo === 'anio') {
        const a = valores?.anio ?? anio;
        if (a) p.set('anio', String(a));
      } else if (nuevoPeriodo === 'dia') {
        const d = valores?.dia ?? dia;
        if (d) p.set('dia', d);
      }

      setSearchParams(p, { replace: true });
    },
    [anioIso, semana, anio, mes, dia, setSearchParams]
  );

  // Cambiar modalidad de período
  const handleModalidadChange = (nuevaModalidad: ModalidadPeriodoRegistro) => {
    setPeriodo(nuevaModalidad);

    if (nuevaModalidad === 'hoy') {
      actualizarFiltrosUrl('hoy');
    } else if (nuevaModalidad === 'semana') {
      const ultSem = periodosDisponibles?.semanas?.[0];
      const aIso = ultSem ? ultSem.anioIso : anioIso;
      const sem = ultSem ? ultSem.semana : semana;
      if (aIso) setAnioIso(aIso);
      if (sem) setSemana(sem);
      actualizarFiltrosUrl('semana', { anioIso: aIso, semana: sem });
    } else if (nuevaModalidad === 'mes') {
      const ultMes = periodosDisponibles?.meses?.[0];
      const a = ultMes ? ultMes.anio : anio;
      const m = ultMes ? ultMes.mes : mes;
      if (a) setAnio(a);
      if (m) setMes(m);
      actualizarFiltrosUrl('mes', { anio: a, mes: m });
    } else if (nuevaModalidad === 'anio') {
      const ultAnio = periodosDisponibles?.anios?.[0]?.anio || anio;
      if (ultAnio) setAnio(ultAnio);
      actualizarFiltrosUrl('anio', { anio: ultAnio });
    } else if (nuevaModalidad === 'dia') {
      const ultDia = periodosDisponibles?.dias?.[0]?.fecha || hoyIso;
      setDia(ultDia);
      actualizarFiltrosUrl('dia', { dia: ultDia });
    }
  };

  // Semanas disponibles para el año ISO seleccionado
  const semanasDelAnioSeleccionado = useMemo(() => {
    return obtenerSemanasDeAnio(periodosDisponibles?.semanas, anioIso);
  }, [periodosDisponibles?.semanas, anioIso]);

  // Descripción legible del período activo
  const periodoActivoDescripcion = useMemo(() => {
    const estadoFiltros: FiltrosRegistroState = {
      periodo,
      anio,
      anioIso,
      semana,
      mes,
      dia,
    };
    return describirPeriodoActivo(estadoFiltros, periodosDisponibles);
  }, [periodo, anio, anioIso, semana, mes, dia, periodosDisponibles]);

  // Totales generales calculados del período
  const { totalIncidencias, totalPares } = useMemo(() => {
    let inc = 0;
    let par = 0;
    for (const c of contadoresDepto) {
      inc += c.incidencias;
      par += c.pares;
    }
    return { totalIncidencias: inc, totalPares: par };
  }, [contadoresDepto]);

  // Lista de items de Top 10 para la línea BOTA
  const itemsTopBota = useMemo(() => {
    if (topPorLinea['BOTA']) return topPorLinea['BOTA'];
    const primeraLinea = Object.keys(topPorLinea)[0];
    return primeraLinea ? topPorLinea[primeraLinea] : [];
  }, [topPorLinea]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. ENCABEZADO DIRECTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/80">
        <h1 className="fuente-titulos text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Bienvenido, {user?.nombre || user?.usuario}
        </h1>
      </div>

      {/* 2. ESTADO DE TERMINAL */}
      {esAdmin ? (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-3.5 py-1.5 flex flex-wrap items-center justify-between text-2xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <Icon name="devices" size="14px" className="text-slate-400" />
            <span>
              Modo Administrativo:{' '}
              <strong className="text-slate-800">PC de Consulta</strong>
            </span>
            <span className="text-slate-300">|</span>
            {terminalEstado === 'vinculada' && terminal ? (
              <span className="text-emerald-700 font-medium">
                Terminal vinculada: <strong>{terminal.nombre}</strong> ({terminal.departamentoNombre})
              </span>
            ) : (
              <span className="text-slate-500">Sin estación física asignada</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModalVinculacionAbierto(true)}
            className="text-marca-primario hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
            title="Vincular o cambiar estación física"
          >
            <Icon name="key" size="12px" />
            <span>{terminalEstado === 'vinculada' ? 'Cambiar Estación' : 'Vincular Estación'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-marca-primario/10 text-marca-primario shrink-0">
              <Icon name="computer" size="20px" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {terminalEstado === 'vinculada' && terminal
                  ? `Estación de Planta: ${terminal.nombre} (${terminal.departamentoNombre})`
                  : 'Esta computadora no está vinculada a una estación de captura'}
              </p>
              <p className="text-2xs text-slate-500 mt-0.5">
                {terminalEstado === 'vinculada'
                  ? 'Habilitada para captura de defectos en piso.'
                  : 'Para capturar defectos, vincula esta PC con el código OTP.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={terminalEstado === 'vinculada' ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setModalVinculacionAbierto(true)}
            className="text-xs shrink-0 cursor-pointer"
          >
            <Icon name="key" size="13px" className="mr-1.5" />
            <span>{terminalEstado === 'vinculada' ? 'Cambiar Estación' : 'Vincular Estación (OTP)'}</span>
          </Button>
        </div>
      )}

      {/* 3. BARRA DE FILTROS TEMPORALES (POR DEFECTO SEMANA, CAMBIABLE A HOY, DÍA, MES, AÑO) */}
      <div className="bg-white border border-border/90 rounded-xl p-3.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 select-none">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Icon name="filter_list" size="16px" className="text-marca-primario" />
            <span>Filtrar período:</span>
          </div>

          {/* Selector de Modalidad (Hoy, Día, Semana, Mes, Año) */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs shrink-0">
            {MODALIDADES_PERIODO_OPCIONES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleModalidadChange(mod.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  periodo === mod.id
                    ? 'bg-marca-primario text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {mod.shortLabel}
              </button>
            ))}
          </div>

          {/* Selectores dependientes de la modalidad */}
          {/* Modalidad AÑO */}
          {periodo === 'anio' && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              <select
                value={anio ?? ''}
                disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setAnio(val);
                  actualizarFiltrosUrl('anio', { anio: val });
                }}
                className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
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

          {/* Modalidad MES */}
          {periodo === 'mes' && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              <select
                value={anio ?? ''}
                disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setAnio(val);
                  actualizarFiltrosUrl('mes', { anio: val, mes: undefined });
                }}
                className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
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
                value={mes ?? ''}
                disabled={!periodosDisponibles || periodosDisponibles.meses.length === 0}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setMes(val);
                  actualizarFiltrosUrl('mes', { anio, mes: val });
                }}
                className="w-32 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
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

          {/* Modalidad SEMANA (por defecto) */}
          {periodo === 'semana' && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              <select
                value={anioIso ?? ''}
                disabled={!periodosDisponibles || (periodosDisponibles.aniosIso || []).length === 0}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setAnioIso(val);
                  setSemana(undefined);
                  actualizarFiltrosUrl('semana', { anioIso: val, semana: undefined });
                }}
                className="w-24 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                title="Seleccionar año"
              >
                {(!periodosDisponibles || (periodosDisponibles.aniosIso || []).length === 0) && (
                  <option value="">Sin años</option>
                )}
                {(periodosDisponibles?.aniosIso || []).map((a) => (
                  <option key={a.anioIso} value={a.anioIso}>
                    {formatearEtiquetaAnio(a.anioIso)}
                  </option>
                ))}
              </select>

              <select
                value={anioIso && semana ? formatearSemanaIsoCodigo(anioIso, semana) : ''}
                disabled={semanasDelAnioSeleccionado.length === 0}
                onChange={(e) => {
                  const parsed = parsearSemanaIsoCodigo(e.target.value);
                  if (parsed) {
                    setAnioIso(parsed.anioIso);
                    setSemana(parsed.semana);
                    actualizarFiltrosUrl('semana', {
                      anioIso: parsed.anioIso,
                      semana: parsed.semana,
                    });
                  }
                }}
                className="w-48 h-8 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
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

          {/* Modalidad DÍA mediante CalendarioDiaPicker */}
          {periodo === 'dia' && (
            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in duration-150">
              <CalendarioDiaPicker
                value={dia}
                anio={anio}
                mes={mes}
                aniosDisponibles={periodosDisponibles?.anios || []}
                mesesDisponibles={periodosDisponibles?.meses || []}
                diasDisponibles={periodosDisponibles?.dias || []}
                hoyIso={periodosDisponibles?.rangoTotal.hoy || hoyIso}
                disabled={!periodosDisponibles || periodosDisponibles.anios.length === 0}
                className="w-36"
                onSelectDia={(fechaIso, anioSel, mesSel) => {
                  setDia(fechaIso);
                  setAnio(anioSel);
                  setMes(mesSel);
                  actualizarFiltrosUrl('dia', { dia: fechaIso });
                }}
                onCambiarMesAnio={(nuevoAnio, nuevoMes) => {
                  setAnio(nuevoAnio);
                  setMes(nuevoMes);
                }}
              />
            </div>
          )}
        </div>

        {/* Etiqueta descriptiva del período y recarga */}
        <div className="flex items-center justify-between lg:justify-end gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-xs">
            <Icon name="event" size="14px" className="text-slate-500" />
            <span>{periodoActivoDescripcion}</span>
            {cargandoPeriodos && <Spinner size="xs" className="ml-1" />}
          </div>

          <button
            type="button"
            onClick={() => void cargarMetricas()}
            disabled={cargandoMetricas}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Actualizar datos"
          >
            <Icon
              name="refresh"
              size="15px"
              className={cargandoMetricas ? 'animate-spin text-marca-primario' : ''}
            />
          </button>
        </div>
      </div>

      {/* 4. PRIMERO ARRIBA: CONTADOR DE DEFECTOS Y PARES POR DEPARTAMENTO */}
      {/* (Solo muestra departamentos donde haya registros) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
          <div className="flex items-center gap-2">
            <Icon name="domain" size="18px" className="text-slate-700" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Contador de Defectos y Pares por Departamento
            </h2>
          </div>

          {!cargandoMetricas && contadoresDepto.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                {contadoresDepto.length} depto{contadoresDepto.length === 1 ? '' : 's'} con registros
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-bold">
                Total:{' '}
                <strong className="text-amber-700">{totalIncidencias}</strong> def /{' '}
                <strong className="text-slate-900">{totalPares}</strong> pares
              </span>
            </div>
          )}
        </div>

        {cargandoMetricas ? (
          /* Skeletons de los contadores */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div key={sk} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : contadoresDepto.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400 italic">
            Sin defectos ni pares registrados en este período.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {contadoresDepto.map((depto) => (
              <div
                key={depto.departamentoId}
                className="bg-white border border-slate-200/90 hover:border-marca-primario/50 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between text-left"
                title={`Departamento: ${depto.departamentoNombre}`}
              >
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                  <span className="text-xs font-bold uppercase text-slate-800 truncate" title={depto.departamentoNombre}>
                    {depto.departamentoNombre}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-marca-primario shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Defectos
                    </span>
                    <span className="font-mono text-xl font-black text-amber-700">
                      {depto.incidencias}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Pares
                    </span>
                    <span className="font-mono text-xl font-black text-slate-800">
                      {depto.pares}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. TOP 10 DEFECTOS POR LÍNEA (BOTA CON DEPTO VISIBLE) */}
      <div className="bg-white border border-border/80 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
          <div className="flex items-center gap-2">
            <Icon name="leaderboard" size="18px" className="text-slate-700" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>Top 10 Defectos por Línea — BOTA</span>
            </h2>
          </div>

          {!cargandoMetricas && (
            <span className="text-2xs font-semibold text-slate-500">
              {itemsTopBota.length} {itemsTopBota.length === 1 ? 'defecto clasificado' : 'defectos clasificados'}
            </span>
          )}
        </div>

        {cargandoMetricas ? (
          /* Skeletons del Top 10 */
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : itemsTopBota.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Sin defectos registrados en la línea BOTA durante el período seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2 w-[40px] text-center font-mono">Num</th>
                  <th className="py-2 px-2 w-[65px] font-mono text-center">Clave</th>
                  <th className="py-2 px-3">Defecto</th>
                  <th className="py-2 px-3 w-[150px]">Depto Responsable</th>
                  <th className="py-2 px-3 w-[80px] text-right font-bold text-amber-800">
                    Defectos
                  </th>
                  <th className="py-2 px-3 w-[70px] text-right font-bold text-slate-700">
                    Pares
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {itemsTopBota.map((item, idx) => (
                  <tr key={`${item.clave}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-brand-primary">
                      {item.clave}
                    </td>
                    <td
                      className="py-2 px-3 text-slate-800 font-medium truncate max-w-[280px] sm:max-w-[400px]"
                      title={item.defecto}
                    >
                      {item.defecto}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase tracking-wide">
                        {item.departamentoNombre || 'General'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-amber-700">
                      {item.defectos}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {item.pares ?? item.defectos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. DEBAJO DEL TOP 10: DEFECTOS ENCONTRADOS EN OTROS DEPARTAMENTOS (ORIGEN VS DETECCIÓN) */}
      <div className="bg-white border border-border/80 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Encabezado limpio y ejecutivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 shrink-0">
              <Icon name="compare_arrows" size="18px" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Defectos Encontrados en Otros Departamentos
              </h2>
              <p className="text-2xs text-slate-500 mt-0.5">
                Defectos generados en una etapa previa e interceptados en la inspección de un departamento posterior.
              </p>
            </div>
          </div>

          {!cargandoMetricas && (
            <span className="text-2xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shrink-0 self-start sm:self-auto">
              {defectosCruzados.length} {defectosCruzados.length === 1 ? 'defecto cruzado' : 'defectos cruzados'}
            </span>
          )}
        </div>

        {/* Resumen visual de flujos de detección cruzada (Una sola línea por tarjeta, sin saltos feos) */}
        {!cargandoMetricas && rutasCruzadas.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Principales flujos de detección cruzada:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {rutasCruzadas.map((ruta) => (
                <div
                  key={`${ruta.origenId}_${ruta.detectorId}`}
                  className="rounded-lg border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-slate-300 p-2.5 flex items-center justify-between gap-2 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap min-w-0">
                    <span
                      className="font-bold text-amber-800 uppercase text-[11px] truncate max-w-[90px]"
                      title={ruta.origenNombre}
                    >
                      {ruta.origenNombre}
                    </span>
                    <span className="text-slate-400 text-xs font-bold shrink-0">→</span>
                    <span
                      className="font-bold text-blue-800 uppercase text-[11px] truncate max-w-[90px]"
                      title={ruta.detectorNombre}
                    >
                      {ruta.detectorNombre}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0 ml-1">
                    <span className="font-mono text-xs font-extrabold text-amber-700">
                      {ruta.defectos}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">def</span>
                    <span className="text-slate-300 mx-0.5">•</span>
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {ruta.pares}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">par</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabla de defectos cruzados detallada y ordenada */}
        {cargandoMetricas ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : defectosCruzados.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
            No se detectaron defectos de otros departamentos en este período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-2 w-[40px] text-center font-mono">Num</th>
                  <th className="py-2.5 px-2 w-[65px] font-mono text-center">Clave</th>
                  <th className="py-2.5 px-3">Defecto</th>
                  <th className="py-2.5 px-3 w-[160px]">Origen (Responsable)</th>
                  <th className="py-2.5 px-3 w-[160px]">Detectado En</th>
                  <th className="py-2.5 px-3 w-[80px] text-right font-bold text-amber-800">
                    Defectos
                  </th>
                  <th className="py-2.5 px-3 w-[70px] text-right font-bold text-slate-700">
                    Pares
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {defectosCruzados.map((item, idx) => (
                  <tr
                    key={`${item.clave}_${item.origenId}_${item.detectorId}_${idx}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-brand-primary">
                      {item.clave}
                    </td>
                    <td
                      className="py-2 px-3 text-slate-800 font-medium truncate max-w-[240px] sm:max-w-[340px]"
                      title={item.defecto}
                    >
                      {item.defecto}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-bold text-[11px] uppercase tracking-wide">
                        {item.origenNombre}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 font-bold text-[11px] uppercase tracking-wide">
                        <span className="text-slate-400 font-normal">en</span>
                        <span>{item.detectorNombre}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-extrabold text-amber-700">
                      {item.defectos}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {item.pares}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de vinculación de terminal física */}
      <TerminalVinculacionModal
        isOpen={modalVinculacionAbierto}
        onClose={() => setModalVinculacionAbierto(false)}
        onSuccess={recargar}
      />
    </div>
  );
}
