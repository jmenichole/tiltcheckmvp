import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

let cached: string[] | null = null;

export async function loadDomainBlacklist(): Promise<string[]> {
  if (cached) return cached;
  try {
    const raw = await readFile(path.join(dataDir, 'domain_blacklist.json'), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    cached = parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    return cached;
  } catch {
    return [];
  }
}
