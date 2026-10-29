import React from 'react';
import type { ResumenGeneralProyeccionResponse } from '../types/proyeccion.types';

interface ProyeccionResumenGeneralProps {
  data: ResumenGeneralProyeccionResponse;
}

export const ProyeccionResumenGeneral: React.FC<ProyeccionResumenGeneralProps> = ({ data }) => {
  const { semana, anio, totales, departamentos } = data;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-6 lg:p-8 select-none justify-between gap-5 font-sans">
      {/* 1. HEADER INSTITUCIONAL CUADRA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-marca-primario/10 rounded-sm text-marca-primario">
            <span className="material-symbols-rounded text-3xl">tv</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-codigo text-xs bg-marca-acento text-white px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                Modo Proyección
              </span>
              <span className="text-xs font-bold text-slate-500 font-codigo uppercase tracking-wider">
                Semana {semana} • {anio}
              </span>
            </div>
            <h1 className="fuente-titulos text-3xl sm:text-4xl text-marca-primario tracking-wide uppercase mt-0.5">
              Resumen General de Calidad
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 justify-self-end">
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>
      </div>

      {/* 2. TARJETAS DE KPIS GLOBALES CON IDENTIDAD CUADRA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Pares con Defecto */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Total Pares con Defecto
            </span>
            <div className="p-1.5 bg-rose-50 rounded-sm text-rose-600">
              <span className="material-symbols-rounded text-xl">deployed_code_alert</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-codigo text-4xl sm:text-5xl font-black text-rose-600">
              {totales.paresDefecto.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Incidencias detectadas en la planta
            </p>
          </div>
        </div>

        {/* Producción Lograda */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Producción Lograda Acumulada
            </span>
            <div className="p-1.5 bg-sky-50 rounded-sm text-sky-700">
              <span className="material-symbols-rounded text-xl">precision_manufacturing</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-codigo text-4xl sm:text-5xl font-black text-marca-primario">
              {totales.produccionLograda.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Pares inspeccionados en la semana
            </p>
          </div>
        </div>

        {/* Índice de Defectos Global */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Índice Global de Defectos
            </span>
            <div className="p-1.5 bg-amber-50 rounded-sm text-amber-700">
              <span className="material-symbols-rounded text-xl">analytics</span>
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`font-codigo text-4xl sm:text-5xl font-black ${
                totales.porcentajeDefecto > 5 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {totales.porcentajeDefecto}%
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Tasa porcentual de incidencia
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABLA CONSOLIDADA IDÉNTICA A INSPECCIONES / REGISTRO */}
      <div className="flex-1 bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-xs select-none">
                <th className="py-3 px-5">Departamento</th>
                <th className="py-3 px-5 text-right">Pares con Defecto</th>
                <th className="py-3 px-5 text-right">Producción Lograda</th>
                <th className="py-3 px-5 text-right">Índice (%)</th>
                <th className="py-3 px-6 w-1/3">Impacto en Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-codigo text-sm sm:text-base">
              {departamentos.map((dept, idx) => {
                const maxDef = Math.max(...departamentos.map((d) => d.paresDefecto), 1);
                const barWidth = Math.min(100, (dept.paresDefecto / maxDef) * 100);

                return (
                  <tr
                    key={dept.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-cuadra-arena/30'
                    } hover:bg-cuadra-arena/60`}
                  >
                    <td className="py-3 px-5 font-sans font-bold text-marca-primario text-base sm:text-lg">
                      {dept.nombre}
                    </td>
                    <td className="py-3 px-5 text-right font-black text-rose-600 text-lg">
                      {dept.paresDefecto.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right text-slate-700">
                      {dept.produccionLograda.toLocaleString()}
                    </td>
                    <td className="py-3 px-5 text-right font-black">
                      <span
                        className={
                          dept.porcentajeDefecto > 5
                            ? 'text-amber-600'
                            : dept.porcentajeDefecto > 0
                            ? 'text-emerald-600'
                            : 'text-slate-400'
                        }
                      >
                        {dept.porcentajeDefecto}%
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-marca-primario transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
