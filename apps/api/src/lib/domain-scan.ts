/** Heuristic domain scan (SusLink-style, no AI deps). */

export type RiskLevel = 'safe' | 'suspicious' | 'high' | 'critical';

export type DomainScanResult = {
  url: string;
  riskLevel: RiskLevel;
  reason: string;
  scannedAt: string;
};

const RISKY_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.win', '.bid', '.download'];
const SCAM_KEYWORDS = [
  'free-money',
  'guaranteed-win',
  'hack',
  'generator',
  'claim-now',
  'verify-account',
  'action-required',
];
const KNOWN_CASINOS = [
  'stake.com',
  'stake.us',
  'rollbit.com',
  'roobet.com',
  'shuffle.com',
  'bc.game',
  'nuts.gg',
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function stripTld(domain: string): string {
  return domain.replace(/\.[a-z]{2,}$/, '');
}

function normalizeInput(raw: string): URL | null {
  const input = raw.trim();
  if (!input) return null;
  try {
    const withProto = input.startsWith('http://') || input.startsWith('https://') ? input : `https://${input}`;
    const parsed = new URL(withProto);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function scanDomain(raw: string, blacklist: string[] = []): DomainScanResult {
  const parsed = normalizeInput(raw);
  if (!parsed) {
    return {
      url: raw,
      riskLevel: 'critical',
      reason: 'Invalid or malformed domain',
      scannedAt: new Date().toISOString(),
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const hostBase = stripTld(hostname);
  const checks: { risky: boolean; reason?: string }[] = [];

  if (RISKY_TLDS.some((tld) => hostname.endsWith(tld))) {
    checks.push({ risky: true, reason: 'High-risk TLD' });
  }

  const href = parsed.href.toLowerCase();
  for (const keyword of SCAM_KEYWORDS) {
    if (href.includes(keyword)) {
      checks.push({ risky: true, reason: `Suspicious keyword: ${keyword}` });
      break;
    }
  }

  const blacklistSet = new Set(blacklist.map((d) => d.toLowerCase()));
  if (blacklistSet.has(hostname)) {
    checks.push({ risky: true, reason: 'Domain is on the TiltCheck scam blacklist' });
  }

  for (const casino of KNOWN_CASINOS) {
    const casinoBase = stripTld(casino);
    if (hostname === casino) continue;
    if (hostname.includes(casinoBase)) {
      checks.push({ risky: true, reason: `Possible impersonation of ${casino}` });
      break;
    }
    if (casinoBase.length >= 4) {
      const dist = levenshtein(hostBase, casinoBase);
      if (dist > 0 && dist <= 2) {
        checks.push({ risky: true, reason: `Possible typosquat of ${casino}` });
        break;
      }
    }
  }

  const parts = hostname.split('.');
  if (parts.length > 3) {
    checks.push({ risky: true, reason: 'Multiple subdomains detected' });
  }

  const risky = checks.filter((c) => c.risky);
  let riskLevel: RiskLevel = 'safe';
  if (risky.length === 1) riskLevel = 'suspicious';
  else if (risky.length === 2) riskLevel = 'high';
  else if (risky.length >= 3) riskLevel = 'critical';

  return {
    url: parsed.href,
    riskLevel,
    reason: risky.length
      ? risky.map((c) => c.reason).filter(Boolean).join('; ')
      : 'No suspicious patterns detected',
    scannedAt: new Date().toISOString(),
  };
}
