import { useState, useEffect } from 'react';
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

type CatalogoTab = 'jerarquia' | 'departamentos';

export function DepartamentosPage() {
  const [activeTab, setActiveTab] = useState<CatalogoTab>('jerarquia');

  // Datos del módulo
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tiposOperacion, setTiposOperacion] = useState<TipoOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros Departamentos
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroLinea, setFiltroLinea] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Modales Departamento
  const [isModalCreateDeptoOpen, setIsModalCreateDeptoOpen] = useState(false);
  const [isModalEditDeptoOpen, setIsModalEditDeptoOpen] = useState(false);
  const [isModalDeleteDeptoOpen, setIsModalDeleteDeptoOpen] = useState(false);
  const [currentDepto, setCurrentDepto] = useState<Departamento | null>(null);
  const [formDeptoCodigo, setFormDeptoCodigo] = useState('');
  const [formDeptoNombre, setFormDeptoNombre] = useState('');
  const [formDeptoLineas, setFormDeptoLineas] = useState<number[]>([]);

  // Modales Tipo de Operación
  const [isModalCreateTipoOpen, setIsModalCreateTipoOpen] = useState(false);
  const [isModalEditTipoOpen, setIsModalEditTipoOpen] = useState(false);
  const [isModalDeleteTipoOpen, setIsModalDeleteTipoOpen] = useState(false);
  const [currentTipo, setCurrentTipo] = useState<TipoOperacion | null>(null);
  const [formTipoCodigo, setFormTipoCodigo] = useState('');
  const [formTipoNombre, setFormTipoNombre] = useState('');
  const [formTipoDescripcion, setFormTipoDescripcion] = useState('');

  // Modales Línea
  const [isModalCreateLineaOpen, setIsModalCreateLineaOpen] = useState(false);
  const [isModalEditLineaOpen, setIsModalEditLineaOpen] = useState(false);
  const [isModalDeleteLineaOpen, setIsModalDeleteLineaOpen] = useState(false);
  const [currentLinea, setCurrentLinea] = useState<Linea | null>(null);
  const [formLineaTipoId, setFormLineaTipoId] = useState<number | ''>('');
  const [formLineaCodigo, setFormLineaCodigo] = useState('');
  const [formLineaNombre, setFormLineaNombre] = useState('');
  const [formLineaDescripcion, setFormLineaDescripcion] = useState('');

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
          estado: filtroEstado || undefined,
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
  }, [filtroTipo, filtroLinea, filtroEstado]);

  // Handlers Departamento
  const openCreateDepto = () => {
    setFormDeptoCodigo('');
    setFormDeptoNombre('');
    setFormDeptoLineas([]);
    setFormError(null);
    setIsModalCreateDeptoOpen(true);
  };

  const openEditDepto = (depto: Departamento) => {
    setCurrentDepto(depto);
    setFormDeptoCodigo(depto.codigo);
    setFormDeptoNombre(depto.nombre);
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
    if (!formDeptoCodigo.trim() || !formDeptoNombre.trim()) {
      setFormError('Código y nombre son obligatorios');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createDepartamento({
        codigo: formDeptoCodigo.trim().toUpperCase(),
        nombre: formDeptoNombre.trim(),
        lineasIds: formDeptoLineas,
      });
      setIsModalCreateDeptoOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear departamento';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditDeptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDepto) return;
    if (!formDeptoCodigo.trim() || !formDeptoNombre.trim()) {
      setFormError('Código y nombre son obligatorios');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.updateDepartamento(currentDepto.id, {
        codigo: formDeptoCodigo.trim().toUpperCase(),
        nombre: formDeptoNombre.trim(),
        lineasIds: formDeptoLineas,
      });
      setIsModalEditDeptoOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar departamento';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleEstadoDepto = async (depto: Departamento) => {
    try {
      const nuevo = depto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await departamentosApi.updateEstadoDepartamento(depto.id, nuevo);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado de departamento';
      setError(msg);
    }
  };

  const handleDeleteDeptoConfirm = async () => {
    if (!currentDepto) return;
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.deleteDepartamento(currentDepto.id);
      setIsModalDeleteDeptoOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar departamento';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers Tipos
  const openCreateTipo = () => {
    setFormTipoCodigo('');
    setFormTipoNombre('');
    setFormTipoDescripcion('');
    setFormError(null);
    setIsModalCreateTipoOpen(true);
  };

  const openEditTipo = (tipo: TipoOperacion) => {
    setCurrentTipo(tipo);
    setFormTipoNombre(tipo.nombre);
    setFormTipoDescripcion(tipo.descripcion || '');
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
    if (!formTipoCodigo.trim() || !formTipoNombre.trim()) {
      setFormError('Código y nombre son obligatorios');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createTipoOperacion({
        codigo: formTipoCodigo.trim().toUpperCase(),
        nombre: formTipoNombre.trim(),
        descripcion: formTipoDescripcion.trim() || null,
      });
      setIsModalCreateTipoOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear tipo de operación';
      setFormError(msg);
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
        descripcion: formTipoDescripcion.trim() || null,
      });
      setIsModalEditTipoOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar tipo de operación';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleEstadoTipo = async (tipo: TipoOperacion) => {
    try {
      const nuevo = tipo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await departamentosApi.updateEstadoTipoOperacion(tipo.id, nuevo);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado de tipo';
      setError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar tipo de operación';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handlers Líneas
  const openCreateLinea = (tipoId: number) => {
    setFormLineaTipoId(tipoId);
    setFormLineaCodigo('');
    setFormLineaNombre('');
    setFormLineaDescripcion('');
    setFormError(null);
    setIsModalCreateLineaOpen(true);
  };

  const openEditLinea = (linea: Linea) => {
    setCurrentLinea(linea);
    setFormLineaNombre(linea.nombre);
    setFormLineaDescripcion(linea.descripcion || '');
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
    if (!formLineaTipoId || !formLineaCodigo.trim() || !formLineaNombre.trim()) {
      setFormError('Tipo, código y nombre son obligatorios');
      return;
    }
    try {
      setFormSubmitting(true);
      setFormError(null);
      await departamentosApi.createLinea({
        tipoOperacionId: Number(formLineaTipoId),
        codigo: formLineaCodigo.trim().toUpperCase(),
        nombre: formLineaNombre.trim(),
        descripcion: formLineaDescripcion.trim() || null,
      });
      setIsModalCreateLineaOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear línea';
      setFormError(msg);
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
        descripcion: formLineaDescripcion.trim() || null,
      });
      setIsModalEditLineaOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar línea';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleEstadoLinea = async (linea: Linea) => {
    try {
      const nuevo = linea.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
      await departamentosApi.updateEstadoLinea(linea.id, nuevo);
      await fetchAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar estado de línea';
      setError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar línea';
      setFormError(msg);
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
    <div className="space-y-6 p-4 md:p-6 bg-cuadra-arena/30 min-h-screen">
      {/* Header Unificado del Módulo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cuadra-oro/20 pb-4">
        <div>
          <h1 className="text-2xl font-bebas text-cuadra-cafe tracking-wide">
            Administración de Estructura y Departamentos
          </h1>
          <p className="text-xs text-cuadra-antracita/70 font-sans">
            Módulo centralizado para la configuración de Tipos de Operación, Líneas y Departamentos
          </p>
        </div>
      </div>

      {/* Tabs Principales del Módulo */}
      <div className="flex border-b border-cuadra-oro/20 gap-3">
        <button
          onClick={() => setActiveTab('jerarquia')}
          className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'jerarquia'
              ? 'border-cuadra-cafe text-cuadra-cafe'
              : 'border-transparent text-cuadra-antracita/60 hover:text-cuadra-cafe'
          }`}
        >
          <Icon name="account_tree" className="text-base" />
          <span>Estructura Operativa ({tiposOperacion.length} Tipos, {lineas.length} Líneas)</span>
        </button>

        <button
          onClick={() => setActiveTab('departamentos')}
          className={`pb-2 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'departamentos'
              ? 'border-cuadra-cafe text-cuadra-cafe'
              : 'border-transparent text-cuadra-antracita/60 hover:text-cuadra-cafe'
          }`}
        >
          <Icon name="domain" className="text-base" />
          <span>Departamentos ({departamentos.length})</span>
        </button>
      </div>

      {/* Alerta de Error General */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex justify-between items-center">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <Icon name="close" className="text-xs" />
          </Button>
        </div>
      )}

      {/* Contenido según Tab Activo */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Spinner size="36px" />
        </div>
      ) : activeTab === 'jerarquia' ? (
        <EstructuraOrganizacionalTree
          tipos={tiposOperacion}
          departamentos={departamentos}
          onOpenCreateTipo={openCreateTipo}
          onOpenEditTipo={openEditTipo}
          onToggleEstadoTipo={handleToggleEstadoTipo}
          onDeleteTipo={openDeleteTipo}
          onOpenCreateLinea={openCreateLinea}
          onOpenEditLinea={openEditLinea}
          onToggleEstadoLinea={handleToggleEstadoLinea}
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
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          onSearchSubmit={(e) => {
            e.preventDefault();
            fetchAllData();
          }}
          onOpenCreate={openCreateDepto}
          onOpenEdit={openEditDepto}
          onToggleEstado={handleToggleEstadoDepto}
          onOpenDelete={openDeleteDepto}
        />
      )}

      {/* MODALES DEPARTAMENTO */}
      <Modal isOpen={isModalCreateDeptoOpen} onClose={() => setIsModalCreateDeptoOpen(false)} className="max-w-lg">
        <ModalHeader title="Nuevo Departamento" onClose={() => setIsModalCreateDeptoOpen(false)} />
        <form onSubmit={handleCreateDeptoSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Código *
              </Label>
              <Input
                value={formDeptoCodigo}
                onChange={(e) => setFormDeptoCodigo(e.target.value)}
                placeholder="Ej. PRELIMINARES"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">
                Nombre *
              </Label>
              <Input
                value={formDeptoNombre}
                onChange={(e) => setFormDeptoNombre(e.target.value)}
                placeholder="Ej. Preliminares"
                required
              />
            </div>
            <div>
              <Label className="mb-2 block">
                Líneas Asociadas (Selección Múltiple)
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border/80 p-2.5 rounded-lg bg-app-surface">
                {lineas.map((linea) => (
                  <label key={linea.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:text-brand-primary">
                    <input
                      type="checkbox"
                      checked={formDeptoLineas.includes(linea.id)}
                      onChange={() => toggleDeptoLineaSelection(linea.id)}
                      className="rounded border-border text-brand-primary focus:ring-brand-accent"
                    />
                    <span>
                      {linea.nombre} ({linea.codigo})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalCreateDeptoOpen(false)} disabled={formSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="guardar" disabled={formSubmitting} icon={formSubmitting ? undefined : 'check_circle'}>
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

      <Modal isOpen={isModalEditDeptoOpen} onClose={() => setIsModalEditDeptoOpen(false)} className="max-w-lg">
        <ModalHeader title={`Editar Departamento: ${currentDepto?.nombre || ''}`} onClose={() => setIsModalEditDeptoOpen(false)} />
        <form onSubmit={handleEditDeptoSubmit}>
          <ModalBody className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                {formError}
              </div>
            )}
            <div>
              <Label className="mb-1 block">
                Código *
              </Label>
              <Input
                value={formDeptoCodigo}
                onChange={(e) => setFormDeptoCodigo(e.target.value)}
                placeholder="Ej. CORTE"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">
                Nombre *
              </Label>
              <Input
                value={formDeptoNombre}
                onChange={(e) => setFormDeptoNombre(e.target.value)}
                placeholder="Ej. Corte"
                required
              />
            </div>
            <div>
              <Label className="mb-2 block">
                Líneas Asociadas (Selección Múltiple)
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-border/80 p-2.5 rounded-lg bg-app-surface">
                {lineas.map((linea) => (
                  <label key={linea.id} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer hover:text-brand-primary">
                    <input
                      type="checkbox"
                      checked={formDeptoLineas.includes(linea.id)}
                      onChange={() => toggleDeptoLineaSelection(linea.id)}
                      className="rounded border-border text-brand-primary focus:ring-brand-accent"
                    />
                    <span>
                      {linea.nombre} ({linea.codigo})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="cancelar" onClick={() => setIsModalEditDeptoOpen(false)} disabled={formSubmitting}>
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

      <Modal isOpen={isModalDeleteDeptoOpen} onClose={() => setIsModalDeleteDeptoOpen(false)} className="max-w-md">
        <ModalHeader title="Eliminar Departamento" onClose={() => setIsModalDeleteDeptoOpen(false)} />
        <ModalBody className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {formError}
            </div>
          )}
          <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
            <div className="flex items-center gap-2 text-danger font-medium text-sm">
              <Icon name="warning" size="18px" />
              <span>Confirmación de Eliminación Lógica</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              ¿Está seguro de que desea eliminar el departamento{' '}
              <strong className="text-text-primary">{currentDepto?.nombre}</strong>?
            </p>
            <p className="text-xs text-text-muted">
              El departamento quedará inactivo. Sus inspecciones y relaciones pasadas conservarán trazabilidad histórica completa.
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
                Eliminando...
              </span>
            ) : (
              'Confirmar Eliminación'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODALES TIPO DE OPERACIÓN */}
      <Modal isOpen={isModalCreateTipoOpen} onClose={() => setIsModalCreateTipoOpen(false)} className="max-w-lg">
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
                Código *
              </Label>
              <Input
                value={formTipoCodigo}
                onChange={(e) => setFormTipoCodigo(e.target.value)}
                placeholder="Ej. PRODUCCION"
                required
              />
            </div>
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
            <div>
              <Label className="mb-1 block">
                Descripción
              </Label>
              <Input
                value={formTipoDescripcion}
                onChange={(e) => setFormTipoDescripcion(e.target.value)}
                placeholder="Descripción del tipo de operación..."
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

      <Modal isOpen={isModalEditTipoOpen} onClose={() => setIsModalEditTipoOpen(false)} className="max-w-lg">
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
            <div>
              <Label className="mb-1 block">
                Descripción
              </Label>
              <Input
                value={formTipoDescripcion}
                onChange={(e) => setFormTipoDescripcion(e.target.value)}
                placeholder="Descripción..."
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
      <Modal isOpen={isModalCreateLineaOpen} onClose={() => setIsModalCreateLineaOpen(false)} className="max-w-lg">
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
                className="w-full text-xs rounded border border-border/80 p-2.5 bg-app-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent"
                required
              >
                {tiposOperacion.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block">
                Código *
              </Label>
              <Input
                value={formLineaCodigo}
                onChange={(e) => setFormLineaCodigo(e.target.value)}
                placeholder="Ej. BOTA"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">
                Nombre *
              </Label>
              <Input
                value={formLineaNombre}
                onChange={(e) => setFormLineaNombre(e.target.value)}
                placeholder="Ej. Bota"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">
                Descripción
              </Label>
              <Input
                value={formLineaDescripcion}
                onChange={(e) => setFormLineaDescripcion(e.target.value)}
                placeholder="Descripción de la línea..."
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

      <Modal isOpen={isModalEditLineaOpen} onClose={() => setIsModalEditLineaOpen(false)} className="max-w-lg">
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
                Nombre *
              </Label>
              <Input
                value={formLineaNombre}
                onChange={(e) => setFormLineaNombre(e.target.value)}
                placeholder="Ej. Bota"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">
                Descripción
              </Label>
              <Input
                value={formLineaDescripcion}
                onChange={(e) => setFormLineaDescripcion(e.target.value)}
                placeholder="Descripción..."
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
