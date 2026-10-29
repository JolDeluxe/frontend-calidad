import { useState, useEffect, useCallback } from 'react';
import { terminalesApi } from '../api/terminales-api';
import { terminalStorage, type TerminalPublicInfo } from '../services/terminal-storage';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';

export type TerminalBindingState = 'cargando' | 'vinculada' | 'no_vinculada' | 'error_conexion';

export interface UseTerminalStatusResult {
  estado: TerminalBindingState;
  terminal: TerminalPublicInfo | null;
  esOffline: boolean;
  errorMensaje: string | null;
  recargar: () => Promise<void>;
  desvincular: () => void;
  vincularConCredencial: (credencial: string) => Promise<boolean>;
}

export function useTerminalStatus(): UseTerminalStatusResult {
  const [estado, setEstado] = useState<TerminalBindingState>('cargando');
  const [terminal, setTerminal] = useState<TerminalPublicInfo | null>(null);
  const [esOffline, setEsOffline] = useState<boolean>(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    const credencialLocal = terminalStorage.getCredential();
    if (!credencialLocal) {
      setEstado('no_vinculada');
      setTerminal(null);
      setEsOffline(false);
      setErrorMensaje('Esta estación de trabajo no tiene una terminal vinculada.');
      return;
    }

    const resolverPerfilCacheLocal = async (fallbackErr?: string) => {
      const cachedProfile = await terminalStorage.getProfileFromIdb();
      if (cachedProfile) {
        setEstado('vinculada');
        setEsOffline(true);
        setTerminal({
          id: cachedProfile.terminalId,
          nombre: cachedProfile.nombre,
          departamentoId: cachedProfile.departamentoId,
          departamentoCodigo: cachedProfile.departamentoCodigo,
          departamentoNombre: cachedProfile.departamentoNombre,
          numeroLineas:
            cachedProfile.numeroLineas ??
            (cachedProfile.departamentoCodigo === 'MONTADO' ? 2 : 1),
          estado: 'ACTIVO',
        });
        setErrorMensaje(null);
      } else {
        setEstado('error_conexion');
        setTerminal(null);
        setEsOffline(true);
        setErrorMensaje(
          fallbackErr || 'No se pudo verificar el estado de la estación de trabajo física.',
        );
      }
    };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await resolverPerfilCacheLocal();
      return;
    }

    try {
      setEstado('cargando');
      setErrorMensaje(null);
      const res = await terminalesApi.consultarEstado();
      if (res.vinculada && res.terminal) {
        setEstado('vinculada');
        setTerminal(res.terminal);
        setEsOffline(false);
        await terminalStorage.saveProfileToIdb(res.terminal);
        void catalogoOfflineService.sincronizarTodoEnBackground(res.terminal);
      } else {
        // La credencial local fue rechazada por el servidor (revocada o inválida).
        // Limpiamos los datos locales para evitar inconsistencias de estado.
        terminalStorage.removeCredential();
        setEstado('no_vinculada');
        setTerminal(null);
        setEsOffline(false);
        setErrorMensaje('La credencial de esta terminal ha sido revocada o es inválida.');
      }
    } catch (err: any) {
      // Si falla la red, verificar si contamos con un perfil de terminal válido en IndexedDB
      await resolverPerfilCacheLocal(err?.message);
    }
  }, []);

  useEffect(() => {
    void consultar();

    const handleTerminalChanged = () => {
      void consultar();
    };
    const handleOnline = () => {
      void consultar();
    };

    window.addEventListener('terminal:changed', handleTerminalChanged);
    window.addEventListener('online', handleOnline);
    window.addEventListener('backend:reachable', handleOnline);
    return () => {
      window.removeEventListener('terminal:changed', handleTerminalChanged);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('backend:reachable', handleOnline);
    };
  }, [consultar]);

  const desvincular = useCallback(() => {
    terminalStorage.removeCredential();
    setTerminal(null);
    setEsOffline(false);
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
        setEsOffline(false);
        setErrorMensaje(null);
        await terminalStorage.saveProfileToIdb(res.terminal);
        void catalogoOfflineService.sincronizarTodoEnBackground(res.terminal);
        return true;
      } else {
        terminalStorage.removeCredential();
        setEstado('no_vinculada');
        setTerminal(null);
        setEsOffline(false);
        setErrorMensaje('La credencial provista no es válida o la terminal se encuentra inactiva.');
        return false;
      }
    } catch (err: any) {
      terminalStorage.removeCredential();
      setEstado('error_conexion');
      setTerminal(null);
      setEsOffline(true);
      setErrorMensaje(err?.message || 'Error de conexión al verificar la credencial provista.');
      return false;
    }
  }, []);

  return {
    estado,
    terminal,
    esOffline,
    errorMensaje,
    recargar: consultar,
    desvincular,
    vincularConCredencial,
  };
}
