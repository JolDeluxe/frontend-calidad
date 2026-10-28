import { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/http-client';
import type { Departamento, Linea } from '@/features/departamentos/types/departamentos.types';
import type {
  ClasificacionDefecto,
  GrupoCodificacion,
  LoteDefectosPayload,
  LotePreviewResponse,
} from '../types/defectos.types';
import { crearFilaVacia, type FilaLoteEditable } from '../utils/pegado-excel';
import { DefectoDepartamentosSelector } from './defecto-departamentos-selector';
import {
  DefectoCargaMasivaTabla,
  generarIdFila,
  type EstadoFilaLote,
} from './defecto-carga-masiva-tabla';

export interface DefectoFormCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  departamentos: Departamento[];
  lineas: Linea[];
  grupos: GrupoCodificacion[];
  lineaInicialId?: number | null;
  onSubmit: (data: {
    defecto: string;
    clasificacion: ClasificacionDefecto;
    departamentoId: number;
    lineaId: number;
    departamentosIds: number[];
  }) => Promise<void>;
  onPreviewLote: (data: LoteDefectosPayload) => Promise<LotePreviewResponse>;
  onSubmitLote: (data: LoteDefectosPayload) => Promise<void>;
}

type Modo = 'individual' | 'masiva';

const mensajeDe = (err: unknown, fallback: string): string => (err instanceof Error ? err.message : fallback);

// Plantillas históricas por omisión de departamentos evaluadores según el depto propietario
const PLANTILLAS_EVALUADORES_POR_DEPTO: Record<number, number[]> = {
  2: [5, 6, 7, 8, 9, 11], // CORTE: preliminares, bordado, pespunte, montado, acabado, adorno
  8: [5, 6, 7, 9, 11],    // PRELIMINARES: bordado, pespunte, montado, acabado, adorno
  9: [5, 6, 7, 11],       // BORDADO: pespunte, montado, acabado, adorno
  5: [6, 7, 11],          // PESPUNTE: montado, acabado, adorno
  6: [7, 11],             // MONTADO: acabado, adorno
  10: [7, 11],            // AVIOS: acabado, adorno
  7: [11],                // ACABADO: adorno
  11: [],                 // ADORNO: ninguno adicional
};

export function DefectoFormCreateModal({
  isOpen,
  onClose,
  departamentos,
  lineas,
  grupos,
  lineaInicialId,
  onSubmit,
  onPreviewLote,
  onSubmitLote,
}: DefectoFormCreateModalProps) {
  const [modo, setModo] = useState<Modo>('individual');
  const [lineaId, setLineaId] = useState<number | ''>('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [grupoInfo, setGrupoInfo] = useState<LotePreviewResponse['grupo'] | null>(null);
  const [grupoError, setGrupoError] = useState<string | null>(null);

  const [defecto, setDefecto] = useState('');
  const [clasificacion, setClasificacion] = useState<ClasificacionDefecto>('MENOR');
  const [selectedDeptosMap, setSelectedDeptosMap] = useState<Record<number, boolean>>({});

  const [filas, setFilas] = useState<FilaLoteEditable[]>([]);
  const [clasifDefecto, setClasifDefecto] = useState<ClasificacionDefecto>('MENOR');
  const [preview, setPreview] = useState<LotePreviewResponse | null>(null);
  const [erroresServidor, setErroresServidor] = useState<Record<number, string[]>>({});
  const [confirmando, setConfirmando] = useState(false);

  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peticionGrupo = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setModo('individual');
    setLineaId(lineaInicialId ?? '');
    setDepartamentoId('');
    setGrupoInfo(null);
    setGrupoError(null);
    setDefecto('');
    setClasificacion('MENOR');
    setClasifDefecto('MENOR');
    setSelectedDeptosMap(Object.fromEntries(departamentos.map((d) => [d.id, false])));
    setFilas([crearFilaVacia(generarIdFila(), 'MENOR')]);
    setPreview(null);
    setErroresServidor({});
    setConfirmando(false);
    setError(null);
    setIsWorking(false);
  }, [isOpen, departamentos, lineaInicialId]);

  // Consulta (sin reservar) el grupo de codificación de la línea + departamento elegidos.
  useEffect(() => {
    setGrupoInfo(null);
    setGrupoError(null);
    if (!isOpen || !lineaId || !departamentoId) return;
    const turno = ++peticionGrupo.current;
    onPreviewLote({ lineaId, departamentoId, filas: [] })
      .then((r) => turno === peticionGrupo.current && setGrupoInfo(r.grupo))
      .catch((err: unknown) => turno === peticionGrupo.current && setGrupoError(mensajeDe(err, 'No se pudo consultar el grupo de codificación')));
  }, [isOpen, lineaId, departamentoId, onPreviewLote]);

  if (!isOpen) return null;

  const gruposActivos = new Set(
    grupos.filter((g) => g.activo && g.lineaId === lineaId).map((g) => g.departamentoId),
  );
  const deptosDeLinea = departamentos
    .filter((d) => d.estado === 'ACTIVO' && d.lineasAsociadas?.some((l) => l.activo && l.lineaId === lineaId))
    .sort(
      (a, b) =>
        (a.lineasAsociadas?.find((l) => l.lineaId === lineaId)?.orden ?? 0) -
        (b.lineasAsociadas?.find((l) => l.lineaId === lineaId)?.orden ?? 0),
    );

  const payloadLote = (): LoteDefectosPayload => {
    const deptosIdsSet = new Set(
      Object.entries(selectedDeptosMap).filter(([, c]) => c).map(([id]) => Number(id))
    );
    if (departamentoId) deptosIdsSet.add(Number(departamentoId));

    return {
      lineaId: Number(lineaId),
      departamentoId: Number(departamentoId),
      filas: filas.map((f) => ({ descripcion: f.descripcion, clasificacion: f.clasificacion })),
      departamentosIds: Array.from(deptosIdsSet),
      etapasPermitidasIds: Array.from(deptosIdsSet),
    };
  };

  const cambiarFilas = (nuevas: FilaLoteEditable[]) => {
    setFilas(nuevas);
    setPreview(null); // el cambio invalida la previsualización
    setErroresServidor({});
    setConfirmando(false);
  };

  const estados: Record<number, EstadoFilaLote> = {};
  if (preview) {
    preview.filas.forEach((f) => {
      estados[f.indice] = { validada: true, errores: f.errores, clave: f.clavePropuesta };
    });
  } else {
    Object.entries(erroresServidor).forEach(([i, errores]) => {
      estados[Number(i)] = { validada: true, errores, clave: null };
    });
  }

  const handleSubmitIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defecto.trim()) return setError('La descripción del defecto es obligatoria');
    if (!lineaId) return setError('Debes seleccionar la línea de referencia');
    if (!departamentoId) return setError('Debes seleccionar explícitamente un departamento propietario');
    try {
      setIsWorking(true);
      setError(null);
      const deptosIdsSet = new Set(
        Object.entries(selectedDeptosMap).filter(([, c]) => c).map(([id]) => Number(id))
      );
      // El departamento propietario SIEMPRE queda asociado
      deptosIdsSet.add(departamentoId);

      await onSubmit({
        defecto: defecto.trim(),
        clasificacion,
        departamentoId,
        lineaId,
        departamentosIds: Array.from(deptosIdsSet),
      });
      onClose();
    } catch (err: unknown) {
      setError(mensajeDe(err, 'Error al crear defecto'));
    } finally {
      setIsWorking(false);
    }
  };

  const handleValidar = async () => {
    try {
      setIsWorking(true);
      setError(null);
      setErroresServidor({});
      setPreview(await onPreviewLote(payloadLote()));
    } catch (err: unknown) {
      setError(mensajeDe(err, 'Error al validar el lote'));
    } finally {
      setIsWorking(false);
    }
  };

  const handleGuardarLote = async () => {
    try {
      setIsWorking(true);
      setError(null);
      await onSubmitLote(payloadLote());
      onClose();
    } catch (err: unknown) {
      setConfirmando(false);
      setPreview(null); // se conservan las filas para corregir
      setError(mensajeDe(err, 'Error al guardar el lote'));
      if (err instanceof ApiError) {
        const detalle = err.body.errors as { filas?: Array<{ indice: number; errores: string[] }> } | undefined;
        if (detalle?.filas) {
          setErroresServidor(Object.fromEntries(detalle.filas.map((f) => [f.indice, f.errores])));
        }
      }
    } finally {
      setIsWorking(false);
    }
  };

  const clavesPropuestas = preview?.filas.map((f) => f.clavePropuesta).filter((c): c is number => c !== null) ?? [];
  const puedeConfirmar = !!preview?.valido && !isWorking;
  const sinGrupo = !!lineaId && !!departamentoId && !!grupoError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={modo === 'masiva' ? 'max-w-4xl max-h-[92vh]' : 'max-w-xl max-h-[90vh]'}>
      <ModalHeader title="Nuevo Defecto" onClose={onClose} />
      <form onSubmit={handleSubmitIndividual} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-4 overflow-y-auto">
          <div className="inline-flex p-1 bg-app-surface-muted rounded-lg border border-border text-xs" role="tablist">
            {(['individual', 'masiva'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={modo === m}
                disabled={isWorking}
                onClick={() => { setModo(m); setError(null); }}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${
                  modo === m ? 'bg-app-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {m === 'individual' ? 'Individual' : 'Carga masiva'}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{error}</div>
          )}

          {/* Grupo de codificación: línea de referencia + departamento propietario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">Línea de referencia *</Label>
              <Select
                value={lineaId ? String(lineaId) : ''}
                disabled={isWorking}
                onChange={(e) => {
                  setLineaId(e.target.value ? Number(e.target.value) : '');
                  setDepartamentoId('');
                  cambiarFilas(filas);
                }}
              >
                <option value="" disabled>-- Selecciona una línea --</option>
                {lineas.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Departamento *</Label>
              <Select
                value={departamentoId ? String(departamentoId) : ''}
                disabled={isWorking || !lineaId}
                onChange={(e) => {
                  const nuevoDeptoId = e.target.value ? Number(e.target.value) : '';
                  setDepartamentoId(nuevoDeptoId);
                  cambiarFilas(filas);
                  if (nuevoDeptoId) {
                    const sugeridos = PLANTILLAS_EVALUADORES_POR_DEPTO[nuevoDeptoId] ?? [];
                    const nextMap: Record<number, boolean> = {};
                    departamentos.forEach((d) => {
                      nextMap[d.id] = sugeridos.includes(d.id);
                    });
                    setSelectedDeptosMap(nextMap);
                  }
                }}
              >
                <option value="" disabled>-- Selecciona un departamento --</option>
                {deptosDeLinea.map((d) => (
                  <option key={d.id} value={d.id} disabled={!gruposActivos.has(d.id)}>
                    {d.nombre}{gruposActivos.has(d.id) ? '' : ' (codificación pendiente)'}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {grupoInfo && (
            <div className="p-3 bg-app-surface-muted rounded-lg border border-border text-xs text-text-secondary flex items-start gap-2">
              <Icon name="tag" size="16px" className="text-brand-primary shrink-0 mt-0.5" />
              <span>
                Grupo de codificación <strong>{grupoInfo.prefijo}xx</strong> (rango {grupoInfo.rangoMin}–{grupoInfo.rangoMax}).{' '}
                {grupoInfo.proximaClave
                  ? <>Próxima clave: <strong>#{grupoInfo.proximaClave}</strong> · {grupoInfo.disponibles} libres. </>
                  : <strong className="text-red-700">Grupo agotado. </strong>}
                La clave definitiva la asigna el servidor al guardar.
              </span>
            </div>
          )}
          {sinGrupo && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">{grupoError}</div>
          )}

          {modo === 'individual' ? (
            <>
              <div>
                <Label className="mb-1 block">Descripción del Defecto *</Label>
                <Input
                  value={defecto}
                  onChange={(e) => setDefecto(e.target.value)}
                  placeholder="Ej. Costura desalineada en tubo"
                  required
                />
              </div>
              <div>
                <Label className="mb-1 block">Clasificación *</Label>
                <Select value={clasificacion} onChange={(e) => setClasificacion(e.target.value as ClasificacionDefecto)}>
                  <option value="CRITICO">Crítico</option>
                  <option value="MAYOR">Mayor</option>
                  <option value="MENOR">Menor</option>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <Label className="mb-1 block">Clasificación por defecto</Label>
                  <Select value={clasifDefecto} onChange={(e) => setClasifDefecto(e.target.value as ClasificacionDefecto)}>
                    <option value="CRITICO">Crítico</option>
                    <option value="MAYOR">Mayor</option>
                    <option value="MENOR">Menor</option>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isWorking}
                  onClick={() => cambiarFilas(filas.map((f) => ({ ...f, clasificacion: clasifDefecto })))}
                >
                  Aplicar a todas las filas
                </Button>
              </div>

              <DefectoCargaMasivaTabla
                filas={filas}
                onChange={cambiarFilas}
                clasificacionPorDefecto={clasifDefecto}
                estados={estados}
                disabled={isWorking}
              />

              {preview && preview.errores.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs space-y-1">
                  {preview.errores.map((m) => <p key={m}>{m}</p>)}
                </div>
              )}
              {preview && preview.clavesOmitidas.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
                  Se omitieron claves ya ocupadas dentro del rango del grupo: {preview.clavesOmitidas.map((c) => `#${c}`).join(', ')}.
                </div>
              )}
              {confirmando && (
                <div className="p-3 bg-brand-primary/5 border border-brand-primary/30 rounded-lg text-xs">
                  Se crearán <strong>{filas.length}</strong> defectos con las claves{' '}
                  <strong>#{clavesPropuestas[0]}</strong>–<strong>#{clavesPropuestas[clavesPropuestas.length - 1]}</strong>.
                  Las claves definitivas se reasignan en el servidor al guardar; la operación es atómica.
                </div>
              )}
            </div>
          )}

          {/* Selector de departamentos disponible para AMBOS modos (individual y carga masiva) */}
          {!!departamentoId && (
            <div className="pt-2 border-t border-border/70">
              <DefectoDepartamentosSelector
                departamentos={departamentos}
                selectedDeptosMap={selectedDeptosMap}
                onChange={setSelectedDeptosMap}
                departamentoPropietarioId={departamentoId}
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="cancelar" onClick={onClose} disabled={isWorking}>
            Cancelar
          </Button>

          {modo === 'individual' ? (
            <Button
              type="submit"
              variant="guardar"
              disabled={isWorking || !defecto.trim() || !lineaId || !departamentoId || sinGrupo}
              icon={isWorking ? undefined : 'check_circle'}
            >
              {isWorking ? <span className="flex items-center gap-2"><Spinner size="xs" />Guardando...</span> : 'Crear Defecto'}
            </Button>
          ) : confirmando ? (
            <>
              <Button type="button" variant="outline" onClick={() => setConfirmando(false)} disabled={isWorking}>
                Volver
              </Button>
              <Button type="button" variant="guardar" onClick={handleGuardarLote} disabled={isWorking}>
                {isWorking ? <span className="flex items-center gap-2"><Spinner size="xs" />Guardando...</span> : 'Confirmar y guardar'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleValidar}
                disabled={isWorking || !lineaId || !departamentoId || filas.length === 0 || sinGrupo}
              >
                {isWorking ? <span className="flex items-center gap-2"><Spinner size="xs" />Validando...</span> : 'Validar y previsualizar claves'}
              </Button>
              <Button type="button" variant="guardar" onClick={() => setConfirmando(true)} disabled={!puedeConfirmar}>
                Crear {filas.length} defectos
              </Button>
            </>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
