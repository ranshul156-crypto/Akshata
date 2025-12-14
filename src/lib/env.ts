export function getEnv(name: string) {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const value = env[name];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}
