export type VaultPledgeSite = 'stake_us' | 'nuts' | 'both';
export type VaultPledgeStatus = 'active' | 'released' | 'cancelled';

export type VaultPledgeConfig = {
  releaseAt: string;
  durationMinutes: number;
  site: VaultPledgeSite;
  futureMeNote: string;
  status: VaultPledgeStatus;
  startedAt: string;
};

const MIN_MINUTES = 15;
const MAX_MINUTES = 10_080;

export function buildPledgeReleaseAt(durationMinutes: number, from = new Date()): string {
  const ms = durationMinutes * 60_000;
  return new Date(from.getTime() + ms).toISOString();
}

export function normalizeVaultPledgeConfig(
  raw: Record<string, unknown> = {},
  opts?: { now?: Date },
): VaultPledgeConfig {
  const now = opts?.now ?? new Date();
  const durationRaw = typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 240;
  const durationMinutes = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.trunc(durationRaw)));

  const site =
    raw.site === 'stake_us' || raw.site === 'nuts' || raw.site === 'both' ? raw.site : 'both';

  let futureMeNote = typeof raw.futureMeNote === 'string' ? raw.futureMeNote.trim() : '';
  if (futureMeNote.length > 140) futureMeNote = futureMeNote.slice(0, 140);

  const status =
    raw.status === 'released' || raw.status === 'cancelled' || raw.status === 'active'
      ? raw.status
      : 'active';

  const startedAt =
    typeof raw.startedAt === 'string' && raw.startedAt.length > 0
      ? raw.startedAt
      : now.toISOString();

  let releaseAt =
    typeof raw.releaseAt === 'string' ? raw.releaseAt : buildPledgeReleaseAt(durationMinutes, now);
  if (Number.isNaN(Date.parse(releaseAt))) {
    releaseAt = buildPledgeReleaseAt(durationMinutes, now);
  }

  return { releaseAt, durationMinutes, site, futureMeNote, status, startedAt };
}

export function isPledgeActive(config: VaultPledgeConfig, now = new Date()): boolean {
  if (config.status !== 'active') return false;
  return Date.parse(config.releaseAt) > now.getTime();
}

export function pledgeAppliesToSite(config: VaultPledgeConfig, site: 'stake_us' | 'nuts'): boolean {
  if (!isPledgeActive(config)) return false;
  return config.site === 'both' || config.site === site;
}

export function autoReleaseIfExpired(
  config: VaultPledgeConfig,
  now = new Date(),
): VaultPledgeConfig {
  if (config.status !== 'active') return config;
  if (Date.parse(config.releaseAt) <= now.getTime()) {
    return { ...config, status: 'released' };
  }
  return config;
}
