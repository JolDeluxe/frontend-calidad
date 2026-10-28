import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { usuariosApi } from '../api/usuarios-api';
import { UsuariosTabla } from '../components/usuarios-tabla';
import { UsuarioFormModal } from '../components/usuario-form-modal';
import { UsuarioDeleteModal } from '../components/usuario-delete-modal';
import type {
  UsuarioItem,
  UsuarioRol,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types/usuarios.types';

export function UsuariosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros desde la URL
  const busquedaParam = searchParams.get('q') || '';
  const rolParam = searchParams.get('rol') || '';
  const verInactivos = searchParams.get('inactivos') === 'true';

  const [inputBusqueda, setInputBusqueda] = useState(busquedaParam);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [roles, setRoles] = useState<UsuarioRol[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState<UsuarioItem | null>(null);

  const [modalDeleteAbierto, setModalDeleteAbierto] = useState(false);
  const [usuarioADesactivar, setUsuarioADesactivar] = useState<UsuarioItem | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar datos iniciales
  const cargarDatos = async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData] = await Promise.all([
        usuariosApi.getUsers(),
        usuariosApi.getRoles(),
      ]);
      setUsuarios(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error al cargar usuarios o roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Sincronizar input local si cambia en la URL
  useEffect(() => {
    setInputBusqueda(busquedaParam);
  }, [busquedaParam]);

  // Manejador de búsqueda con debounce
  const handleBusquedaChange = (texto: string) => {
    setInputBusqueda(texto);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (texto.trim()) {
          next.set('q', texto.trim());
        } else {
          next.delete('q');
        }
        return next;
      });
    }, 280);
  };

  // Manejador de cambio de filtro de rol
  const handleFiltroRolChange = (nuevoRol: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nuevoRol) {
        next.set('rol', nuevoRol);
      } else {
        next.delete('rol');
      }
      return next;
    });
  };

  // Toggle para ver inactivos (Papelera)
  const handleToggleInactivos = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!verInactivos) {
        next.set('inactivos', 'true');
      } else {
        next.delete('inactivos');
      }
      return next;
    });
  };

  // Jerarquía de orden solicitada:
  // 1. SUPER ADMIN, 2. ADMIN, 3. COORDINADOR, 4. INSPECTOR, 5. VISUALIZADOR
  const jerarquiaRoles: Record<string, number> = {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    COORD: 3,
    INSPECTOR: 4,
    VISUALIZADOR: 5,
  };

  // Filtrado y ordenamiento de usuarios
  const usuariosFiltrados = useMemo(() => {
    const filtrados = usuarios.filter((u) => {
      // Por defecto solo ACTIVOS; si verInactivos está activo, solo INACTIVOS
      if (verInactivos) {
        if (u.estado !== 'INACTIVO') return false;
      } else {
        if (u.estado !== 'ACTIVO') return false;
      }

      // Filtro texto: busca en usuario y nombre
      if (busquedaParam) {
        const q = busquedaParam.toLowerCase();
        const coincideUsuario = u.usuario.toLowerCase().includes(q);
        const coincideNombre = u.nombre.toLowerCase().includes(q);
        if (!coincideUsuario && !coincideNombre) return false;
      }

      // Filtro rol
      if (rolParam && u.rol.codigo !== rolParam) {
        return false;
      }

      return true;
    });

    return filtrados.sort((a, b) => {
      const ordenA = jerarquiaRoles[a.rol.codigo] || 99;
      const ordenB = jerarquiaRoles[b.rol.codigo] || 99;
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [usuarios, busquedaParam, rolParam, verInactivos]);

  // Conteos
  const totalActivos = useMemo(() => usuarios.filter((u) => u.estado === 'ACTIVO').length, [usuarios]);
  const totalInactivos = useMemo(() => usuarios.filter((u) => u.estado === 'INACTIVO').length, [usuarios]);

  // Conteo visible en la cabecera
  const totalConteoCabecera = verInactivos ? totalInactivos : totalActivos;
  const textoConteoCabecera = verInactivos
    ? `${totalInactivos} ${totalInactivos === 1 ? 'inactivo' : 'inactivos'}`
    : `${totalActivos} ${totalActivos === 1 ? 'usuario activo' : 'usuarios activos'}`;

  // Handlers para Modales de Acción
  const handleCrearUsuario = () => {
    setUsuarioAEditar(null);
    setModalFormAbierto(true);
  };

  const handleEditarUsuario = (usuario: UsuarioItem) => {
    setUsuarioAEditar(usuario);
    setModalFormAbierto(true);
  };

  const handleDesactivarUsuario = (usuario: UsuarioItem) => {
    setUsuarioADesactivar(usuario);
    setModalDeleteAbierto(true);
  };

  const handleReactivarUsuario = async (usuario: UsuarioItem) => {
    try {
      await usuariosApi.updateUser(usuario.id, { estado: 'ACTIVO' });
      await cargarDatos();
      toast.success(`Usuario "${usuario.nombre}" reactivado exitosamente`);
    } catch (error: any) {
      console.error('Error al reactivar usuario:', error);
      toast.error(error.message || 'Error al reactivar usuario');
    }
  };

  const handleSubmitCreate = async (payload: CreateUserPayload) => {
    try {
      await usuariosApi.createUser(payload);
      await cargarDatos();
      toast.success(`Usuario "${payload.nombre}" creado exitosamente`);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
      throw error;
    }
  };

  const handleSubmitUpdate = async (id: number, payload: UpdateUserPayload) => {
    try {
      await usuariosApi.updateUser(id, payload);
      await cargarDatos();
      toast.success('Usuario actualizado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar usuario');
      throw error;
    }
  };

  const handleConfirmDelete = async (usuario: UsuarioItem) => {
    try {
      await usuariosApi.deleteUser(usuario.id);
      await cargarDatos();
      toast.success(`Usuario "${usuario.nombre}" desactivado exitosamente`);
    } catch (error: any) {
      toast.error(error.message || 'Error al desactivar usuario');
      throw error;
    }
  };

  // Barra de herramientas integrada (Toolbar)
  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
      {/* Lado izquierdo: Buscador y Filtro de Rol */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Buscador */}
        <div className="relative w-56 sm:w-64 shrink-0">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por usuario o nombre..."
            value={inputBusqueda}
            onChange={(e) => handleBusquedaChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
          />
          {inputBusqueda && (
            <button
              type="button"
              onClick={() => handleBusquedaChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <Icon name="close" size="14px" />
            </button>
          )}
        </div>

        {/* Selector de Rol */}
        <div className="shrink-0">
          <select
            value={rolParam}
            onChange={(e) => handleFiltroRolChange(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-40"
            title="Filtrar por rol de usuario"
          >
            <option value="">Todos los Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.codigo}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {(busquedaParam || rolParam) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setInputBusqueda('');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('q');
                next.delete('rol');
                return next;
              });
            }}
            className="h-8 text-xs px-2 text-text-muted hover:text-danger cursor-pointer"
          >
            <Icon name="filter_alt_off" size="14px" className="mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Lado derecho: Botón Papelera al final de los filtros */}
      <div className="shrink-0 flex items-center">
        <button
          type="button"
          onClick={handleToggleInactivos}
          title={
            verInactivos
              ? 'Papelera: Viendo usuarios inactivos (Click para volver a activos)'
              : 'Papelera: Ver usuarios inactivos'
          }
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
            verInactivos
              ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
              : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Icon name="delete" size="18px" className={verInactivos ? 'text-rose-600' : 'text-slate-400'} />
          {verInactivos && <span>Inactivos ({totalInactivos})</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal: Título y Contador a la izquierda, NUEVO USUARIO arriba a la derecha */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            GESTIÓN DE USUARIOS
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              verInactivos
                ? 'bg-rose-100 text-rose-800'
                : 'bg-brand-primary/10 text-brand-primary'
            }`}
          >
            {textoConteoCabecera}
          </span>
        </div>

        {/* Botón NUEVO USUARIO por fuera y arriba a la derecha */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleCrearUsuario}
            className="h-9 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer bg-brand-primary hover:bg-brand-primary-hover text-white flex items-center"
          >
            <Icon name="add" size="18px" />
            <span>Nuevo Usuario</span>
          </Button>
        </div>
      </div>

      {/* Tabla Principal con filtros en Toolbar */}
      <UsuariosTabla
        items={usuariosFiltrados}
        busqueda={busquedaParam}
        isLoading={isLoading}
        totalItems={totalConteoCabecera}
        verInactivos={verInactivos}
        toolbar={toolbar}
        onEditar={handleEditarUsuario}
        onDesactivar={handleDesactivarUsuario}
        onReactivar={handleReactivarUsuario}
      />

      {/* Modales */}
      <UsuarioFormModal
        isOpen={modalFormAbierto}
        onClose={() => {
          setModalFormAbierto(false);
          setUsuarioAEditar(null);
        }}
        usuarioAEditar={usuarioAEditar}
        roles={roles}
        onSubmitCreate={handleSubmitCreate}
        onSubmitUpdate={handleSubmitUpdate}
      />

      <UsuarioDeleteModal
        isOpen={modalDeleteAbierto}
        onClose={() => {
          setModalDeleteAbierto(false);
          setUsuarioADesactivar(null);
        }}
        usuario={usuarioADesactivar}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
