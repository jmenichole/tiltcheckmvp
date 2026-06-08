export interface ApiUser {
  id: string;
  discordId: string;
  username: string;
  avatarUrl: string | null;
  email: string | null;
}

export interface UserSettings {
  userId: string;
  riskProfile: 'conservative' | 'moderate' | 'degen';
  notificationsEnabled: boolean;
  demoMode: boolean;
  gameExclusions: GameExclusionEntry[];
  onboardingCompletedAt: string | null;
  updatedAt: string;
}

export type GameExclusionMode = 'block' | 'warn';
export type GameExclusionSource = 'preset' | 'keywords' | 'url';

export interface GameExclusionEntry {
  id: string;
  label: string;
  matchPatterns: string[];
  mode: GameExclusionMode;
  source: GameExclusionSource;
}

export interface VaultRule {
  id: string;
  userId: string;
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
}
