import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import type { ReporteDeptoItem } from '../types/proyeccion.types';

interface ProyeccionDeptoDetalleProps {
  depto: ReporteDeptoItem;
  indiceActual: number;
  totalDepartamentos: number;
}

// Paleta institucional Cuadra para áreas auditoras
const PALETA_AREAS = [
  '#482b2c', // marca-primario
  '#846768', // marca-secundario
  '#66494a', // marca-acento
  '#0284c7', // sky-600
  '#d97706', // amber-600
  '#059669', // emerald-600
  '#7c3aed', // purple-600
];

export const ProyeccionDeptoDetalle: React.FC<ProyeccionDeptoDetalleProps> = ({
  depto,
  indiceActual,
  totalDepartamentos,
}) => {
  const { kpis, desgloseCaptura, eficienciaInspector, topDefectos, topDefectosApilados } = depto;

  const areasAuditoras = Array.from(
    new Set(topDefectosApilados.flatMap((t) => Object.keys(t.desglosePorArea)))
  );

  const dataApilada = topDefectosApilados.map((item) => {
    return {
      nombreClave: `${item.clave} - ${item.defecto.slice(0, 22)}`,
      ...item.desglosePorArea,
      totalPares: item.totalPares,
    };
  });

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-6 lg:p-8 select-none justify-between gap-5 font-sans">
      {/* 1. HEADER INSTITUCIONAL DEL DEPARTAMENTO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-md border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-marca-primario/10 rounded-sm text-marca-primario">
            <span className="material-symbols-rounded text-3xl">domain</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-codigo text-xs bg-marca-primario text-white px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                Depto {indiceActual + 1} de {totalDepartamentos}
              </span>
              <span className="text-xs font-bold text-slate-500 font-codigo uppercase tracking-wider">
                Semana {kpis.semana} • {kpis.anio}
              </span>
            </div>
            <h1 className="fuente-titulos text-3xl sm:text-4xl text-marca-primario tracking-wide uppercase mt-0.5">
              {depto.nombre}
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

      {/* 2. CONTENIDO EN 2 COLUMNAS (45% IZQ | 55% DER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* COLUMNA IZQUIERDA: KPIS, DESGLOSE Y EFICIENCIA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 min-h-0">
          {/* 4 KPIS EN ESTILO TARJETA BLANCA CUADRA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 p-4 rounded-md shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Defectos Totales
              </span>
              <span className="text-3xl sm:text-4xl font-black font-codigo text-rose-600 mt-1 block">
                {kpis.defectosTotales.toLocaleString()}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-md shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Prod. Lograda
              </span>
              <span className="text-3xl sm:text-4xl font-black font-codigo text-marca-primario mt-1 block">
                {kpis.produccionLograda.toLocaleString()}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-md shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Índice de Defectos
              </span>
              <span
                className={`text-3xl sm:text-4xl font-black font-codigo mt-1 block ${
                  kpis.indiceDefectosPct > 5 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {kpis.indiceDefectosPct}%
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-md shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Semana Operativa
              </span>
              <span className="text-3xl sm:text-4xl font-black font-codigo text-marca-secundario mt-1 block">
                SEM {kpis.semana}
              </span>
            </div>
          </div>

          {/* TABLA DE DESGLOSE DE AUDITORÍA CRUZADA */}
          <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col flex-1 min-h-0 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-marca-primario mb-2 border-b border-cuadra-arena pb-1">
              ¿En qué departamentos se detectaron estos defectos?
            </h3>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {desgloseCaptura.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  Sin defectos registrados en la semana
                </div>
              ) : (
                <table className="w-full text-left font-codigo text-xs">
                  <thead className="text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 font-bold font-sans">Área Auditora</th>
                      <th className="py-2 px-2.5 text-right">Cantidad</th>
                      <th className="py-2 px-2.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {desgloseCaptura.map((d, i) => (
                      <tr key={d.departamentoAuditorId} className="hover:bg-cuadra-arena/40">
                        <td className="py-2 px-2.5 font-sans font-semibold text-slate-800 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: PALETA_AREAS[i % PALETA_AREAS.length] }}
                          />
                          {d.departamentoAuditor}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-rose-600">
                          {d.cantidad.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-700">
                          {d.porcentaje}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* EFICIENCIA DEL INSPECTOR */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-marca-primario mb-2 border-b border-cuadra-arena pb-1">
              Eficiencia del Inspector ({depto.nombre})
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-cuadra-arena/30 p-2.5 rounded-sm border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  En Otras Áreas
                </span>
                <span className="text-xl font-black font-codigo text-rose-600 mt-1 block">
                  {eficienciaInspector.defectosEnOtrasAreas}
                </span>
              </div>

              <div className="bg-cuadra-arena/30 p-2.5 rounded-sm border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Devoluciones
                </span>
                <span className="text-xl font-black font-codigo text-amber-600 mt-1 block">
                  {eficienciaInspector.devoluciones}
                </span>
              </div>

              <div className="bg-cuadra-arena/30 p-2.5 rounded-sm border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  % Eficiencia
                </span>
                <span className="text-xl font-black font-codigo text-emerald-600 mt-1 block">
                  {eficienciaInspector.porcentajeEficiencia}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: 2 GRÁFICAS DE BARRAS HORIZONTALES */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-h-0">
          {/* GRÁFICA 1: TOP DEFECTOS DEL DEPARTAMENTO */}
          <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col flex-1 min-h-0 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-marca-primario mb-2 border-b border-cuadra-arena pb-1">
              Top Defectos de {depto.nombre} (Pares con Fallo)
            </h3>
            <div className="flex-1 w-full min-h-[180px]">
              {topDefectos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Sin defectos registrados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topDefectos.map((d) => ({
                      nombreClave: `${d.clave} - ${d.defecto.slice(0, 26)}`,
                      pares: d.totalPares,
                    }))}
                    margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="nombreClave"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#482b2c', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                      width={170}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 4, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#482b2c', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="pares" fill="#846768" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="pares" position="right" fill="#482b2c" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GRÁFICA 2: TOP DEFECTOS APILADOS POR ÁREA AUDITORA */}
          <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col flex-1 min-h-0 shadow-xs">
            <div className="flex items-center justify-between mb-2 border-b border-cuadra-arena pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-marca-primario">
                Top Defectos Apilados por Departamento que los Capturó
              </h3>
              <div className="flex items-center gap-3">
                {areasAuditoras.map((area, idx) => (
                  <div key={area} className="flex items-center gap-1 text-[10px] text-slate-600 font-semibold">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: PALETA_AREAS[idx % PALETA_AREAS.length] }}
                    />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full min-h-[180px]">
              {dataApilada.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Sin defectos registrados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={dataApilada}
                    margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="nombreClave"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#482b2c', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                      width={170}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 4, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#482b2c', fontWeight: 'bold' }}
                    />
                    {areasAuditoras.map((area, idx) => (
                      <Bar
                        key={area}
                        dataKey={area}
                        stackId="a"
                        fill={PALETA_AREAS[idx % PALETA_AREAS.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
