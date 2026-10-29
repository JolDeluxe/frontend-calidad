import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthSession } from '@/providers/auth-provider';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTerminalStatus } from '@/features/terminales/hooks/use-terminal-status';
import { TerminalVinculacionModal } from '@/features/terminales/components/terminal-vinculacion-modal';
import { inspeccionesApi } from '@/features/inspecciones/api/inspecciones-api';
import { departamentosApi } from '@/features/departamentos/api/departamentos-api';
import type { TipoOperacion } from '@/features/departamentos/types/departamentos.types';

interface TopDefectoSimple {
  clave: number;
  defecto: string;
  defectos: number;
}

export function HomePage() {
  const { user } = useAuthSession();
  const { estado: terminalEstado, terminal, recargar } = useTerminalStatus();
  const [modalVinculacionAbierto, setModalVinculacionAbierto] = useState(false);

  // Estados dinámicos derivados 100% de la base de datos
  const [tiposOperacion, setTiposOperacion] = useState<TipoOperacion[]>([]);
  const [contadoresDeptoHoy, setContadoresDeptoHoy] = useState<Record<number, { pares: number; incidencias: number }>>({});
  const [topSemanal, setTopSemanal] = useState<Record<string, TopDefectoSimple[]>>({});
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const rolCodigo = user?.rol?.codigo || '';
  const esAdmin = ['SUPER_ADMIN', 'ADMIN', 'COORD'].includes(rolCodigo);

  const cargarDatosDashboard = useCallback(async () => {
    setCargandoDatos(true);
    try {
      const [tiposResult, metricasResult] = await Promise.allSettled([
        departamentosApi.getTiposOperacion(false),
        inspeccionesApi.getDashboardMetricas(),
      ]);

      if (tiposResult.status === 'fulfilled') {
        setTiposOperacion(tiposResult.value || []);
      }

      if (metricasResult.status === 'fulfilled') {
        setContadoresDeptoHoy(metricasResult.value.contadoresDeptoHoy || {});
        setTopSemanal(metricasResult.value.topSemanal || {});
      }
    } catch (err) {
      console.error('Error al cargar datos del dashboard de inicio:', err);
    } finally {
      setCargandoDatos(false);
    }
  }, []);

  useEffect(() => {
    cargarDatosDashboard();
  }, [cargarDatosDashboard]);

  // Actualización automática al recibir eventos de reconexión del backend
  useEffect(() => {
    const handleReachable = () => {
      cargarDatosDashboard();
    };
    window.addEventListener('backend:reachable', handleReachable);
    return () => window.removeEventListener('backend:reachable', handleReachable);
  }, [cargarDatosDashboard]);

  // Líneas dinámicas presentes en la estructura registrada o en los datos del top semanal
  const lineasParaTop = useMemo(() => {
    const nombres: string[] = [];

    // 1. Líneas registradas en tiposOperacion activos
    tiposOperacion.forEach((t) => {
      t.lineas?.forEach((l) => {
        const n = l.nombre?.trim();
        if (n && !nombres.includes(n)) {
          nombres.push(n);
        }
      });
    });

    // 2. Líneas con registros en topSemanal que pudieran no estar en tiposOperacion
    Object.keys(topSemanal).forEach((linKey) => {
      const k = linKey.trim();
      if (k && !nombres.includes(k)) {
        nombres.push(k);
      }
    });

    return nombres;
  }, [tiposOperacion, topSemanal]);

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
              <span className="text-slate-500">
                Sin estación física asignada
              </span>
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

      {/* 3. TOP 10 DEFECTOS POR LÍNEA (SEMANAL) - DINÁMICO */}
      <div className="bg-white border border-border/80 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <Icon name="leaderboard" size="18px" className="text-slate-700" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Top 10 Defectos por Línea (Semanal)
          </h2>
        </div>

        {cargandoDatos ? (
          /* Skeletons del Top 10 por línea */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((sk) => (
              <div key={sk} className="rounded-lg border border-border/70 bg-slate-50/40 p-3 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="flex items-center justify-between gap-3">
                      <Skeleton className="h-3.5 w-6" />
                      <Skeleton className="h-3.5 w-12" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-3.5 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : lineasParaTop.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            No hay líneas registradas ni defectos en la semana.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lineasParaTop.map((lineaNombre) => {
              const itemsTop = topSemanal[lineaNombre] || [];

              return (
                <div
                  key={lineaNombre}
                  className="rounded-lg border border-border/80 bg-slate-50/40 p-3 flex flex-col justify-between space-y-2"
                >
                  {/* Encabezado de la Línea */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-marca-primario" />
                      <span>{lineaNombre}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {itemsTop.length} registros
                    </span>
                  </div>

                  {/* Tabla directa Num | Clave | Defecto | DEFECTOS */}
                  {itemsTop.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Sin defectos registrados esta semana
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-1 px-1.5 w-[36px] text-center font-mono">Num</th>
                            <th className="py-1 px-2 w-[55px] font-mono text-center">Clave</th>
                            <th className="py-1 px-2">Defecto</th>
                            <th className="py-1 px-2 w-[70px] text-right font-bold text-slate-700">
                              DEFECTOS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {itemsTop.map((item, idx) => (
                            <tr key={`${item.clave}_${idx}`} className="hover:bg-white/80 transition-colors">
                              <td className="py-1.5 px-1.5 text-center font-mono font-bold text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono font-bold text-brand-primary">
                                {item.clave}
                              </td>
                              <td className="py-1.5 px-2 text-slate-800 font-medium truncate max-w-[220px]" title={item.defecto}>
                                {item.defecto}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-extrabold text-slate-900">
                                {item.defectos}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CONTADORES DE DEFECTOS POR DEPARTAMENTO (HOY) - DINÁMICO 100% DE LA BD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="flex items-center gap-2">
            <Icon name="domain" size="18px" className="text-slate-700" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              Contadores de Defectos por Departamento (Hoy)
            </h2>
          </div>
        </div>

        {cargandoDatos ? (
          /* Skeletons de la estructura de departamentos */
          <div className="bg-white border border-border/80 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((skL) => (
                <div key={skL} className="rounded-lg bg-slate-50/60 border border-slate-200/80 p-3 space-y-2.5">
                  <Skeleton className="h-4 w-28" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
                      <Skeleton key={card} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tiposOperacion.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-border/80">
            No se encontró ninguna operación registrada en la base de datos.
          </div>
        ) : (
          tiposOperacion.map((tipo) => (
            <div
              key={tipo.id}
              className="bg-white border border-border/80 rounded-xl p-4 shadow-2xs space-y-3.5"
            >
              {/* Nivel 1: Tipo de Operación registrado */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  {/* <Icon name="precision_manufacturing" size="16px" className="text-brand-primary" /> */}
                  <span>Operación: {tipo.nombre}</span>
                </span>
              </div>

              {/* Nivel 2: Líneas dentro de la Operación */}
              <div className="space-y-3">
                {tipo.lineas && tipo.lineas.length > 0 ? (
                  tipo.lineas.map((linea) => {
                    const deptos = linea.departamentos || [];

                    return (
                      <div
                        key={linea.id}
                        className="rounded-lg bg-slate-50/60 border border-slate-200/80 p-3 space-y-2.5"
                      >
                        {/* Cabecera de Línea */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-marca-primario" />
                            <span>Línea: {linea.nombre}</span>
                          </span>
                        </div>

                        {/* Nivel 3: Contadores de departamentos de esta línea */}
                        {deptos.length === 0 ? (
                          <p className="text-2xs text-slate-400 italic py-1">
                            Sin departamentos asignados a esta línea.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                            {deptos.map((asoc) => {
                              const depto = asoc.departamento;
                              const conteo = contadoresDeptoHoy[depto.id] || { pares: 0, incidencias: 0 };
                              const tieneDefectos = conteo.incidencias > 0;

                              return (
                                <div
                                  key={depto.id}
                                  title={`Defectos pertenecientes a ${depto.nombre}`}
                                  className={`flex flex-col justify-between p-2.5 rounded-lg border text-left ${
                                    tieneDefectos
                                      ? 'bg-white border-amber-300 shadow-2xs'
                                      : 'bg-white/80 border-slate-200'
                                  }`}
                                >
                                  <span
                                    className="text-[11px] font-bold text-slate-700 uppercase truncate block"
                                    title={depto.nombre}
                                  >
                                    {depto.nombre}
                                  </span>

                                  <div className="mt-2 flex items-baseline justify-between">
                                    <span
                                      className={`font-mono text-base font-extrabold ${
                                        tieneDefectos ? 'text-amber-700' : 'text-slate-400'
                                      }`}
                                    >
                                      {conteo.incidencias}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      def
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-2xs text-slate-400 italic">
                    Sin líneas configuradas en esta operación.
                  </p>
                )}
              </div>
            </div>
          ))
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
