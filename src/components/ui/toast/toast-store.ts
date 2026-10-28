import { useSyncExternalStore } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const toastStore = {
  getToasts: () => toasts,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add: (toast: Omit<ToastItem, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ToastItem = {
      ...toast,
      id,
      duration: toast.duration ?? 4000,
    };
    toasts = [...toasts, newItem];
    notify();
    return id;
  },
  remove: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  },
  clear: () => {
    toasts = [];
    notify();
  },
};

export const toast = {
  success: (message: string, options?: { title?: string; duration?: number }) =>
    toastStore.add({ type: 'success', message, ...options }),
  error: (message: string, options?: { title?: string; duration?: number }) =>
    toastStore.add({ type: 'error', message, ...options }),
  warning: (message: string, options?: { title?: string; duration?: number }) =>
    toastStore.add({ type: 'warning', message, ...options }),
  info: (message: string, options?: { title?: string; duration?: number }) =>
    toastStore.add({ type: 'info', message, ...options }),
  custom: (item: Omit<ToastItem, 'id'>) => toastStore.add(item),
  dismiss: (id: string) => toastStore.remove(id),
};

export function useToasts() {
  return useSyncExternalStore(toastStore.subscribe, toastStore.getToasts, toastStore.getToasts);
}