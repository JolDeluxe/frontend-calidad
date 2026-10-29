function requireEnv(key: string, fallbackInTest?: string): string {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = (globalThis as any).process?.env;
  const value = (metaEnv[key] ?? procEnv?.[key]) as string | undefined;
  if (!value) {
    if (fallbackInTest !== undefined) return fallbackInTest;
    throw new Error(
      `[env] Variable de entorno requerida no encontrada: ${key}. Revisa .env.local y .env.example.`,
    );
  }
  return value;
}

export const env = {
  API_BASE_URL: requireEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3000/api/v1'),
  MODE: (((import.meta as any).env?.MODE as string) || 'development') as
    | 'development'
    | 'production'
    | 'test',
  IS_PRODUCTION: Boolean((import.meta as any).env?.PROD),
} as const;