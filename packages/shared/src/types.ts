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
  updatedAt: string;
}

export interface VaultRule {
  id: string;
  userId: string;
  ruleType: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
}
