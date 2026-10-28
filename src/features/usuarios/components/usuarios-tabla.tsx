import { useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { HighlightText } from '@/features/inspecciones/components/highlight-text';
import type { UsuarioItem } from '../types/usuarios.types';

export interface UsuariosTablaProps {
  items: UsuarioItem[];
  busqueda?: string;
  isLoading?: boolean;
  totalItems?: number;
  verInactivos?: boolean;
  toolbar?: ReactNode;
  onEditar?: (usuario: UsuarioItem) => void;
  onDesactivar?: (usuario: UsuarioItem) => void;
  onReactivar?: (usuario: UsuarioItem) => void;
}

export function UsuariosTabla({
  items,
  busqueda = '',
  isLoading = false,
  totalItems = 0,
  verInactivos = false,
  toolbar,
  onEditar,
  onDesactivar,
  onReactivar,
}: UsuariosTablaProps) {
  // Estado para visibilidad individual de contraseña
  const [visiblesPasswordIds, setVisiblesPasswordIds] = useState<Record<number, boolean>>({});

  const togglePasswordVisibility = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblesPasswordIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!isLoading && items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-border flex flex-col w-full min-w-0">
        <table className="w-full text-left border-collapse table-fixed text-[11px] xl:text-xs">
          <thead className="sticky top-0 z-30 shadow-xs">
            {toolbar && (
              <tr className="bg-white border-b border-border/80">
                <th colSpan={6} className="p-2.5 xl:p-3 font-normal text-left bg-white rounded-t-xl">
                  {toolbar}
                </th>
              </tr>
            )}
            <tr className="bg-slate-100 border-b border-border text-text-secondary uppercase tracking-wider font-semibold text-2xs select-none">
              <th className="py-2 px-1.5 xl:px-2.5 w-[6%] text-center">No</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[42%] truncate">Nombre Completo</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[20%]">Rol</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[16%]">Contraseña</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[16%] text-center">Estado</th>
              <th className="py-2 px-1.5 xl:px-2 w-[75px] text-center">Acciones</th>
            </tr>
          </thead>
        </table>
        <div className="py-16 text-center text-text-muted space-y-3">
          <Icon name="person_off" size="48px" className="mx-auto text-slate-300" />
          <p className="text-sm font-medium">
            {verInactivos ? 'No hay usuarios en la papelera' : 'No se encontraron usuarios'}
          </p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {busqueda
              ? `No hay resultados que coincidan con "${busqueda}". Intente con otro término o filtro.`
              : verInactivos
              ? 'Todos los usuarios registrados en el sistema se encuentran activos.'
              : 'No hay usuarios activos registrados actualmente.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-border flex flex-col w-full min-w-0">
      <table className="w-full text-left border-collapse table-fixed text-[11px] xl:text-xs">
        <thead className="sticky top-0 z-30 shadow-xs">
          {toolbar && (
            <tr className="bg-white border-b border-border/80">
              <th colSpan={6} className="p-2.5 xl:p-3 font-normal text-left bg-white rounded-t-xl">
                {toolbar}
              </th>
            </tr>
          )}
          <tr className="bg-slate-100 border-b border-border text-text-secondary uppercase tracking-wider font-semibold text-2xs select-none">
            <th className="py-2 px-1.5 xl:px-2.5 w-[6%] text-center">No</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[42%] truncate">Nombre Completo</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[20%]">Rol</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[16%]">Contraseña</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[16%] text-center">Estado</th>
            <th className="py-2 px-1.5 xl:px-2 w-[75px] text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <TableRowsSkeleton columns={6} rows={8} />
          ) : (
            items.map((usr, index) => {
              const isPasswordVisible = Boolean(visiblesPasswordIds[usr.id]);

              return (
                <tr
                  key={usr.id}
                  onClick={() => onEditar?.(usr)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Número */}
                  <td className="py-2 px-1.5 xl:px-2.5 text-center text-text-muted font-mono text-[11px]">
                    {index + 1}
                  </td>

                  {/* Nombre Completo */}
                  <td className="py-2 px-1.5 xl:px-2.5 font-medium text-text-primary truncate">
                    <HighlightText text={usr.nombre} highlight={busqueda} />
                  </td>

                  {/* Rol */}
                  <td className="py-2 px-1.5 xl:px-2.5 truncate">
                    <span className="font-bold text-slate-800 text-xs">
                      {usr.rol.nombre}
                    </span>
                  </td>

                  {/* Contraseña con botón ojo para ver/ocultar */}
                  <td
                    className="py-2 px-1.5 xl:px-2.5 font-mono text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 tracking-wider">
                        {isPasswordVisible ? usr.password || '••••••' : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => togglePasswordVisibility(usr.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isPasswordVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        <Icon
                          name={isPasswordVisible ? 'visibility_off' : 'visibility'}
                          size="14px"
                        />
                      </button>
                    </div>
                  </td>

                  {/* Estado (Indicador limpio punto + texto) */}
                  <td className="py-2 px-1.5 xl:px-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          usr.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span
                        className={
                          usr.estado === 'ACTIVO' ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {usr.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      </span>
                    </span>
                  </td>

                  {/* Acciones directas: Editar y Desactivar/Reactivar sin menú de 3 puntos */}
                  <td
                    className="py-2 px-1.5 xl:px-2 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {/* Botón Editar */}
                      <button
                        type="button"
                        onClick={() => onEditar?.(usr)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-brand-primary hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar usuario"
                      >
                        <Icon name="edit" size="15px" />
                      </button>

                      {/* Botón Eliminar / Reactivar */}
                      {usr.estado === 'ACTIVO' ? (
                        <button
                          type="button"
                          onClick={() => onDesactivar?.(usr)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Desactivar cuenta"
                        >
                          <Icon name="delete" size="15px" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReactivar?.(usr)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Reactivar cuenta"
                        >
                          <Icon name="restore" size="15px" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-app-surface text-xs rounded-b-xl">
        <span className="text-text-secondary">
          Mostrando <strong className="text-text-primary font-bold">{items.length}</strong> de{' '}
          <strong className="text-text-primary font-bold">{totalItems || items.length}</strong> {verInactivos ? 'usuarios inactivos' : 'usuarios activos'}
        </span>
      </div>
    </div>
  );
}
