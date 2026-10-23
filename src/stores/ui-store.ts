import { useSyncExternalStore } from 'react';

interface UIState {
  sidebarExpanded: boolean;
  mobileMenuOpen: boolean;
}

let state: UIState = {
  sidebarExpanded: true,
  mobileMenuOpen: false,
};

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const uiStore = {
  getState: () => state,
  toggleSidebar: () => {
    state = { ...state, sidebarExpanded: !state.sidebarExpanded };
    emitChange();
  },
  setSidebarExpanded: (expanded: boolean) => {
    state = { ...state, sidebarExpanded: expanded };
    emitChange();
  },
  toggleMobileMenu: () => {
    state = { ...state, mobileMenuOpen: !state.mobileMenuOpen };
    emitChange();
  },
  setMobileMenuOpen: (open: boolean) => {
    state = { ...state, mobileMenuOpen: open };
    emitChange();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useUIStore<T>(selector: (state: UIState) => T): T {
  return useSyncExternalStore(
    uiStore.subscribe,
    () => selector(uiStore.getState()),
    () => selector(uiStore.getState()),
  );
}