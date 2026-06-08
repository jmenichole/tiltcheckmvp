export type AutoVaultSiteMode = 'stake-us' | 'nuts-ws';

export type AutoVaultSite = {
  mode: AutoVaultSiteMode;
  name: string;
};

export type AutoVaultConfig = {
  saveAmount: number;
  bigWinThreshold: number;
  bigWinMultiplier: number;
  checkInterval: number;
  minDepositSol: number;
  autoTipEnabled: boolean;
};

export type StatusType = 'info' | 'success' | 'warning' | 'error' | 'profit' | 'bigwin';

export type VaultEngine = {
  isRunning(): boolean;
  start(): void;
  stop(): void;
  kill(): void;
  formatVaulted(): string;
};

export const NUTS_MSG_SOURCE = 'tc-av-nuts-main';

export type NutsBridgeMessage =
  | { source: typeof NUTS_MSG_SOURCE; type: 'socket-ready' }
  | { source: typeof NUTS_MSG_SOURCE; type: 'balance'; prev: number | null; next: number }
  | { source: typeof NUTS_MSG_SOURCE; type: 'vault-balance'; prev: number | null; next: number }
  | { source: typeof NUTS_MSG_SOURCE; type: 'deposit-result'; id: string; ok: boolean; error?: string }
  | { source: typeof NUTS_MSG_SOURCE; type: 'tip-result'; id: string; ok: boolean; error?: string }
  | { source: typeof NUTS_MSG_SOURCE; type: 'send-deposit'; id: string; amountUnits: number }
  | { source: typeof NUTS_MSG_SOURCE; type: 'send-tip'; id: string; amountUnits: number; recipient: string };
