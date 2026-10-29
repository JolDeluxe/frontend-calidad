import { useState, useEffect, useCallback, useRef } from 'react';
import { proyeccionApi } from '../api/proyeccion-api';
import type {
  ResumenGeneralProyeccionResponse,
  ReporteSemanalProyeccionResponse,
} from '../types/proyeccion.types';
import { ProyeccionResumenGeneral } from '../components/proyeccion-resumen-general';
import { ProyeccionDeptoDetalle } from '../components/proyeccion-depto-detalle';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

type ModoVista = 'RESUMEN' | 'DEPTO';

export function ProyeccionPage() {
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneralProyeccionResponse | null>(null);
  const [reporteSemanal, setReporteSemanal] = useState<ReporteSemanalProyeccionResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del carrusel
  const [modoVista, setModoVista] = useState<ModoVista>('RESUMEN');
  const [deptoIndex, setDeptoIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      const [resumen, semanal] = await Promise.all([
        proyeccionApi.getResumenGeneral(),
        proyeccionApi.getReporteSemanal(),
      ]);
      setResumenGeneral(resumen);
      setReporteSemanal(semanal);
      setError(null);
    } catch (err: any) {
      console.error('Error cargando datos de proyección:', err);
      setError(err?.message || 'Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
    const intervalPoll = setInterval(() => {
      void cargarDatos();
    }, 3 * 60 * 1000);
    return () => clearInterval(intervalPoll);
  }, [cargarDatos]);

  // Transición a la siguiente pantalla
  const avanzar = useCallback(() => {
    if (!reporteSemanal || reporteSemanal.departamentos.length === 0) return;

    if (modoVista === 'RESUMEN') {
      setModoVista('DEPTO');
      setDeptoIndex(0);
    } else {
      if (deptoIndex + 1 < reporteSemanal.departamentos.length) {
        setDeptoIndex((prev) => prev + 1);
      } else {
        setModoVista('RESUMEN');
        setDeptoIndex(0);
      }
    }
  }, [modoVista, deptoIndex, reporteSemanal]);

  // Transición manual a la pantalla anterior
  const retroceder = useCallback(() => {
    if (!reporteSemanal || reporteSemanal.departamentos.length === 0) return;

    if (modoVista === 'RESUMEN') {
      setModoVista('DEPTO');
      setDeptoIndex(reporteSemanal.departamentos.length - 1);
    } else {
      if (deptoIndex > 0) {
        setDeptoIndex((prev) => prev - 1);
      } else {
        setModoVista('RESUMEN');
      }
    }
  }, [modoVista, deptoIndex, reporteSemanal]);

  // Temporizador dinámico: 15s para Resumen, 8s para Departamento
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pausado || cargando || error) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const duracion = modoVista === 'RESUMEN' ? 15000 : 8000;

    timerRef.current = setTimeout(() => {
      avanzar();
    }, duracion);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [modoVista, deptoIndex, pausado, cargando, error, avanzar]);

  // Control por teclado (Flechas, Espacio y F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPausado((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        avanzar();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        retroceder();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [avanzar, retroceder]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (cargando) {
    return (
      <div className="h-screen w-screen bg-cuadra-arena flex flex-col items-center justify-center text-marca-primario gap-4">
        <Spinner size="48px" className="text-marca-primario" />
        <p className="font-codigo text-sm uppercase tracking-widest text-slate-600 font-bold">
          Cargando métricas de proyección...
        </p>
      </div>
    );
  }

  if (error || !resumenGeneral || !reporteSemanal) {
    return (
      <div className="h-screen w-screen bg-cuadra-arena flex flex-col items-center justify-center text-slate-800 gap-4 p-6 text-center">
        <Icon name="error" size="48px" className="text-rose-600" />
        <h2 className="fuente-titulos text-2xl font-bold text-marca-primario">Error al iniciar el modo proyección</h2>
        <p className="text-sm font-codigo text-slate-600 max-w-md">{error}</p>
        <button
          onClick={() => {
            setCargando(true);
            void cargarDatos();
          }}
          className="mt-4 px-6 py-2.5 bg-marca-primario hover:bg-marca-primario-hover text-white font-bold rounded-sm uppercase tracking-wider text-xs cursor-pointer shadow-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const deptosLista = reporteSemanal.departamentos;
  const deptoActivo = deptosLista[deptoIndex];

  return (
    <div className="relative h-screen w-screen bg-cuadra-arena text-slate-800 overflow-hidden flex flex-col">
      {/* VISTA PRINCIPAL RENDERIZADA */}
      <main className="flex-1 w-full h-full overflow-hidden">
        {modoVista === 'RESUMEN' ? (
          <ProyeccionResumenGeneral data={resumenGeneral} />
        ) : (
          deptoActivo && (
            <ProyeccionDeptoDetalle
              depto={deptoActivo}
              indiceActual={deptoIndex}
              totalDepartamentos={deptosLista.length}
            />
          )
        )}
      </main>

      {/* CONTROLES DISCRETOS FLOTANTES (ESQUINA INFERIOR DERECHA) */}
      <aside aria-label="Controles de proyección" className="absolute bottom-4 right-6 flex items-center gap-3 bg-white/95 border border-slate-300 px-4 py-2 rounded-md font-codigo shadow-md z-50 opacity-40 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setPausado((p) => !p)}
          className="flex items-center gap-1.5 text-slate-700 hover:text-marca-primario cursor-pointer text-xs"
          title="Espacio para Pausar / Reanudar"
        >
          <Icon name={pausado ? 'play_arrow' : 'pause'} size="16px" className={pausado ? 'text-amber-600' : 'text-slate-500'} />
          <span className="font-bold">{pausado ? 'Pausado' : 'Rotando'}</span>
        </button>

        <span className="text-slate-300">|</span>

        <button
          type="button"
          onClick={retroceder}
          className="hover:text-marca-primario text-slate-500 cursor-pointer p-0.5"
          title="Anterior (Flecha Izq)"
        >
          <Icon name="chevron_left" size="18px" />
        </button>

        <span className="text-xs text-slate-700 font-bold">
          {modoVista === 'RESUMEN' ? 'General' : `${deptoIndex + 1}/${deptosLista.length}`}
        </span>

        <button
          type="button"
          onClick={avanzar}
          className="hover:text-marca-primario text-slate-500 cursor-pointer p-0.5"
          title="Siguiente (Flecha Der)"
        >
          <Icon name="chevron_right" size="18px" />
        </button>

        <span className="text-slate-300">|</span>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="hover:text-marca-primario text-slate-500 cursor-pointer p-0.5"
          title="Pantalla Completa (F)"
        >
          <Icon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size="18px" />
        </button>
      </aside>
    </div>
  );
}
