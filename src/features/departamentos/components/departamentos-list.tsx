import { type ReactNode } from 'react';
import type { Departamento, Linea, TipoOperacion } from '../types/departamentos.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';

interface DepartamentosListProps {
  departamentos: Departamento[];
  lineas: Linea[];
  tiposOperacion: TipoOperacion[];
  filtroTexto: string;
  setFiltroTexto: (val: string) => void;
  filtroTipo: string;
  setFiltroTipo: (val: string) => void;
  filtroLinea: string;
  setFiltroLinea: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onOpenCreate: () => void;
  onOpenEdit: (depto: Departamento) => void;
  onToggleEstado: (depto: Departamento) => void;
  onOpenDelete: (depto: Departamento) => void;
}

export function DepartamentosList({
  departamentos,
  lineas,
  tiposOperacion,
  filtroTexto,
  setFiltroTexto,
  filtroTipo,
  setFiltroTipo,
  filtroLinea,
  setFiltroLinea,
  filtroEstado,
  setFiltroEstado,
  onSearchSubmit,
  onOpenCreate,
  onOpenEdit,
  onToggleEstado,
  onOpenDelete,
}: DepartamentosListProps): ReactNode {
  return (
    <div className="space-y-4">
      {/* Barra de Acciones y Filtros */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-cuadra-oro/20 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-cuadra-cafe">Catálogo de Departamentos</h2>
            <p className="text-xs text-cuadra-antracita/70">
              Departamentos asignados a líneas y tipos de operación
            </p>
          </div>
          <Button onClick={onOpenCreate} size="sm" className="flex items-center gap-1">
            <Icon name="add" />
            <span>Nuevo Departamento</span>
          </Button>
        </div>

        {/* Formulario de Filtros */}
        <form
          onSubmit={onSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-cuadra-oro/10"
        >
          <div>
            <label className="text-xs font-semibold text-cuadra-cafe uppercase mb-1 block">
              Búsqueda
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Código o nombre..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm">
                <Icon name="search" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-cuadra-cafe uppercase mb-1 block">
              Tipo de Operación
            </label>
            <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {tiposOperacion.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.codigo})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-cuadra-cafe uppercase mb-1 block">
              Línea
            </label>
            <Select value={filtroLinea} onChange={(e) => setFiltroLinea(e.target.value)}>
              <option value="">Todas las líneas</option>
              {lineas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.codigo})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-cuadra-cafe uppercase mb-1 block">
              Estado
            </label>
            <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </Select>
          </div>
        </form>
      </div>

      {/* Tabla de Departamentos */}
      {departamentos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-cuadra-oro/20 text-xs text-cuadra-antracita/60">
          No se encontraron departamentos con los filtros aplicados.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-cuadra-oro/20 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cuadra-arena/40 text-cuadra-cafe font-semibold border-b border-cuadra-oro/20">
                <th className="p-3">Código</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Líneas Asociadas</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cuadra-oro/10">
              {departamentos.map((depto) => (
                <tr key={depto.id} className="hover:bg-cuadra-arena/20 transition-colors">
                  <td className="p-3 font-mono font-bold text-cuadra-cafe">{depto.codigo}</td>
                  <td className="p-3 font-medium text-cuadra-antracita">{depto.nombre}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {depto.lineasAsociadas && depto.lineasAsociadas.length > 0 ? (
                        depto.lineasAsociadas.map((asoc) => (
                          <span
                            key={asoc.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cuadra-oro/10 text-cuadra-cafe border border-cuadra-oro/30"
                          >
                            {asoc.linea?.nombre || `Línea ${asoc.lineaId}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-cuadra-antracita/40 italic">Sin líneas</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusBadge estadoRegistro={depto.estado} />
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleEstado(depto)}
                      title={depto.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                    >
                      <Icon
                        name={depto.estado === 'ACTIVO' ? 'toggle_on' : 'toggle_off'}
                        className={`text-base ${
                          depto.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenEdit(depto)}
                      title="Editar departamento"
                    >
                      <Icon name="edit" className="text-sm" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDelete(depto)}
                      className="text-red-600"
                      title="Eliminar departamento"
                    >
                      <Icon name="delete" className="text-sm" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
