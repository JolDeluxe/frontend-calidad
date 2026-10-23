import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { LoteInfoCard } from '../components/lote-info-card';
import { AgregarDefectoForm } from '../components/agregar-defecto-form';
import { DefectosStagingTabla } from '../components/defectos-staging-tabla';
import { inspeccionesApi } from '../api/inspecciones-api';
import type {
  ProduccionLote,
  DefectoItemStaging,
  LineaOperativa,
} from '../types/inspecciones.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export function CapturaInspeccionPage() {
  // Estado del paso 1: Búsqueda y validación de Lote
  const [loteInput, setLoteInput] = useState('');
  const [cargandoLote, setCargandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState<string | null>(null);
  const [loteActivo, setLoteActivo] = useState<ProduccionLote | null>(null);

  // Catálogos auxiliares (Líneas y Departamentos)
  const [lineas, setLineas] = useState<LineaOperativa[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineaSeleccionadaId, setLineaSeleccionadaId] = useState<number | ''>('');
  const [deptoAuditoriaId, setDeptoAuditoriaId] = useState<number | ''>('');
  const [notasInspeccion, setNotasInspeccion] = useState('');

  // Estado del paso 2: Lista temporal de defectos (Staging)
  const [defectosStaging, setDefectosStaging] = useState<DefectoItemStaging[]>([]);

  // Estado del paso 3: Guardado atómico
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [exitoGuardado, setExitoGuardado] = useState<{
    folio: string;
    totalDefectos: number;
  } | null>(null);

  // Cargar catálogos al montar
  useEffect(() => {
    let cancelado = false;
    const cargarCatalogos = async () => {
      try {
        const [lineasRes, deptosRes] = await Promise.all([
          inspeccionesApi.getLineas(),
          inspeccionesApi.getDepartamentos(),
        ]);
        if (!cancelado) {
          setLineas(lineasRes);
          setDepartamentos(deptosRes);
          if (deptosRes.length > 0) {
            setDeptoAuditoriaId(deptosRes[0].id);
          }
        }
      } catch (err) {
        console.error('Error al cargar catálogos auxiliares de inspección', err);
      }
    };
    cargarCatalogos();
    return () => {
      cancelado = true;
    };
  }, []);

  const handleBuscarLote = async () => {
    const cod = loteInput.trim();
    if (!cod) {
      setErrorLote('Ingrese el número o identificador del lote');
      return;
    }

    setCargandoLote(true);
    setErrorLote(null);
    setExitoGuardado(null);

    try {
      const loteObtenido = await inspeccionesApi.getLoteByCodigo(cod);
      setLoteActivo(loteObtenido);
    } catch (err: any) {
      setLoteActivo(null);
      setErrorLote(err.message || `No se encontró el lote '${cod}' en la base de datos.`);
    } finally {
      setCargandoLote(false);
    }
  };

  const handleKeyDownLote = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBuscarLote();
    }
  };

  const handleAgregarDefectoStaging = (item: DefectoItemStaging) => {
    setDefectosStaging((prev) => [...prev, item]);
    setErrorGuardado(null);
  };

  const handleEliminarDefectoStaging = (idTemporal: string) => {
    setDefectosStaging((prev) => prev.filter((d) => d.idTemporal !== idTemporal));
  };

  const handleGuardarInspeccion = async () => {
    if (!loteActivo) {
      setErrorGuardado('Debe tener un lote válido cargado');
      return;
    }

    if (defectosStaging.length === 0) {
      setErrorGuardado('Debe registrar al menos un defecto antes de guardar');
      return;
    }

    setGuardando(true);
    setErrorGuardado(null);

    try {
      const resp = await inspeccionesApi.createInspeccion({
        lote: loteActivo.lote,
        lineaId: lineaSeleccionadaId ? Number(lineaSeleccionadaId) : null,
        departamentoAuditoriaId: deptoAuditoriaId ? Number(deptoAuditoriaId) : undefined,
        horma: loteActivo.horma,
        notas: notasInspeccion.trim() || null,
        detalles: defectosStaging.map((d) => ({
          defectoId: d.defectoId,
          defDeptoId: d.departamentoResponsableId,
          paresDefectuosos: d.paresDefectuosos,
          notas: d.notas,
        })),
      });

      setExitoGuardado({
        folio: resp.folio,
        totalDefectos: resp.detalles.length,
      });

      // Limpiar formulario tras guardado exitoso
      setDefectosStaging([]);
      setNotasInspeccion('');
      setLoteActivo(null);
      setLoteInput('');
    } catch (err: any) {
      setErrorGuardado(err.message || 'Error al guardar la inspección de defectos');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Alerta de Éxito de Inspección Previa */}
      {exitoGuardado && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Icon name="check_circle" size="24px" className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">
                Inspección Guardada con Éxito (Folio: {exitoGuardado.folio})
              </h4>
              <p className="text-xs text-emerald-800 mt-1">
                Se registraron {exitoGuardado.totalDefectos} defectos en la base de datos de manera atómica con su correspondiente registro de auditoría encadenada.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExitoGuardado(null)}
            className="text-emerald-800 hover:bg-emerald-100"
          >
            Cerrar
          </Button>
        </div>
      )}

      {/* PASO 1: Consulta y Verificación de Lote */}
      <div className="rounded-md border border-cuadra-arena-dark bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-cuadra-arena pb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-marca-primario text-white text-[11px] font-bold">
            1
          </div>
          <h3 className="text-sm font-bold text-marca-primario">
            Identificación del Lote a Inspeccionar
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-app-text mb-1">
              Número de Lote *
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ej. 36296, 52091..."
                value={loteInput}
                onChange={(e) => {
                  setLoteInput(e.target.value);
                  setErrorLote(null);
                }}
                onKeyDown={handleKeyDownLote}
                disabled={cargandoLote || guardando}
                className="font-mono text-xs font-bold"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleBuscarLote}
                disabled={cargandoLote || guardando || !loteInput.trim()}
                className="gap-1.5"
              >
                {cargandoLote ? (
                  <Spinner size="14px" />
                ) : (
                  <>
                    <Icon name="search" size="16px" />
                    <span>Verificar</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-app-text mb-1">
              Línea de Fabricación
            </label>
            <Select
              value={lineaSeleccionadaId.toString()}
              onChange={(e) => setLineaSeleccionadaId(e.target.value ? Number(e.target.value) : '')}
              disabled={guardando}
              className="text-xs"
            >
              <option value="">(Selección automática / General)</option>
              {lineas.map((linea) => (
                <option key={linea.id} value={linea.id}>
                  {linea.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-app-text mb-1">
              Departamento Auditor
            </label>
            <Select
              value={deptoAuditoriaId.toString()}
              onChange={(e) => setDeptoAuditoriaId(Number(e.target.value))}
              disabled={guardando}
              className="text-xs"
            >
              {departamentos.map((depto) => (
                <option key={depto.id} value={depto.id}>
                  {depto.nombre}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {errorLote && (
          <div className="text-xs font-medium text-red-600 flex items-center gap-1.5 bg-red-50 p-2.5 rounded border border-red-200">
            <Icon name="error" size="16px" className="shrink-0" />
            <span>{errorLote}</span>
          </div>
        )}

        {/* Tarjeta de Resumen del Lote Encontrado */}
        {loteActivo && <LoteInfoCard lote={loteActivo} />}
      </div>

      {/* PASO 2: Agregar Defectos a la Inspección */}
      {loteActivo && (
        <div className="space-y-4">
          <AgregarDefectoForm
            departamentos={departamentos}
            onAgregar={handleAgregarDefectoStaging}
            disabled={guardando}
          />

          <DefectosStagingTabla
            items={defectosStaging}
            onEliminar={handleEliminarDefectoStaging}
            disabled={guardando}
          />

          {/* PASO 3: Observaciones Finales y Confirmación */}
          <div className="rounded-md border border-cuadra-arena-dark bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-cuadra-arena pb-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-marca-primario text-white text-[11px] font-bold">
                3
              </div>
              <h3 className="text-sm font-bold text-marca-primario">
                Confirmación y Guardado de la Inspección
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-app-text mb-1">
                  Notas Generales de la Inspección (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Observaciones generales sobre la partida o auditoría..."
                  value={notasInspeccion}
                  onChange={(e) => setNotasInspeccion(e.target.value)}
                  disabled={guardando}
                  className="text-xs"
                />
              </div>

              {errorGuardado && (
                <div className="text-xs font-medium text-red-600 flex items-center gap-1.5 bg-red-50 p-2.5 rounded border border-red-200">
                  <Icon name="error" size="16px" className="shrink-0" />
                  <span>{errorGuardado}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-cuadra-arena/60">
                <div className="text-xs text-app-text-muted">
                  Al confirmar, se generará el folio único y se guardará la cabecera con sus {defectosStaging.length} detalles de forma atómica.
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={guardando || defectosStaging.length === 0}
                    onClick={() => setDefectosStaging([])}
                  >
                    Limpiar Defectos
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={guardando || defectosStaging.length === 0}
                    onClick={handleGuardarInspeccion}
                    className="gap-2 font-bold px-6"
                  >
                    {guardando ? (
                      <>
                        <Spinner size="16px" />
                        <span>Guardando Inspección...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="save" size="18px" />
                        <span>Confirmar y Guardar Inspección</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
