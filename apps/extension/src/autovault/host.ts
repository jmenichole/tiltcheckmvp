import type { AutoVaultSite } from './types.js';
import { detectAutoVaultSite, watchSiteChange } from './site.js';
import {
  getConfig,
  loadConfig,
  saveConfig,
  isOnboarded,
  setOnboarded,
  resetOnboarding,
  getLastRunning,
  setLastRunning,
} from './storage.js';
import { createStakeEngine } from './stake-engine.js';
import { createNutsEngine } from './nuts-engine.js';
import { createSessionWatch } from './session-watch.js';
import { mountAutoVaultUi, type AutoVaultUiApi } from './ui.js';
import type { VaultEngine } from './types.js';

const LOG_PREFIX = '[TiltCheck AutoVault]';

export class AutoVaultHost {
  private site: AutoVaultSite | null;
  private stakeEngine: ReturnType<typeof createStakeEngine> | null = null;
  private nutsEngine: ReturnType<typeof createNutsEngine> | null = null;
  private engine: VaultEngine | null = null;
  private sessionWatch: ReturnType<typeof createSessionWatch> | null = null;
  private ui: AutoVaultUiApi | null = null;
  private unwatchSite: (() => void) | null = null;
  private onboarded = false;
  private lastRunning = false;

  constructor() {
    this.site = detectAutoVaultSite();
  }

  async start(): Promise<void> {
    if (!this.site) return;
    await loadConfig();
    this.onboarded = await isOnboarded();
    this.lastRunning = await getLastRunning();
    this.mountForSite(this.site);

    this.unwatchSite = watchSiteChange((nextSite) => {
      if (!nextSite) {
        this.teardown();
        this.site = null;
        return;
      }
      if (this.site && nextSite.mode === this.site.mode && nextSite.name === this.site.name) return;
      console.log(LOG_PREFIX, `Site changed → ${nextSite.name}`);
      this.teardown();
      this.site = nextSite;
      void this.remount();
    });
  }

  private async remount(): Promise<void> {
    if (!this.site) return;
    this.onboarded = await isOnboarded();
    this.lastRunning = await getLastRunning();
    this.mountForSite(this.site);
  }

  private mountForSite(site: AutoVaultSite): void {
    const sharedCallbacks = {
      onLog: () => {
        this.ui?.render();
      },
      onVaultedChange: () => {
        this.ui?.render();
      },
      getConfig: () => getConfig(),
    };

    if (site.mode === 'stake-us') {
      this.stakeEngine = createStakeEngine({
        ...sharedCallbacks,
        onLog: (msg, type) => {
          console.log(LOG_PREFIX, msg);
          this.ui?.render();
        },
      });
      this.nutsEngine = null;
      this.engine = this.stakeEngine;
    } else {
      this.stakeEngine = null;
      this.nutsEngine = createNutsEngine({
        ...sharedCallbacks,
        onLog: (msg, type) => {
          console.log(LOG_PREFIX, msg);
          this.ui?.render();
        },
        onBalanceChange: (prev, next) => {
          this.sessionWatch?.onNutsBalance(prev, next);
        },
      });
      this.engine = this.nutsEngine;
    }

    if (!this.engine) return;

    this.sessionWatch = createSessionWatch(site, this.stakeEngine, this.nutsEngine, () => {
      this.ui?.render();
    });

    this.ui = mountAutoVaultUi({
      site,
      engine: this.engine,
      sessionWatch: this.sessionWatch,
      config: getConfig(),
      onboarded: this.onboarded,
      lastRunning: this.lastRunning,
      onConfigChange: (cfg) => {
        void saveConfig(cfg);
      },
      onEngineStart: () => {
        this.engine?.start();
        void setLastRunning(true);
        this.ui?.render();
      },
      onEngineStop: (clearLast) => {
        this.engine?.stop();
        if (clearLast) void setLastRunning(false);
        this.ui?.render();
      },
      onEngineKill: () => {
        this.engine?.kill();
        void setLastRunning(false);
        this.ui?.render();
      },
      onOnboardComplete: async () => {
        await setOnboarded();
        this.onboarded = true;
        this.ui?.destroy();
        this.ui = mountAutoVaultUi({
          site,
          engine: this.engine!,
          sessionWatch: this.sessionWatch!,
          config: getConfig(),
          onboarded: true,
          lastRunning: true,
          onConfigChange: (cfg) => void saveConfig(cfg),
          onEngineStart: () => {
            this.engine?.start();
            void setLastRunning(true);
            this.ui?.render();
          },
          onEngineStop: (clearLast) => {
            this.engine?.stop();
            if (clearLast) void setLastRunning(false);
            this.ui?.render();
          },
          onEngineKill: () => {
            this.engine?.kill();
            void setLastRunning(false);
            this.ui?.render();
          },
          onResetOnboarding: async () => {
            await resetOnboarding();
            this.teardown();
            this.onboarded = false;
            await this.remount();
          },
          onStatus: () => {},
        });
        void setLastRunning(true);
        this.sessionWatch?.start();
        this.engine?.start();
      },
      onResetOnboarding: async () => {
        this.engine?.stop();
        this.sessionWatch?.stop();
        await resetOnboarding();
        this.ui?.destroy();
        this.onboarded = false;
        await this.remount();
      },
      onStatus: () => {},
    });

    console.log(LOG_PREFIX, `Mounted for ${site.name}`);
  }

  private teardown(): void {
    this.engine?.stop();
    this.sessionWatch?.stop();
    this.nutsEngine?.destroyBridge();
    this.ui?.destroy();
    this.ui = null;
    this.engine = null;
    this.stakeEngine = null;
    this.nutsEngine = null;
    this.sessionWatch = null;
  }

  destroy(): void {
    this.unwatchSite?.();
    this.unwatchSite = null;
    this.teardown();
  }
}
