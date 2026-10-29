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

const PALETA_AREAS = [
  '#f43f5e', // rose
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#34d399', // emerald
  '#a855f7', // purple
  '#fb923c', // orange
  '#818cf8', // indigo
];

export const ProyeccionDeptoDetalle: React.FC<ProyeccionDeptoDetalleProps> = ({
  depto,
  indiceActual,
  totalDepartamentos,
}) => {
  const { kpis, desgloseCaptura, eficienciaInspector, topDefectos, topDefectosApilados } = depto;

  // Extraer todas las áreas únicas que auditaron defectos para las barras apiladas
  const areasAuditoras = Array.from(
    new Set(topDefectosApilados.flatMap((t) => Object.keys(t.desglosePorArea)))
  );

  // Formatear datos para la gráfica apilada
  const dataApilada = topDefectosApilados.map((item) => {
    return {
      nombreClave: `${item.clave} - ${item.defecto.slice(0, 20)}`,
      ...item.desglosePorArea,
      totalPares: item.totalPares,
    };
  });

  return (
    <div className="flex flex-col h-full w-full p-6 sm:p-10 select-none animate-fade-in justify-between">
      {/* 1. HEADER DEL DEPARTAMENTO */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono text-sm uppercase tracking-widest font-black rounded-md">
            Departamento {indiceActual + 1} de {totalDepartamentos}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            {depto.nombre}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-mono text-slate-400 tracking-wider">
            Semana {kpis.semana} • {kpis.anio}
          </span>
          <img
            src="/img/01_Cuadra.webp"
            alt="Cuadra"
            className="h-10 w-auto object-contain brightness-0 invert opacity-80"
          />
        </div>
      </div>

      {/* 2. CONTENIDO EN 2 COLUMNAS (45% IZQ | 55% DER) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* COLUMNA IZQUIERDA: KPIS, DESGLOSE Y EFICIENCIA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5 min-h-0">
          {/* 4 KPIS EN GRANDE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Defectos Totales
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-rose-500 mt-1 block">
                {kpis.defectosTotales.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Prod. Lograda
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-blue-400 mt-1 block">
                {kpis.produccionLograda.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Índice de Defectos
              </span>
              <span
                className={`text-3xl sm:text-4xl font-black font-mono mt-1 block ${
                  kpis.indiceDefectosPct > 5 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {kpis.indiceDefectosPct}%
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Semana Operativa
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300 mt-1 block">
                SEM {kpis.semana}
              </span>
            </div>
          </div>

          {/* TABLA DE DESGLOSE: EN QUÉ ÁREAS SE CAPTURARON LOS DEFECTOS */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col flex-1 min-h-0 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              ¿En qué departamentos se detectaron estos defectos?
            </h3>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {desgloseCaptura.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  Sin defectos registrados en la semana
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-slate-400 border-b border-slate-800 pb-1">
                    <tr>
                      <th className="py-1.5 font-bold font-sans">Área Auditora</th>
                      <th className="py-1.5 text-right">Cantidad</th>
                      <th className="py-1.5 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {desgloseCaptura.map((d, i) => (
                      <tr key={d.departamentoAuditorId} className="hover:bg-slate-800/40">
                        <td className="py-2 font-sans font-semibold text-slate-200 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: PALETA_AREAS[i % PALETA_AREAS.length] }}
                          />
                          {d.departamentoAuditor}
                        </td>
                        <td className="py-2 text-right font-black text-rose-400">
                          {d.cantidad.toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-bold text-amber-400">
                          {d.porcentaje}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* SECCIÓN: EFICIENCIA DEL INSPECTOR */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Eficiencia del Inspector ({depto.nombre})
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  En Otras Áreas
                </span>
                <span className="text-xl font-black font-mono text-rose-400 mt-1 block">
                  {eficienciaInspector.defectosEnOtrasAreas}
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Devoluciones
                </span>
                <span className="text-xl font-black font-mono text-amber-400 mt-1 block">
                  {eficienciaInspector.devoluciones}
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  % Eficiencia
                </span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                  {eficienciaInspector.porcentajeEficiencia}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: 2 GRÁFICAS DE BARRAS HORIZONTALES */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-5 min-h-0">
          {/* GRÁFICA 1: TOP DEFECTOS DEL DEPARTAMENTO */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col flex-1 min-h-0 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Top Defectos de {depto.nombre} (Pares con Fallo)
            </h3>
            <div className="flex-1 w-full min-h-[180px]">
              {topDefectos.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Sin defectos registrados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topDefectos.map((d) => ({
                      nombreClave: `${d.clave} - ${d.defecto.slice(0, 24)}`,
                      pares: d.totalPares,
                    }))}
                    margin={{ top: 5, right: 35, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="nombreClave"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      width={160}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="pares" fill="#f43f5e" radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="pares" position="right" fill="#fda4af" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* GRÁFICA 2: TOP DEFECTOS APILADOS POR ÁREA AUDITORA */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col flex-1 min-h-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Top Defectos Apilados por Departamento que los Capturó
              </h3>
              <div className="flex items-center gap-3">
                {areasAuditoras.map((area, idx) => (
                  <div key={area} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span
                      className="w-2 h-2 rounded-xs inline-block"
                      style={{ backgroundColor: PALETA_AREAS[idx % PALETA_AREAS.length] }}
                    />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full min-h-[180px]">
              {dataApilada.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Sin defectos registrados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={dataApilada}
                    margin={{ top: 5, right: 35, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="nombreClave"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                      width={160}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
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
