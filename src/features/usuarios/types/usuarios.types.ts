export interface UsuarioRol {
  id: number;
  codigo: string;
  nombre: string;
  esSistema?: boolean;
}

export interface UsuarioItem {
  id: number;
  usuario: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
  fechaCreacion: string;
  password?: string;
  rol: UsuarioRol;
}

export interface CreateUserPayload {
  nombre: string;
  password: string;
  rolId: number;
}

export interface UpdateUserPayload {
  nombre?: string;
  password?: string;
  rolId?: number;
  estado?: 'ACTIVO' | 'INACTIVO';
}
