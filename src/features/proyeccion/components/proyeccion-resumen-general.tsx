import React from 'react';
import type { ResumenGeneralProyeccionResponse } from '../types/proyeccion.types';

interface ProyeccionResumenGeneralProps {
  data: ResumenGeneralProyeccionResponse;
}

export const ProyeccionResumenGeneral: React.FC<ProyeccionResumenGeneralProps> = ({ data }) => {
  const { semana, anio, totales, departamentos } = data;

  return (
    <div className="flex flex-col h-full w-full p-6 sm:p-10 select-none animate-fade-in justify-between">
      {/* 1. HEADER SUPERIOR */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono text-sm uppercase tracking-widest font-black rounded-md">
              Kiosco de Planta
            </span>
            <span className="text-slate-400 font-mono text-sm tracking-wider">
              Semana {semana} • {anio}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mt-1">
            RESUMEN GENERAL DE CALIDAD
          </h1>
        </div>
        <div className="text-right flex flex-col items-end">
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="h-10 sm:h-12 w-auto object-contain brightness-0 invert opacity-90 mb-1"
          />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Actualización en vivo
          </span>
        </div>
      </div>

      {/* 2. TARJETAS DE KPIS GLOBALES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col shadow-lg">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Total Pares con Defecto
          </span>
          <span className="text-4xl sm:text-6xl font-black font-mono text-rose-500 mt-2">
            {totales.paresDefecto.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Detectados en toda la planta
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col shadow-lg">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Producción Lograda Acumulada
          </span>
          <span className="text-4xl sm:text-6xl font-black font-mono text-blue-400 mt-2">
            {totales.produccionLograda.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Pares procesados en la semana
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col shadow-lg">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Índice de Defectos Planta
          </span>
          <span
            className={`text-4xl sm:text-6xl font-black font-mono mt-2 ${
              totales.porcentajeDefecto > 5 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {totales.porcentajeDefecto}%
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Tasa global de defectos
          </span>
        </div>
      </div>

      {/* 3. TABLA CONSOLIDADA DE DEPARTAMENTOS */}
      <div className="flex-1 bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full h-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="py-4 px-6">Departamento</th>
                <th className="py-4 px-6 text-right">Pares con Defecto</th>
                <th className="py-4 px-6 text-right">Producción Lograda</th>
                <th className="py-4 px-6 text-right">Índice (%)</th>
                <th className="py-4 px-6 w-1/3">Impacto Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-sm sm:text-base">
              {departamentos.map((dept) => {
                const maxDef = Math.max(...departamentos.map((d) => d.paresDefecto), 1);
                const barWidth = Math.min(100, (dept.paresDefecto / maxDef) * 100);

                return (
                  <tr key={dept.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-6 font-sans font-bold text-white text-base sm:text-lg">
                      {dept.nombre}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-rose-400 text-lg">
                      {dept.paresDefecto.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-300">
                      {dept.produccionLograda.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 text-right font-black">
                      <span
                        className={
                          dept.porcentajeDefecto > 5
                            ? 'text-amber-400'
                            : dept.porcentajeDefecto > 0
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {dept.porcentajeDefecto}%
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="w-full bg-slate-800/80 rounded-full h-3.5 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-500"
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
