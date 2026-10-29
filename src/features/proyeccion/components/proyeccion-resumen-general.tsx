import React from 'react';
import type { ResumenGeneralProyeccionResponse } from '../types/proyeccion.types';

interface ProyeccionResumenGeneralProps {
  data: ResumenGeneralProyeccionResponse;
}

export const ProyeccionResumenGeneral: React.FC<ProyeccionResumenGeneralProps> = ({ data }) => {
  const { semana, anio, totales, departamentos } = data;

  return (
    <div className="flex flex-col h-full w-full p-3 sm:p-5 lg:p-6 select-none justify-between gap-3 sm:gap-4 font-sans overflow-hidden">
      {/* 1. HEADER INSTITUCIONAL CUADRA */}
      <div className="flex flex-row items-center justify-between gap-3 bg-white px-5 py-3 rounded-md border border-slate-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-marca-primario/10 rounded-sm text-marca-primario flex items-center justify-center">
            <span className="material-symbols-rounded text-2xl sm:text-3xl">tv</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-codigo text-[10px] sm:text-xs bg-marca-acento text-white px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                Modo Proyección
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-500 font-codigo uppercase tracking-wider">
                Semana {semana} • {anio}
              </span>
            </div>
            <h1 className="fuente-titulos text-2xl sm:text-3xl text-marca-primario tracking-wide uppercase mt-0.5">
              Resumen General de Calidad en Planta
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="h-8 sm:h-10 w-auto object-contain"
          />
        </div>
      </div>

      {/* 2. TARJETAS DE KPIS GLOBALES CON IDENTIDAD CUADRA */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
        {/* Pares con Defecto */}
        <div className="bg-white border border-slate-200 rounded-md p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-slate-500">
              Total Pares con Defecto
            </span>
            <div className="p-1 sm:p-1.5 bg-rose-50 rounded-sm text-rose-600">
              <span className="material-symbols-rounded text-lg sm:text-xl">deployed_code_alert</span>
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <span className="font-codigo text-3xl sm:text-4xl lg:text-5xl font-black text-rose-600 block">
              {totales.paresDefecto.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Incidencias detectadas en la planta
            </p>
          </div>
        </div>

        {/* Producción Lograda */}
        <div className="bg-white border border-slate-200 rounded-md p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-slate-500">
              Producción Lograda Acumulada
            </span>
            <div className="p-1 sm:p-1.5 bg-sky-50 rounded-sm text-sky-700">
              <span className="material-symbols-rounded text-lg sm:text-xl">precision_manufacturing</span>
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <span className="font-codigo text-3xl sm:text-4xl lg:text-5xl font-black text-sky-700 block">
              {totales.produccionLograda.toLocaleString()}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pares inspeccionados en la semana
            </p>
          </div>
        </div>

        {/* Índice de Defectos Global */}
        <div className="bg-white border border-slate-200 rounded-md p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-slate-500">
              Índice Global de Defectos
            </span>
            <div className="p-1 sm:p-1.5 bg-amber-50 rounded-sm text-amber-700">
              <span className="material-symbols-rounded text-lg sm:text-xl">analytics</span>
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <span
              className={`font-codigo text-3xl sm:text-4xl lg:text-5xl font-black block ${
                totales.porcentajeDefecto > 5 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {totales.porcentajeDefecto}%
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tasa porcentual de incidencia
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABLA CONSOLIDADA - AJUSTADA PARA PANTALLA COMPLETA SIN SCROLL */}
      <div className="flex-1 bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="w-full h-full flex flex-col justify-between overflow-hidden">
          <table className="w-full text-left border-collapse h-full">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px] sm:text-xs select-none">
                <th className="py-2.5 px-4 lg:px-6">Departamento</th>
                <th className="py-2.5 px-4 lg:px-6 text-right">Pares con Defecto</th>
                <th className="py-2.5 px-4 lg:px-6 text-right">Producción Lograda</th>
                <th className="py-2.5 px-4 lg:px-6 text-right">Índice (%)</th>
                <th className="py-2.5 px-4 lg:px-6 w-1/3">Impacto en Calidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-codigo text-xs sm:text-sm">
              {departamentos.map((dept, idx) => {
                const maxDef = Math.max(...departamentos.map((d) => d.paresDefecto), 1);
                const barWidth = Math.min(100, (dept.paresDefecto / maxDef) * 100);

                // Colores dinámicos para las barras según severidad
                const colorBarra =
                  dept.porcentajeDefecto > 6
                    ? 'bg-rose-500'
                    : dept.porcentajeDefecto > 3
                    ? 'bg-amber-500'
                    : dept.porcentajeDefecto > 0
                    ? 'bg-sky-500'
                    : 'bg-emerald-500';

                return (
                  <tr
                    key={dept.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } hover:bg-cuadra-arena/50`}
                  >
                    <td className="py-2 px-4 lg:px-6 font-sans font-bold text-slate-800 text-sm sm:text-base">
                      {dept.nombre}
                    </td>
                    <td className="py-2 px-4 lg:px-6 text-right font-black text-rose-600 text-base sm:text-lg">
                      {dept.paresDefecto.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 lg:px-6 text-right text-slate-700 font-semibold">
                      {dept.produccionLograda.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 lg:px-6 text-right font-black">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-xs sm:text-sm ${
                          dept.porcentajeDefecto > 5
                            ? 'bg-amber-100 text-amber-800'
                            : dept.porcentajeDefecto > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {dept.porcentajeDefecto}%
                      </span>
                    </td>
                    <td className="py-2 px-4 lg:px-6">
                      <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full ${colorBarra} transition-all duration-500`}
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
