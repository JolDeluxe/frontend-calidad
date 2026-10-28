import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { ToastContainer } from '@/components/ui/toast';

/**
 * Ensamble jerárquico de todos los proveedores de contexto globales.
 * Centraliza los providers en un único punto ordenado y evita el anidamiento excesivo en app.tsx.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastContainer />
    </AuthProvider>
  );
}
