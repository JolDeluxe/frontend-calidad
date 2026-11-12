import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import {
  terminalesApi,
  type SuperAdminItem,
  type VerificarAutorizacionSuperAdminResult,
} from '../api/terminales-api';

export interface SuperAdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  accion: string;
  tituloAccion?: string;
  descripcionAccion?: string;
  terminalId?: number;
  onAuthorized: (resultado: VerificarAutorizacionSuperAdminResult) => void;
}

export function SuperAdminAuthModal({
  isOpen,
  onClose,
  accion,
  tituloAccion = 'Autorización de Super Administrador',
  descripcionAccion = 'Esta operación de contingencia requiere la contraseña presencial de un Super Administrador.',
  terminalId,
  onAuthorized,
}: SuperAdminAuthModalProps) {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminItem[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [motivo, setMotivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setMotivo('');
      return;
    }

    const cargarSuperAdmins = async () => {
      try {
        setCargando(true);
        const lista = await terminalesApi.getSuperAdmins();
        setSuperAdmins(lista);
        if (lista.length === 1) {
          setSeleccionadoId(lista[0].id);
        } else if (lista.length > 1) {
          setSeleccionadoId(lista[0].id);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Error al consultar lista de Super Administradores');
      } finally {
        setCargando(false);
      }
    };

    void cargarSuperAdmins();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleccionadoId || !password.trim()) {
      toast.error('Debe seleccionar un Super Administrador e ingresar su contraseña');
      return;
    }

    try {
      setVerificando(true);
      const resultado = await terminalesApi.verificarAutorizacionSuperAdmin({
        superAdminId: Number(seleccionadoId),
        password: password.trim(),
        accion,
        motivo: motivo.trim() || undefined,
        terminalId,
      });

      toast.success('Autorización de Super Administrador confirmada');
      onAuthorized(resultado);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Contraseña de Super Administrador inválida');
    } finally {
      setVerificando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <ModalHeader title={tituloAccion} onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4 pt-1 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Icon name="security" size="18px" className="text-amber-700 shrink-0" />
              <span>Control de Seguridad Presencial</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">{descripcionAccion}</p>
          </div>

          {cargando ? (
            <div className="py-6 text-center text-slate-500">
              <Icon name="progress_activity" size="20px" className="animate-spin mx-auto mb-1 text-slate-400" />
              <span>Cargando Super Administradores...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {superAdmins.length > 1 ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Super Administrador Autorizador *
                  </label>
                  <select
                    required
                    value={seleccionadoId}
                    onChange={(e) => setSeleccionadoId(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  >
                    {superAdmins.map((sa) => (
                      <option key={sa.id} value={sa.id}>
                        {sa.nombre} ({sa.usuario})
                      </option>
                    ))}
                  </select>
                </div>
              ) : superAdmins.length === 1 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Super Administrador Autorizador:
                  </span>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                    <Icon name="verified_user" size="14px" className="text-brand-accent" />
                    {superAdmins[0].nombre} ({superAdmins[0].usuario})
                  </span>
                </div>
              ) : (
                <div className="p-2 text-rose-700 bg-rose-50 border border-rose-200 rounded text-xs">
                  No se encontraron Super Administradores activos en el sistema.
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Contraseña de Super Administrador *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Ingrese contraseña de Super Administrador..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Motivo de la Autorización (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Desvinculación de PC averiada en planta..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={verificando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={verificando || cargando || superAdmins.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {verificando ? 'Validando...' : 'Autorizar y Continuar'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
