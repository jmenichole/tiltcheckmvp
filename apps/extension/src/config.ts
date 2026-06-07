export function apiBaseUrl(): string {
  return (typeof process !== 'undefined' && process.env?.EXTENSION_API_URL) ||
    'http://localhost:3001';
}

export function webBaseUrl(): string {
  return (typeof process !== 'undefined' && process.env?.EXTENSION_WEB_URL) ||
    'http://localhost:3000';
}
