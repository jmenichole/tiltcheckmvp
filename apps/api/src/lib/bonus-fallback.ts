export interface BonusPick {
  id: string;
  casinoName: string;
  offerTitle: string;
  url: string;
  expiresAt: string | null;
  expiryMessage: string | null;
  expiresSoon: boolean;
  urgent: boolean;
  source: 'static-fallback' | 'email-inbox';
}

export const STATIC_BONUS_PICKS: BonusPick[] = [
  {
    id: 'fallback-mcluck',
    casinoName: 'McLuck',
    offerTitle: 'Daily login reward — check inbox for latest terms',
    url: 'https://www.mcluck.com/',
    expiresAt: null,
    expiryMessage: 'Check casino for current offer',
    expiresSoon: false,
    urgent: false,
    source: 'static-fallback',
  },
  {
    id: 'fallback-stake-us',
    casinoName: 'Stake.us',
    offerTitle: 'Promotions hub — verify eligibility before deposit',
    url: 'https://stake.us/promotions',
    expiresAt: null,
    expiryMessage: 'Offers rotate frequently',
    expiresSoon: false,
    urgent: false,
    source: 'static-fallback',
  },
  {
    id: 'fallback-chumba',
    casinoName: 'Chumba',
    offerTitle: 'Welcome / daily offers — read terms on site',
    url: 'https://www.chumbacasino.com/',
    expiresAt: null,
    expiryMessage: 'Check casino for current offer',
    expiresSoon: false,
    urgent: false,
    source: 'static-fallback',
  },
];

export interface UpstreamBonusPayload {
  source?: string;
  available?: boolean;
  updatedAt?: string | null;
  data?: Array<Record<string, unknown>>;
}

export function mapUpstreamPick(row: Record<string, unknown>): BonusPick | null {
  const casinoName =
    (typeof row.casinoName === 'string' && row.casinoName)
    || (typeof row.brand === 'string' && row.brand)
    || null;
  const offerTitle =
    (typeof row.offerTitle === 'string' && row.offerTitle)
    || (typeof row.bonus === 'string' && row.bonus)
    || null;
  const url = typeof row.url === 'string' ? row.url : null;
  if (!casinoName || !offerTitle || !url) return null;

  return {
    id: typeof row.id === 'string' ? row.id : `${casinoName}-${offerTitle}`.slice(0, 120),
    casinoName,
    offerTitle,
    url,
    expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : null,
    expiryMessage: typeof row.expiryMessage === 'string' ? row.expiryMessage : null,
    expiresSoon: Boolean(row.expiresSoon),
    urgent: Boolean(row.urgent),
    source: 'email-inbox',
  };
}

export function picksFromUpstream(payload: UpstreamBonusPayload, limit: number): BonusPick[] {
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const mapped = rows
    .map((row) => mapUpstreamPick(row))
    .filter((row): row is BonusPick => row !== null);
  return mapped.slice(0, limit);
}
