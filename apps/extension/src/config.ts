export function apiBaseUrl(): string {
  return (typeof process !== 'undefined' && process.env?.EXTENSION_API_URL) ||
    'http://localhost:3001';
}
