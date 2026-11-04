import { useState, useEffect } from 'react';
import {
  matrizVisibilidadApi,
  type MatrizVisibilidadResponse,
  type OrigenMatrizVisibilidad,
} from '@/features/defectos/api/matriz-visibilidad-api';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';

export function MatrizVisibilidadPage() {
  const [data, setData] = useState<MatrizVisibilidadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');

  // Modal de confirmación para cambios o guardado masivo
  const [deptoConfirmar, setDeptoConfirmar] = useState<OrigenMatrizVisibilidad | null>(null);
  const guardandoLote = false;

  const cargarMatriz = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await matrizVisibilidadApi.getMatrizCompleta();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar matriz de visibilidad';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarMatriz();
  }, []);

  const handleToggleCell = async (
    origenId: number,
    destinoId: number,
    valorActual: boolean,
    origenNombre: string,
    destinoNombre: string
  ) => {
    const key = `${origenId}-${destinoId}`;
    setSavingCell(key);
    const nuevoValor = !valorActual;

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matrices: prev.matrices.map((m) => {
          if (m.departamentoOrigenId !== origenId) return m;
          return {
            ...m,
            destinos: m.destinos.map((d) => {
              if (d.departamentoDestinoId !== destinoId) return d;
              return {
                ...d,
                permitido: nuevoValor,
                configurado: true,
                fechaActualizacion: new Date().toISOString(),
              };
            }),
          };
        }),
      };
    });

    try {
      await matrizVisibilidadApi.upsertRegla({
        departamentoOrigenId: origenId,
        departamentoDestinoId: destinoId,
        permitido: nuevoValor,
      });
      toast.success(
        `Defectos de ${origenNombre} en ${destinoNombre}: ${nuevoValor ? 'PERMITIDO' : 'BLOQUEADO'}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar regla';
      toast.error(msg);
      // Revertir
      void cargarMatriz();
    } finally {
      setSavingCell(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-muted">Cargando matriz maestra de visibilidad de defectos...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-50/50 border border-red-200 rounded-xl space-y-3 max-w-lg mx-auto mt-6">
        <Icon name="error" size="32px" className="text-red-600 mx-auto" />
        <h3 className="text-sm font-semibold text-red-900">Error de conexión</h3>
        <p className="text-xs text-red-700">{error || 'No fue posible cargar los datos.'}</p>
        <Button variant="outline" size="sm" onClick={() => void cargarMatriz()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { departamentos, matrices } = data;
  const matricesFiltradas = matrices.filter(
    (m) =>
      m.departamentoOrigenNombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      m.departamentoOrigenCodigo.toLowerCase().includes(filtroTexto.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Cabecera y descripción de la regla de oro */}
      <div className="bg-app-surface border border-border/70 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Icon name="grid_view" size="20px" className="text-brand-primary" />
              Matriz Maestra de Visibilidad y Detección de Defectos
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-3xl">
              Configura centralizadamente qué departamentos de inspección (columnas) tienen permitido registrar
              defectos originados por cada departamento propietario (filas). Esta matriz gobierna automáticamente
              todos los defectos nuevos y existentes, manteniendo las excepciones individuales de existir.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void cargarMatriz()}
              icon="refresh"
              title="Refrescar matriz"
            >
              Actualizar
            </Button>
          </div>
        </div>

        {/* Banner de estado de configuración */}
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Permitido (Detección autorizada)</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
            <span>Bloqueado (No permitido para inspección)</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Pendiente de definir regla</span>
          </div>
        </div>
      </div>

      {/* Filtro rápido */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <input
            type="text"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            placeholder="Filtrar por departamento propietario..."
            className="w-full bg-app-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
        </div>
        <span className="text-2xs text-text-muted">
          Mostrando {matricesFiltradas.length} de {matrices.length} departamentos propietarios
        </span>
      </div>

      {/* Tabla Matriz Bidimensional */}
      <div className="bg-app-surface border border-border rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-app-surface-muted text-text-secondary border-b border-border shadow-xs">
              <tr>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-2xs min-w-[200px] border-r border-border/80 sticky left-0 z-30 bg-app-surface-muted">
                  Depto. Propietario (Origen)
                </th>
                <th className="py-2.5 px-2 text-center font-semibold uppercase tracking-wider text-2xs w-24 border-r border-border/80">
                  Defectos
                </th>
                {departamentos.map((destino) => (
                  <th
                    key={destino.id}
                    className="py-2.5 px-2 text-center font-semibold uppercase tracking-wider text-2xs min-w-[100px] border-r border-border/60"
                    title={`Departamento de Detección: ${destino.nombre}`}
                  >
                    <span className="block truncate max-w-[110px] mx-auto">{destino.nombre}</span>
                    <span className="text-3xs text-text-muted font-mono lowercase">({destino.codigo})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {matricesFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={departamentos.length + 2}
                    className="py-12 text-center text-text-muted italic text-xs"
                  >
                    No se encontraron departamentos coincidentes con el filtro.
                  </td>
                </tr>
              ) : (
                matricesFiltradas.map((origen) => {
                  const mapaDestinos = new Map(
                    origen.destinos.map((d) => [d.departamentoDestinoId, d])
                  );

                  return (
                    <tr
                      key={origen.departamentoOrigenId}
                      className="hover:bg-app-surface-muted/40 transition-colors"
                    >
                      {/* Columna Departamento Propietario Fijo a la izquierda */}
                      <td className="py-2.5 px-3 border-r border-border/80 sticky left-0 z-10 bg-app-surface font-semibold text-text-primary">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="block">{origen.departamentoOrigenNombre}</span>
                            <span className="text-3xs font-mono text-text-muted lowercase">
                              {origen.departamentoOrigenCodigo}
                            </span>
                          </div>
                          {!origen.estaConfigurado && (
                            <span
                              className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-amber-100 text-amber-800"
                              title="Faltan reglas maestras por definir para este departamento"
                            >
                              Pendiente
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total de defectos pertenecientes a este departamento */}
                      <td className="py-2.5 px-2 text-center border-r border-border/80 font-mono text-xs text-text-secondary">
                        <span className="px-2 py-0.5 rounded-full bg-app-surface-muted border border-border/70 text-text-primary font-bold">
                          {origen.totalDefectosAfectados}
                        </span>
                      </td>

                      {/* Celdas interactivas de permisos por departamento destino */}
                      {departamentos.map((destino) => {
                        const cellData = mapaDestinos.get(destino.id);
                        const isPermitido = cellData?.permitido ?? (origen.departamentoOrigenId === destino.id);
                        const key = `${origen.departamentoOrigenId}-${destino.id}`;
                        const isSaving = savingCell === key;
                        const esMismoDepto = origen.departamentoOrigenId === destino.id;

                        return (
                          <td
                            key={destino.id}
                            className={`py-2 px-2 text-center border-r border-border/40 transition-colors ${
                              isPermitido
                                ? 'bg-emerald-50/40 hover:bg-emerald-100/60'
                                : 'bg-red-50/30 hover:bg-red-100/50'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                handleToggleCell(
                                  origen.departamentoOrigenId,
                                  destino.id,
                                  isPermitido,
                                  origen.departamentoOrigenNombre,
                                  destino.nombre
                                )
                              }
                              className={`w-full py-1.5 px-1.5 rounded-md flex items-center justify-center gap-1 font-semibold text-2xs transition-all cursor-pointer ${
                                isPermitido
                                  ? 'text-emerald-800 hover:text-emerald-950 font-bold'
                                  : 'text-red-700 hover:text-red-900'
                              } disabled:opacity-50`}
                              title={`${
                                isPermitido ? 'Permitido' : 'Bloqueado'
                              }: Defectos de ${origen.departamentoOrigenNombre} en ${
                                destino.nombre
                              }. Haz clic para cambiar.`}
                            >
                              {isSaving ? (
                                <Spinner size="xs" />
                              ) : isPermitido ? (
                                <>
                                  <Icon name="check_circle" size="14px" className="text-emerald-600 shrink-0" />
                                  <span>Sí</span>
                                </>
                              ) : (
                                <>
                                  <Icon name="cancel" size="14px" className="text-red-500 shrink-0" />
                                  <span>No</span>
                                </>
                              )}
                            </button>
                            {esMismoDepto && (
                              <span className="text-4xs text-emerald-700 block mt-0.5 uppercase tracking-tighter">
                                Propietario
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmación para acciones por departamento */}
      {deptoConfirmar && (
        <Modal isOpen={!!deptoConfirmar} onClose={() => setDeptoConfirmar(null)} className="max-w-md">
          <ModalHeader
            title={`Guardar cambios para ${deptoConfirmar.departamentoOrigenNombre}`}
            onClose={() => setDeptoConfirmar(null)}
          />
          <ModalBody className="space-y-3 text-xs text-text-secondary">
            <p>
              Estás a punto de actualizar la matriz maestra de visibilidad para los{' '}
              <strong>{deptoConfirmar.totalDefectosAfectados}</strong> defectos pertenecientes a{' '}
              <strong>{deptoConfirmar.departamentoOrigenNombre}</strong>.
            </p>
            <p className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
              Los inspectores en las etapas bloqueadas ya no podrán registrar estos defectos salvo que exista una excepción explícita.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="cancelar" onClick={() => setDeptoConfirmar(null)} disabled={guardandoLote}>
              Cancelar
            </Button>
            <Button
              variant="guardar"
              disabled={guardandoLote}
              onClick={() => {
                setDeptoConfirmar(null);
              }}
            >
              {guardandoLote ? <Spinner size="xs" /> : 'Confirmar y Guardar'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
