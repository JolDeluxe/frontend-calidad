import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { UsuarioItem, UsuarioRol, CreateUserPayload, UpdateUserPayload } from '../types/usuarios.types';

export interface UsuarioFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioAEditar?: UsuarioItem | null;
  roles: UsuarioRol[];
  onSubmitCreate: (data: CreateUserPayload) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateUserPayload) => Promise<void>;
}

export function UsuarioFormModal({
  isOpen,
  onClose,
  usuarioAEditar,
  roles,
  onSubmitCreate,
  onSubmitUpdate,
}: UsuarioFormModalProps) {
  const isEditing = Boolean(usuarioAEditar);

  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rolId, setRolId] = useState<number | ''>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estados
  useEffect(() => {
    if (usuarioAEditar) {
      setNombre(usuarioAEditar.nombre);
      setPassword(usuarioAEditar.password || '');
      setShowPassword(false);
      setRolId(usuarioAEditar.rol.id);
    } else {
      setNombre('');
      setPassword('');
      setShowPassword(false);
      setRolId(roles.length > 0 ? roles[0].id : '');
    }
    setError(null);
  }, [usuarioAEditar, roles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (!rolId) {
      setError('Debe seleccionar un rol para el usuario.');
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (isEditing && password && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && usuarioAEditar) {
        await onSubmitUpdate(usuarioAEditar.id, {
          nombre: nombre.trim(),
          ...(password ? { password } : {}),
          rolId: Number(rolId),
        });
      } else {
        await onSubmitCreate({
          nombre: nombre.trim(),
          password,
          rolId: Number(rolId),
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar usuario';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <ModalHeader
        title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
        onClose={onClose}
      />
      {/* autoComplete="off" para evitar que el navegador auto-complete campos */}
      <form onSubmit={handleSubmit} autoComplete="off">
        {/* Inputs trampa invisibles para absorber el autofill de Google Chrome / Edge */}
        <input type="text" name="fake_username_prevent_autofill" className="hidden" tabIndex={-1} autoComplete="off" />
        <input type="password" name="fake_password_prevent_autofill" className="hidden" tabIndex={-1} autoComplete="off" />

        <ModalBody className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <Icon name="error" size="16px" className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre Completo */}
          <div className="space-y-1.5">
            <Label htmlFor="usr-nombre" className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Nombre Completo *
            </Label>
            <Input
              id="usr-nombre"
              name="usuario_nombre_real"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y Apellidos"
              disabled={isSubmitting}
              className="h-10 rounded-xl text-xs"
              autoComplete="off"
              required
            />
          </div>

          {/* Contraseña con toggle para ver/ocultar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="usr-pass" className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                {isEditing ? 'Contraseña' : 'Contraseña *'}
              </Label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                tabIndex={-1}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="14px" />
                <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
              </button>
            </div>
            <div className="relative">
              <Input
                id="usr-pass"
                name="usuario_nuevo_password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? 'Dejar en blanco si no desea cambiarla' : 'Mínimo 6 caracteres'}
                disabled={isSubmitting}
                className="h-10 rounded-xl font-mono text-xs pr-10"
                autoComplete="new-password"
                required={!isEditing}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                tabIndex={-1}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} size="16px" />
              </button>
            </div>
          </div>

          {/* Rol del Sistema */}
          <div className="space-y-1.5">
            <Label htmlFor="usr-rol" className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Rol del Sistema *
            </Label>
            <Select
              id="usr-rol"
              value={rolId}
              onChange={(e) => setRolId(Number(e.target.value))}
              disabled={isSubmitting}
              className="h-10 rounded-xl text-xs"
              required
            >
              <option value="" disabled>Seleccione un rol...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 text-xs px-4"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="h-9 text-xs px-5 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Spinner size="xs" />
                <span>Guardando...</span>
              </span>
            ) : isEditing ? (
              'Actualizar Usuario'
            ) : (
              'Crear Usuario'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
