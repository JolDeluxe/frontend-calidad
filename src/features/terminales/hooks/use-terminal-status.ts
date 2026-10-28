import { useState, useEffect, useCallback } from 'react';
import { terminalesApi } from '../api/terminales-api';
import { terminalStorage, type TerminalPublicInfo } from '../services/terminal-storage';

export type TerminalBindingState = 'cargando' | 'vinculada' | 'no_vinculada' | 'error_conexion';

export interface UseTerminalStatusResult {
  estado: TerminalBindingState;
  terminal: TerminalPublicInfo | null;
  errorMensaje: string | null;
  recargar: () => Promise<void>;
  desvincular: () => void;
  vincularConCredencial: (credencial: string) => Promise<boolean>;
}

export function useTerminalStatus(): UseTerminalStatusResult {
  const [estado, setEstado] = useState<TerminalBindingState>('cargando');
  const [terminal, setTerminal] = useState<TerminalPublicInfo | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    const credencialLocal = terminalStorage.getCredential();
    if (!credencialLocal) {
      setEstado('no_vinculada');
      setTerminal(null);
      setErrorMensaje('Esta estación de trabajo no tiene una terminal vinculada.');
      return;
    }

    try {
      setEstado('cargando');
      setErrorMensaje(null);
      const res = await terminalesApi.consultarEstado();
      if (res.vinculada && res.terminal) {
        setEstado('vinculada');
        setTerminal(res.terminal);
      } else {
        setEstado('no_vinculada');
        setTerminal(null);
        setErrorMensaje('La credencial de esta terminal ha sido revocada o es inválida.');
      }
    } catch (err: any) {
      setEstado('error_conexion');
      setTerminal(null);
      setErrorMensaje(
        err.message || 'No se pudo verificar el estado de la estación de trabajo física.',
      );
    }
  }, []);

  useEffect(() => {
    consultar();

    const handleTerminalChanged = () => {
      consultar();
    };

    window.addEventListener('terminal:changed', handleTerminalChanged);
    return () => {
      window.removeEventListener('terminal:changed', handleTerminalChanged);
    };
  }, [consultar]);

  const desvincular = useCallback(() => {
    terminalStorage.removeCredential();
    setTerminal(null);
    setEstado('no_vinculada');
    setErrorMensaje('Estación desvinculada localmente.');
  }, []);

  const vincularConCredencial = useCallback(async (credencial: string): Promise<boolean> => {
    terminalStorage.setCredential(credencial);
    try {
      const res = await terminalesApi.consultarEstado();
      if (res.vinculada && res.terminal) {
        setEstado('vinculada');
        setTerminal(res.terminal);
        setErrorMensaje(null);
        return true;
      } else {
        terminalStorage.removeCredential();
        setEstado('no_vinculada');
        setTerminal(null);
        setErrorMensaje('La credencial provista no es válida o la terminal se encuentra inactiva.');
        return false;
      }
    } catch (err: any) {
      terminalStorage.removeCredential();
      setEstado('error_conexion');
      setTerminal(null);
      setErrorMensaje(err.message || 'Error de conexión al verificar la credencial provista.');
      return false;
    }
  }, []);

  return {
    estado,
    terminal,
    errorMensaje,
    recargar: consultar,
    desvincular,
    vincularConCredencial,
  };
}
