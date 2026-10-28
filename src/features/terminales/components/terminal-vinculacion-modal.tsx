import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { terminalesApi } from '../api/terminales-api';
import { terminalStorage } from '../services/terminal-storage';

export interface TerminalVinculacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TerminalVinculacionModal({
  isOpen,
  onClose,
  onSuccess,
}: TerminalVinculacionModalProps) {
  const [codigoOtp, setCodigoOtp] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCanjear = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigoLimpio = codigoOtp.trim();

    if (!/^\d{6}$/.test(codigoLimpio)) {
      setError('El código de recuperación debe contener exactamente 6 dígitos numéricos.');
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const res = await terminalesApi.canjearRecuperacion(codigoLimpio);
      if (res && res.credencial) {
        // Almacenar credencial de terminal en el cliente
        terminalStorage.setCredential(res.credencial);
        setCodigoOtp('');
        toast.success(`Estación ${res.terminal?.nombre || 'de trabajo'} vinculada exitosamente.`, {
          title: 'Terminal Vinculada',
        });
        onSuccess();
        onClose();
      } else {
        throw new Error('Respuesta incompleta del servidor al canjear el código.');
      }
    } catch (err: any) {
      const msg = err.message || 'Error al validar el código OTP. Verifique que no haya expirado ni excedido los intentos.';
      setError(msg);
      toast.error(msg, { title: 'Fallo de Vinculación' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader
        title="Vincular Terminal Física de Planta"
        onClose={onClose}
      />
      <form onSubmit={handleCanjear}>
        <ModalBody className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 bg-app-surface-muted rounded-lg border border-border">
            <Icon name="phonelink_setup" className="text-primary text-2xl shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary leading-relaxed">
              Para registrar inspecciones desde esta computadora, un <strong>SUPER_ADMIN</strong> debe generar un código de recuperación temporal de 6 dígitos desde el panel de control.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Código de Recuperación OTP (6 dígitos)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              placeholder="000000"
              value={codigoOtp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCodigoOtp(val);
                if (error) setError(null);
              }}
              disabled={cargando}
              autoFocus
              className="w-full h-14 text-center tracking-[0.5em] text-3xl font-mono font-bold bg-app-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
            <p className="text-[11px] text-text-muted">
              El código es de un solo uso y cuenta con 24 horas de vigencia.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-status-danger/10 border border-status-danger/20 rounded-lg flex items-start gap-2 text-xs text-status-danger">
              <Icon name="error" className="text-base shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={cargando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={cargando || codigoOtp.length !== 6}
            className="min-w-[130px]"
          >
            {cargando ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Validando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Icon name="check" className="text-sm" />
                <span>Vincular PC</span>
              </span>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
