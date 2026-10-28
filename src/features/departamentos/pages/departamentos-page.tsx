import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { departamentosApi } from '../api/departamentos-api';
import type { Departamento, Linea, TipoOperacion } from '../types/departamentos.types';
import { EstructuraOrganizacionalTree } from '../components/estructura-organizacional-tree';
import { DepartamentosList } from '../components/departamentos-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';

type CatalogoTab = 'jerarquia' | 'departamentos';

export function DepartamentosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL State: tab, q, tipo, linea, inactivos
  const tabParam = searchParams.get('tab');
  const activeTab: CatalogoTab = tabParam === 'departamentos' ? 'departamentos' : 'jerarquia';

  const filtroTexto = searchParams.get('q') || '';
  const filtroTipo = searchParams.get('tipo') || '';
  const filtroLinea = searchParams.get('linea') || '';
  const verInactivos = searchParams.get('inactivos') === 'true';

  const updateUrlParams = (updates: Record<string, string | null | undefined>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, val]) => {
          if (val === null || val === undefined || val === '') {
            next.delete(key);
          } else {
            next.set(key, val);
          }
        });
        return next;
      },
      { replace: true }
    );
  };

  const setActiveTab = (tab: CatalogoTab) => {
    updateUrlParams({ tab: tab === 'departamentos' ? 'departamentos' : null });
  };

  const setFiltroTexto = (val: string) => updateUrlParams({ q: val || null });
  const setFiltroTipo = (val: string) => updateUrlParams({ tipo: val || null });
  const setFiltroLinea = (val: string) => updateUrlParams({ linea: val || null });
  const toggleVerInactivos = () => updateUrlParams({ inactivos: verInactivos ? null : 'true' });
  const handleLimpiarFiltros = () => updateUrlParams({ q: null, tipo: null, linea: null });

  // Datos del módulo
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tiposOperacion, setTiposOperacion] = useState<TipoOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales Departamento
  const [isModalCreateDeptoOpen, setIsModalCreateDeptoOpen] = useState(false);
  const [isModalEditDeptoOpen, setIsModalEditDeptoOpen] = useState(false);
  const [isModalDeleteDeptoOpen, setIsModalDeleteDeptoOpen] = useState(false);
  const [currentDepto, setCurrentDepto] = useState<Departamento | null>(null);
  const [formDeptoCodigo, setFormDeptoCodigo] = useState('');
  const [formDeptoNombre, setFormDeptoNombre] = useState('');
  const [formDeptoNumeroLineas, setFormDeptoNumeroLineas] = useState<number>(1);
  const [formDeptoLineas, setFormDeptoLineas] = useState<number[]>([]);

  // Modales Tipo de Operación
  const [isModalCreateTipoOpen, setIsModalCreateTipoOpen] = useState(false);
  const [isModalEditTipoOpen, setIsModalEditTipoOpen] = useState(false);
  const [isModalDeleteTipoOpen, setIsModalDeleteTipoOpen] = useState(false);
  const [currentTipo, setCurrentTipo] = useState<TipoOperacion | null>(null);
  const [formTipoNombre, setFormTipoNombre] = useState('');

  // Modales Línea
  const [isModalCreateLineaOpen, setIsModalCreateLineaOpen] = useState(false);
  const [isModalEditLineaOpen, setIsModalEditLineaOpen] = useState(false);
  const [isModalDeleteLineaOpen, setIsModalDeleteLineaOpen] = useState(false);
  const [currentLinea, setCurrentLinea] = useState<Linea | null>(null);
  const [formLineaTipoId, setFormLineaTipoId] = useState<number | ''>('');
  const [formLineaNombre, setFormLineaNombre] = useState('');

  // Form Submitting & Error
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptosData, lineasData, tiposData] = await Promise.all([
        departamentosApi.getDepartamentos({
          busqueda: filtroTexto || undefined,
          tipoOperacionId: filtroTipo ? Number(filtroTipo) : undefined,
          lineaId: filtroLinea ? Number(filtroLinea) : undefined,
          estado: verInactivos ? 'INACTIVO' : 'ACTIVO',
        }),
        departamentosApi.getLineas(undefined, true),
        departamentosApi.getTiposOperacion(true),
      ]);
      setDepartamentos(deptosData || []);
      setLineas(lineasData || []);
      setTiposOperacion(tiposData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los departamentos';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [filtroTipo, filtroLinea, verInactivos]);

  // Handlers Departamento
  const openCreateDepto = () => {
    setFormDeptoCodigo('');
    setFormDeptoNombre('');
    setFormDeptoNumeroLineas(1);
    setFormDeptoLineas([]);
    setFormError(null);
    setIsModalCreateDeptoOpen(true);
  };

  const openEditDepto = (depto: Departamento) => {
    setCurrentDepto(depto);
    setFormDeptoCodigo(depto.codigo);
    setFormDeptoNombre(depto.nombre);
    setFormDeptoNumeroLineas(depto.numeroLineas || 1);
    const lineasIds = depto.lineasAsociadas?.map((a) => a.lineaId) || [];
    setFormDeptoLineas(lineasIds);
    setFormError(null);
    setIsModalEditDeptoOpen(true);
  };

  const openDeleteDepto = (depto: Departamento) => {
    setCurrentDepto(depto);
    setFormError(null);
    setIsModalDeleteDeptoOpen(true);
  };

  const handleCreateDeptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeptoNombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createDepartamento({
        codigo: formDeptoCodigo.trim() ? formDeptoCodigo.trim().toUpperCase() : undefined,
        nombre: formDeptoNombre.trim(),
        numeroLineas: Number(formDeptoNumeroLineas) || 1,
        lineasIds: formDeptoLineas,
      });
      setIsModalCreateDeptoOpen(false);
      await fetchAllData();
      toast.success(`Departamento "${formDeptoNombre.trim()}" creado exitosamente`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear departamento';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditDeptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDepto) return;
    if (!formDeptoNombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.updateDepartamento(currentDepto.id, {
        codigo: formDeptoCodigo.trim() ? formDeptoCodigo.trim().toUpperCase() : undefined,
        nombre: formDeptoNombre.trim(),
        numeroLineas: Number(formDeptoNumeroLineas) || 1,
        lineasIds: formDeptoLineas,
      });
      setIsModalEditDeptoOpen(false);
      await fetchAllData();
      toast.success('Departamento actualizado exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar departamento';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleEstadoDepto = async (depto: Departamento) => {
    try {
      const nuevo = depto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await departamentosApi.updateEstadoDepartamento(depto.id, nuevo);
      await fetchAllData();
      toast.success(`Departamento ${nuevo === 'ACTIVO' ? 'activado' : 'desactivado'} exitosamente`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado de departamento';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteDeptoConfirm = async () => {
    if (!currentDepto) return;
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.updateEstadoDepartamento(currentDepto.id, 'INACTIVO');
      setIsModalDeleteDeptoOpen(false);
      await fetchAllData();
      toast.success(`Departamento "${currentDepto.nombre}" desactivado exitosamente`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al desactivar departamento';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers Tipos
  const openCreateTipo = () => {
    setFormTipoNombre('');
    setFormError(null);
    setIsModalCreateTipoOpen(true);
  };

  const openEditTipo = (tipo: TipoOperacion) => {
    setCurrentTipo(tipo);
    setFormTipoNombre(tipo.nombre);
    setFormError(null);
    setIsModalEditTipoOpen(true);
  };

  const openDeleteTipo = (tipo: TipoOperacion) => {
    setCurrentTipo(tipo);
    setFormError(null);
    setIsModalDeleteTipoOpen(true);
  };

  const handleCreateTipoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTipoNombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createTipoOperacion({
        nombre: formTipoNombre.trim(),
      });
      setIsModalCreateTipoOpen(false);
      await fetchAllData();
      toast.success(`Tipo de operación "${formTipoNombre.trim()}" creado`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear tipo de operación';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditTipoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTipo) return;
    if (!formTipoNombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.updateTipoOperacion(currentTipo.id, {
        nombre: formTipoNombre.trim(),
      });
      setIsModalEditTipoOpen(false);
      await fetchAllData();
      toast.success('Tipo de operación actualizado');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar tipo de operación';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteTipoConfirm = async () => {
    if (!currentTipo) return;
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.deleteTipoOperacion(currentTipo.id);
      setIsModalDeleteTipoOpen(false);
      await fetchAllData();
      toast.success(`Tipo de operación "${currentTipo.nombre}" eliminado`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar tipo de operación';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers Líneas
  const openCreateLinea = (tipoId: number) => {
    setFormLineaTipoId(tipoId);
    setFormLineaNombre('');
    setFormError(null);
    setIsModalCreateLineaOpen(true);
  };

  const openEditLinea = (linea: Linea) => {
    setCurrentLinea(linea);
    setFormLineaNombre(linea.nombre);
    setFormError(null);
    setIsModalEditLineaOpen(true);
  };

  const openDeleteLinea = (linea: Linea) => {
    setCurrentLinea(linea);
    setFormError(null);
    setIsModalDeleteLineaOpen(true);
  };

  const handleCreateLineaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLineaTipoId || !formLineaNombre.trim()) {
      setFormError('Tipo y nombre son obligatorios');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createLinea({
        tipoOperacionId: Number(formLineaTipoId),
        nombre: formLineaNombre.trim(),
      });
      setIsModalCreateLineaOpen(false);
      await fetchAllData();
      toast.success(`Línea "${formLineaNombre.trim()}" creada exitosamente`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear línea';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditLineaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLinea) return;
    if (!formLineaNombre.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.updateLinea(currentLinea.id, {
        nombre: formLineaNombre.trim(),
      });
      setIsModalEditLineaOpen(false);
      await fetchAllData();
      toast.success('Línea actualizada exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar línea';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteLineaConfirm = async () => {
    if (!currentLinea) return;
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.deleteLinea(currentLinea.id);
      setIsModalDeleteLineaOpen(false);
      await fetchAllData();
      toast.success(`Línea "${currentLinea.nombre}" eliminada`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar línea';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const toggleDeptoLineaSelection = (lineaId: number) => {
    setFormDeptoLineas((prev) =>
      prev.includes(lineaId) ? prev.filter((id) => id !== lineaId) : [...prev, lineaId]
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal Fuera de Cuadro Blanco (Idéntico a Registro e Inspecciones) */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            DEPARTAMENTOS
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              verInactivos
                ? 'bg-rose-100 text-rose-800'
                : 'bg-marca-primario/10 text-marca-primario'
            }`}
          >
            {departamentos.length} {verInactivos ? 'inactivos' : 'departamentos activos'}
          </span>
        </div>

        {/* Botón de acción al fondo a la derecha fuera de cualquier cuadro */}
        <div className="flex items-center gap-2">
          {activeTab === 'jerarquia' ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openCreateTipo}
              className="h-9 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer"
            >
              <Icon name="add" size="18px" />
              <span>Nuevo Tipo de Operación</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={openCreateDepto}
              className="h-9 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer"
            >
              <Icon name="add" size="18px" />
              <span>Nuevo Departamento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('jerarquia')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'jerarquia'
                ? 'bg-marca-primario text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="account_tree" size="14px" />
            <span>Líneas y Operación</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'jerarquia' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tiposOperacion.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('departamentos')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'departamentos'
                ? 'bg-marca-primario text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon name="domain" size="14px" />
            <span>Departamentos</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'departamentos' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {departamentos.length}
            </span>
          </button>
        </div>
      </div>

      {/* Alerta de Error General */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Icon name="error" size="16px" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <Icon name="close" className="text-xs" />
          </Button>
        </div>
      )}

      {/* Contenido según Tab Activo */}
      {loading ? (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`depto-skeleton-${i}`} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'jerarquia' ? (
        <EstructuraOrganizacionalTree
          tipos={tiposOperacion}
          departamentos={departamentos}
          onOpenCreateTipo={openCreateTipo}
          onOpenEditTipo={openEditTipo}
          onDeleteTipo={openDeleteTipo}
          onOpenCreateLinea={openCreateLinea}
          onOpenEditLinea={openEditLinea}
          onDeleteLinea={openDeleteLinea}
          onOpenEditDepto={openEditDepto}
        />
      ) : (
        <DepartamentosList
          departamentos={departamentos}
          lineas={lineas}
          tiposOperacion={tiposOperacion}
          filtroTexto={filtroTexto}
          setFiltroTexto={setFiltroTexto}
          filtroTipo={filtroTipo}
          setFiltroTipo={setFiltroTipo}
          filtroLinea={filtroLinea}
          setFiltroLinea={setFiltroLinea}
          verInactivos={verInactivos}
          onToggleInactivos={toggleVerInactivos}
          onLimpiarFiltros={handleLimpiarFiltros}
          onOpenCreate={openCreateDepto}
          onOpenEdit={openEditDepto}
          onDesactivar={openDeleteDepto}
          onReactivar={handleToggleEstadoDepto}
          isLoading={loading}
        />
      )}

      {/* MODAL NUEVO DEPARTAMENTO */}
      <Modal isOpen={isModalCreateDeptoOpen} onClose={() => setIsModalCreateDeptoOpen(false)} className="max-w-xl max-h-[90vh]">
        <ModalHeader title="Nuevo Departamento" onClose={() => setIsModalCreateDeptoOpen(false)} />
        <form onSubmit={handleCreateDeptoSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <div>
              <Label className="mb-1 block">
                Nombre del Departamento *
              </Label>
              <Input
                value={formDeptoNombre}
                onChange={(e) => setFormDeptoNombre(e.target.value)}
                placeholder="Ej. Preliminares"
                required
                autoFocus
              />
            </div>

            <div>
              <Label className="mb-1 block">
                Líneas de Inspección Disponibles (1 - 10) *
              </Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formDeptoNumeroLineas}
                onChange={(e) => setFormDeptoNumeroLineas(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                placeholder="1"
                required
              />
              <span className="text-[11px] text-text-secondary mt-1 block">
                Define cuántas líneas operativas de inspección (L1, L2, etc.) tendrá este departamento en el modal de captura.
              </span>
            </div>

            {/* Selección de Líneas de Producción Disponibles */}
            {lineas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="block">
                    Líneas de Producción Asociadas
                  </Label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-marca-primario/10 text-marca-primario">
                    {formDeptoLineas.length} seleccionadas
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-border/80 rounded-xl bg-app-surface p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lineas.map((linea) => {
                      const isChecked = formDeptoLineas.includes(linea.id);
                      return (
                        <label
                          key={linea.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-marca-primario/5 border-marca-primario/40 text-marca-primario font-semibold shadow-2xs'
                              : 'bg-app-surface border-border/80 text-text-primary hover:bg-app-surface-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDeptoLineaSelection(linea.id)}
                            className="w-4 h-4 rounded border-border text-marca-primario focus:ring-marca-primario cursor-pointer shrink-0"
                          />
                          <span className="leading-snug truncate" title={linea.nombre}>
                            {linea.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalCreateDeptoOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting || !formDeptoNombre.trim()} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Crear Departamento'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL EDITAR DEPARTAMENTO */}
      <Modal isOpen={isModalEditDeptoOpen} onClose={() => setIsModalEditDeptoOpen(false)} className="max-w-xl max-h-[90vh]">
        <ModalHeader title={`Editar Departamento: ${currentDepto?.nombre || ''}`} onClose={() => setIsModalEditDeptoOpen(false)} />
        <form onSubmit={handleEditDeptoSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <div>
              <Label className="mb-1 block">
                Nombre del Departamento *
              </Label>
              <Input
                value={formDeptoNombre}
                onChange={(e) => setFormDeptoNombre(e.target.value)}
                placeholder="Ej. Corte"
                required
                autoFocus
              />
            </div>

            <div>
              <Label className="mb-1 block">
                Líneas de Inspección Disponibles (1 - 10) *
              </Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={formDeptoNumeroLineas}
                onChange={(e) => setFormDeptoNumeroLineas(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                placeholder="1"
                required
              />
              <span className="text-[11px] text-text-secondary mt-1 block">
                Define cuántas líneas operativas de inspección (L1, L2, etc.) tendrá este departamento en el modal de captura.
              </span>
            </div>

            {/* Selección de Líneas de Producción Disponibles */}
            {lineas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="block">
                    Líneas de Producción Asociadas
                  </Label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-marca-primario/10 text-marca-primario">
                    {formDeptoLineas.length} seleccionadas
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-border/80 rounded-xl bg-app-surface p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lineas.map((linea) => {
                      const isChecked = formDeptoLineas.includes(linea.id);
                      return (
                        <label
                          key={linea.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-marca-primario/5 border-marca-primario/40 text-marca-primario font-semibold shadow-2xs'
                              : 'bg-app-surface border-border/80 text-text-primary hover:bg-app-surface-muted'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDeptoLineaSelection(linea.id)}
                            className="w-4 h-4 rounded border-border text-marca-primario focus:ring-marca-primario cursor-pointer shrink-0"
                          />
                          <span className="leading-snug truncate" title={linea.nombre}>
                            {linea.nombre}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalEditDeptoOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting || !formDeptoNombre.trim()} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL DESACTIVAR DEPARTAMENTO (CONFIRMACIÓN LÓGICA) */}
      <Modal isOpen={isModalDeleteDeptoOpen} onClose={() => setIsModalDeleteDeptoOpen(false)} className="max-w-md">
        <ModalHeader title="Desactivar Departamento" onClose={() => setIsModalDeleteDeptoOpen(false)} />
        <ModalBody className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {formError}
            </div>
          )}
          <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
            <div className="flex items-center gap-2 text-danger font-medium text-sm">
              <Icon name="warning" size="18px" />
              <span>Confirmar Desactivación</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              ¿Está seguro de que desea desactivar el departamento{' '}
              <strong className="text-text-primary">{currentDepto?.nombre}</strong>?
            </p>
            <p className="text-[11px] text-text-muted leading-relaxed">
              El departamento ya no estará disponible para selección en nuevas capturas ni inspecciones, pero sus registros históricos se conservarán intactos.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="cancelar" onClick={() => setIsModalDeleteDeptoOpen(false)} disabled={formSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={formSubmitting}
            onClick={handleDeleteDeptoConfirm}
            icon={formSubmitting ? undefined : 'delete'}
          >
            {formSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" />
                Desactivando...
              </span>
            ) : (
              'Desactivar Departamento'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODALES TIPO DE OPERACIÓN */}
      <Modal isOpen={isModalCreateTipoOpen} onClose={() => setIsModalCreateTipoOpen(false)} className="max-w-md">
        <ModalHeader title="Nuevo Tipo de Operación" onClose={() => setIsModalCreateTipoOpen(false)} />
        <form onSubmit={handleCreateTipoSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Nombre *
              </Label>
              <Input
                value={formTipoNombre}
                onChange={(e) => setFormTipoNombre(e.target.value)}
                placeholder="Ej. Producción"
                required
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalCreateTipoOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Crear Tipo de Operación'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isModalEditTipoOpen} onClose={() => setIsModalEditTipoOpen(false)} className="max-w-md">
        <ModalHeader title={`Editar: ${currentTipo?.nombre || ''}`} onClose={() => setIsModalEditTipoOpen(false)} />
        <form onSubmit={handleEditTipoSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Nombre *
              </Label>
              <Input
                value={formTipoNombre}
                onChange={(e) => setFormTipoNombre(e.target.value)}
                placeholder="Ej. Producción"
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalEditTipoOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isModalDeleteTipoOpen} onClose={() => setIsModalDeleteTipoOpen(false)} className="max-w-md">
        <ModalHeader title="Eliminar Tipo de Operación" onClose={() => setIsModalDeleteTipoOpen(false)} />
        <ModalBody className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {formError}
            </div>
          )}
          <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
            <div className="flex items-center gap-2 text-danger font-medium text-sm">
              <Icon name="warning" size="18px" />
              <span>Confirmación de Eliminación</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              ¿Está seguro de que desea eliminar el tipo de operación{' '}
              <strong className="text-text-primary">{currentTipo?.nombre}</strong>?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="cancelar" onClick={() => setIsModalDeleteTipoOpen(false)} disabled={formSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={formSubmitting}
            onClick={handleDeleteTipoConfirm}
            icon={formSubmitting ? undefined : 'delete'}
          >
            {formSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" />
                Eliminando...
              </span>
            ) : (
              'Confirmar Eliminación'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODALES LÍNEA */}
      <Modal isOpen={isModalCreateLineaOpen} onClose={() => setIsModalCreateLineaOpen(false)} className="max-w-md">
        <ModalHeader title="Nueva Línea de Producción" onClose={() => setIsModalCreateLineaOpen(false)} />
        <form onSubmit={handleCreateLineaSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Tipo de Operación *
              </Label>
              <select
                value={formLineaTipoId}
                onChange={(e) => setFormLineaTipoId(Number(e.target.value))}
                className="w-full text-xs rounded border border-border/80 p-2.5 bg-app-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent uppercase font-bold"
                required
              >
                {tiposOperacion.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">
                Nombre de la Línea *
              </Label>
              <Input
                value={formLineaNombre}
                onChange={(e) => setFormLineaNombre(e.target.value)}
                placeholder="Ej. Bota"
                required
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalCreateLineaOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Crear Línea'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isModalEditLineaOpen} onClose={() => setIsModalEditLineaOpen(false)} className="max-w-md">
        <ModalHeader title={`Editar Línea: ${currentLinea?.nombre || ''}`} onClose={() => setIsModalEditLineaOpen(false)} />
        <form onSubmit={handleEditLineaSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Nombre de la Línea *
              </Label>
              <Input
                value={formLineaNombre}
                onChange={(e) => setFormLineaNombre(e.target.value)}
                placeholder="Ej. Bota"
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalEditLineaOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting} icon={formSubmitting ? undefined : 'check_circle'}>
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="xs" />
                  Guardando...
                </span>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal isOpen={isModalDeleteLineaOpen} onClose={() => setIsModalDeleteLineaOpen(false)} className="max-w-md">
        <ModalHeader title="Eliminar Línea" onClose={() => setIsModalDeleteLineaOpen(false)} />
        <ModalBody className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {formError}
            </div>
          )}
          <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
            <div className="flex items-center gap-2 text-danger font-medium text-sm">
              <Icon name="warning" size="18px" />
              <span>Confirmación de Eliminación</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              ¿Está seguro de que desea eliminar la línea{' '}
              <strong className="text-text-primary">{currentLinea?.nombre}</strong>?
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="cancelar" onClick={() => setIsModalDeleteLineaOpen(false)} disabled={formSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={formSubmitting}
            onClick={handleDeleteLineaConfirm}
            icon={formSubmitting ? undefined : 'delete'}
          >
            {formSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" />
                Eliminando...
              </span>
            ) : (
              'Confirmar Eliminación'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
