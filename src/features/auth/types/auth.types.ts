export interface UsuarioAuth {
  id: number;
  usuario: string;
  nombre: string;
  rol: {
    id: number;
    codigo: string;
    nombre: string;
  };
}

export interface LoginCredentials {
  usuario: string;
  password: string;
}

export interface LoginResponseData {
  usuario: UsuarioAuth;
  accessToken: string;
}