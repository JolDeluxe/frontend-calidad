import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface LoginFormProps {
  loading: boolean;
  backendError: string | null;
  onSubmit: (usuario: string, password: string) => Promise<void>;
  onClearError?: () => void;
}

export function LoginForm({
  loading,
  backendError,
  onSubmit,
  onClearError,
}: LoginFormProps) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [usuarioError, setUsuarioError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUsuarioChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUsuario(e.target.value);
    if (usuarioError) setUsuarioError(null);
    if (backendError && onClearError) onClearError();
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError(null);
    if (backendError && onClearError) onClearError();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let hasErrors = false;
    if (!usuario.trim()) {
      setUsuarioError('El usuario es requerido');
      hasErrors = true;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      hasErrors = true;
    }

    if (hasErrors) return;

    await onSubmit(usuario.trim(), password);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {backendError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm"
          >
            <Icon name="error" size="20px" className="shrink-0 mt-0.5" />
            <span>{backendError}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="usuario" error={Boolean(usuarioError)} className="flex items-center gap-2">
            <Icon name="person" size="18px" /> USUARIO
          </Label>
          <Input
            id="usuario"
            type="text"
            name="usuario"
            autoComplete="username"
            placeholder="admin"
            value={usuario}
            onChange={handleUsuarioChange}
            error={Boolean(usuarioError)}
            helperText={usuarioError ?? undefined}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="password" error={Boolean(passwordError)} className="flex items-center gap-2">
            <Icon name="lock" size="18px" /> CONTRASEÑA
          </Label>
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={handlePasswordChange}
            error={Boolean(passwordError)}
            helperText={passwordError ?? undefined}
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          className="mt-3 py-3 w-full cursor-pointer"
        >
          Entrar al Sistema
        </Button>
      </form>
    </div>
  );
}