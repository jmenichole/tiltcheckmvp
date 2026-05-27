export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}
