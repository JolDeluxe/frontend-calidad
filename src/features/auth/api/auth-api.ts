import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import type { LoginCredentials, LoginResponseData, UsuarioAuth } from '../types/auth.types';

export const authApi = {
  login: (credentials: LoginCredentials) =>
    httpClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials),

  exchangeOfflineToken: (offlineToken: string) =>
    httpClient.post<ApiResponse<LoginResponseData>>('/auth/exchange-offline-token', {
      offlineToken,
    }),

  refresh: () =>
    httpClient.post<ApiResponse<{ accessToken: string; usuario?: UsuarioAuth }>>('/auth/refresh'),

  logout: () =>
    httpClient.post<ApiResponse<{ cerrado: boolean }>>('/auth/logout'),

  getMe: () =>
    httpClient.get<ApiResponse<{ user: UsuarioAuth }>>('/auth/me'),
};