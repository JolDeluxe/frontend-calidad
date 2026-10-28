import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type {
  UsuarioItem,
  UsuarioRol,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types/usuarios.types';

export const usuariosApi = {
  getUsers: async (): Promise<UsuarioItem[]> => {
    const res = await httpClient.get<ApiResponse<UsuarioItem[]>>('/users');
    return res.data || [];
  },

  getUserById: async (id: number): Promise<UsuarioItem> => {
    const res = await httpClient.get<ApiResponse<UsuarioItem>>(`/users/${id}`);
    if (!res.data) throw new Error('Usuario no encontrado');
    return res.data;
  },

  suggestUsername: async (nombre: string, excludeId?: number): Promise<string> => {
    const params = new URLSearchParams({ nombre });
    if (excludeId) params.append('excludeId', String(excludeId));
    const res = await httpClient.get<ApiResponse<{ username: string }>>(`/users/suggest-username?${params.toString()}`);
    return res.data?.username || '';
  },

  getRoles: async (): Promise<UsuarioRol[]> => {
    const res = await httpClient.get<ApiResponse<UsuarioRol[]>>('/users/roles');
    return res.data || [];
  },

  createUser: async (payload: CreateUserPayload): Promise<UsuarioItem> => {
    const res = await httpClient.post<ApiResponse<UsuarioItem>>('/users', payload);
    if (!res.data) throw new Error('No se pudo crear el usuario');
    return res.data;
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<UsuarioItem> => {
    const res = await httpClient.patch<ApiResponse<UsuarioItem>>(`/users/${id}`, payload);
    if (!res.data) throw new Error('No se pudo actualizar el usuario');
    return res.data;
  },

  deleteUser: async (id: number): Promise<UsuarioItem> => {
    const res = await httpClient.delete<ApiResponse<UsuarioItem>>(`/users/${id}`);
    if (!res.data) throw new Error('No se pudo inactivar el usuario');
    return res.data;
  },
};
