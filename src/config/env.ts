function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[env] Variable de entorno requerida no encontrada: ${key}. Revisa .env.local y .env.example.`
    );
  }
  return value;
}

export const env = {
  API_BASE_URL: requireEnv('VITE_API_BASE_URL'),
  MODE: import.meta.env.MODE as 'development' | 'production' | 'test',
  IS_PRODUCTION: import.meta.env.PROD,
} as const;