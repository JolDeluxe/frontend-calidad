import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface ExportModalConfig {
  formato: 'excel' | 'pdf';
  periodo: 'hoy' | 'mes' | 'todos';
  mes: string;
  anio: string;
  departamentoId: number | null;
  lineaTexto: string | null;
  inspectorId: number | null;
}

export interface RegistroExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportar: (config: ExportModalConfig) => Promise<void>;
  departamentos: Departamento[];
  inspectores: Array<{ id: number; nombre: string; usuario: string; rol?: { nombre: string } }>;
  periodoActual: 'hoy' | 'todos';
  mesActual: string;
  anioActual: string;
  departamentoActualId: number | null;
  lineaActualTexto: string | null;
  inspectorActualId: number | null;
  totalDefectosVista: number;
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

export function RegistroExportModal({
  isOpen,
  onClose,
  onExportar,
  departamentos,
  inspectores,
  periodoActual,
  mesActual,
  anioActual,
  departamentoActualId,
  lineaActualTexto,
  inspectorActualId,
}: RegistroExportModalProps) {
  const [formato, setFormato] = useState<'excel' | 'pdf'>('excel');
  const [periodo, setPeriodo] = useState<'hoy' | 'mes' | 'todos'>(periodoActual === 'hoy' ? 'hoy' : 'mes');
  const [mes, setMes] = useState(mesActual || String(new Date().getMonth() + 1));
  const [anio, setAnio] = useState(anioActual || String(new Date().getFullYear()));
  const [departamentoId, setDepartamentoId] = useState<number | null>(departamentoActualId);
  const [lineaTexto, setLineaTexto] = useState<string | null>(lineaActualTexto);
  const [inspectorId, setInspectorId] = useState<number | null>(inspectorActualId);
  const [exportando, setExportando] = useState(false);

  // Inicializar con los filtros activos al abrir
  useEffect(() => {
    if (isOpen) {
      setPeriodo(periodoActual === 'hoy' ? 'hoy' : 'mes');
      setMes(mesActual || String(new Date().getMonth() + 1));
      setAnio(anioActual || String(new Date().getFullYear()));
      setDepartamentoId(departamentoActualId);
      setLineaTexto(lineaActualTexto);
      setInspectorId(inspectorActualId);
      setExportando(false);
    }
  }, [isOpen, periodoActual, mesActual, anioActual, departamentoActualId, lineaActualTexto, inspectorActualId]);

  // Si cambia el departamento, verificar si tiene líneas múltiples
  const deptoSeleccionado = departamentos.find((d) => d.id === departamentoId);
  const tieneMultiplesLineas = Boolean(deptoSeleccionado && (deptoSeleccionado.numeroLineas || 1) > 1);

  const handleDeptoChange = (idNum: number | null) => {
    setDepartamentoId(idNum);
    const dep = departamentos.find((d) => d.id === idNum);
    if (!dep || (dep.numeroLineas || 1) <= 1) {
      setLineaTexto(null);
    }
  };

  const handleSubmit = async () => {
    setExportando(true);
    try {
      await onExportar({
        formato,
        periodo,
        mes,
        anio,
        departamentoId,
        lineaTexto,
        inspectorId,
      });
      onClose();
    } catch (err) {
      console.error('Error al exportar:', err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Exportar Reporte de Defectos" onClose={onClose} />
      <ModalBody className="space-y-4 text-xs">
        {/* Selección de Formato */}
        <div>
          <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
            1. Formato de Exportación
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormato('excel')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                formato === 'excel'
                  ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  formato === 'excel'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Icon name="table_view" size="20px" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block text-xs">Excel (.csv directo)</span>
                <span className="text-[11px] text-slate-500">Hoja de cálculo tabulada limpia</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormato('pdf')}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                formato === 'pdf'
                  ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  formato === 'pdf'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Icon name="picture_as_pdf" size="20px" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block text-xs">Documento PDF</span>
                <span className="text-[11px] text-slate-500">Formato horizontal imprimible</span>
              </div>
            </button>
          </div>
        </div>

        {/* Alcance Temporal / Período */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-600">
            2. Período a Exportar
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPeriodo('hoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                periodo === 'hoy'
                  ? 'bg-marca-primario text-white border-marca-primario shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Defectos de Hoy
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                periodo === 'mes'
                  ? 'bg-marca-primario text-white border-marca-primario shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Por Mes y Año
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                periodo === 'todos'
                  ? 'bg-marca-primario text-white border-marca-primario shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Histórico Completo
            </button>
          </div>

          {/* Selectores de Mes y Año si periodo === 'mes' */}
          {periodo === 'mes' && (
            <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
              <div className="flex-1">
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Mes:</span>
                <select
                  value={mes}
                  onChange={(e) => setMes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {MESES.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-28">
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Año:</span>
                <select
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                >
                  {ANIOS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Filtros de Alcance: Departamento, Línea e Inspector */}
        <div className="space-y-3">
          <label className="block text-2xs font-extrabold uppercase tracking-wider text-slate-500">
            3. Filtros Opcionales
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Departamento */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Departamento:
              </span>
              <select
                value={departamentoId ? String(departamentoId) : ''}
                onChange={(e) => handleDeptoChange(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
              >
                <option value="">Todos los Departamentos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Inspector */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Inspector:
              </span>
              <select
                value={inspectorId ? String(inspectorId) : ''}
                onChange={(e) => setInspectorId(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
              >
                <option value="">Todos los Inspectores</option>
                {inspectores.map((insp) => (
                  <option key={insp.id} value={insp.id}>
                    {insp.nombre || insp.usuario}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Línea Operativa (solo si el depto tiene más de 1 línea) */}
          {tieneMultiplesLineas && deptoSeleccionado && (
            <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Icon name="linear_scale" size="16px" className="text-amber-700" />
                <span className="text-xs font-bold text-amber-950">
                  Línea operativa ({deptoSeleccionado.nombre}):
                </span>
              </div>
              <select
                value={lineaTexto || ''}
                onChange={(e) => setLineaTexto(e.target.value || null)}
                className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer w-36"
              >
                <option value="">Todas Líneas</option>
                {Array.from({ length: deptoSeleccionado.numeroLineas || 1 }, (_, i) => `L${i + 1}`).map((lin) => (
                  <option key={lin} value={lin}>
                    {lin}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exportando}
          onClick={onClose}
          className="text-xs font-semibold cursor-pointer"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={exportando}
          onClick={handleSubmit}
          className="gap-2 text-xs font-bold cursor-pointer px-5"
        >
          {exportando ? (
            <>
              <Spinner size="xs" />
              <span>Generando {formato.toUpperCase()}...</span>
            </>
          ) : (
            <>
              <Icon
                name={formato === 'excel' ? 'table_view' : 'picture_as_pdf'}
                size="16px"
              />
              <span>Descargar {formato === 'excel' ? 'Excel' : 'PDF'}</span>
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
