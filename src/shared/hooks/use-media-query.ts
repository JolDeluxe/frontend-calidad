import { useSyncExternalStore, useCallback } from 'react';

/**
 * Hook genérico para evaluar una media query CSS.
 * Usa useSyncExternalStore (estándar React 18/19) para suscripción reactiva
 * sin efectos secundarios síncronos ni re-renders en cascada.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};
      const matchMedia = window.matchMedia(query);
      matchMedia.addEventListener('change', callback);
      return () => matchMedia.removeEventListener('change', callback);
    },
    [query],
  );

  const getSnapshot = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Devuelve true cuando el viewport es ≥ 1024px (breakpoint lg de Tailwind).
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
