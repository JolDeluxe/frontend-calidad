import { useContext } from 'react';
import { LayoutUIContext, type LayoutUIState } from './layout-ui-context';

export function useLayoutUI(): LayoutUIState {
  const ctx = useContext(LayoutUIContext);
  if (!ctx) {
    throw new Error('useLayoutUI debe usarse dentro de <LayoutUIProvider>');
  }
  return ctx;
}
