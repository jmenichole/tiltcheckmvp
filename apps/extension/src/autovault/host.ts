import type { AutoVaultSite } from './types.js';
import type { StatusType } from './types.js';
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
  private mountEl: HTMLElement | null = null;
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
    this.setupEngines(this.site);

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

  setMountElement(el: HTMLElement | null): void {
    if (el === this.mountEl && this.ui) return;
    this.ui?.destroy();
    this.ui = null;
    this.mountEl = el;
    if (el && this.site && this.engine && this.sessionWatch) {
      this.ui = this.createUi(el);
      console.log(LOG_PREFIX, `UI embedded in TC panel (${this.site.name})`);
    }
  }

  private async remount(): Promise<void> {
    if (!this.site) return;
    this.ui?.destroy();
    this.ui = null;
    this.engine?.stop();
    this.sessionWatch?.stop();
    this.nutsEngine?.destroyBridge();
    this.engine = null;
    this.stakeEngine = null;
    this.nutsEngine = null;
    this.sessionWatch = null;
    this.onboarded = await isOnboarded();
    this.lastRunning = await getLastRunning();
    this.setupEngines(this.site);
    if (this.mountEl) this.ui = this.createUi(this.mountEl);
  }

  private setupEngines(site: AutoVaultSite): void {
    const logToUi = (msg: string, type?: StatusType) => {
      console.log(LOG_PREFIX, msg);
      this.ui?.setStatus(msg, type);
      this.ui?.render();
    };

    const sharedCallbacks = {
      onLog: logToUi,
      onVaultedChange: () => {
        this.ui?.render();
      },
      getConfig: () => getConfig(),
    };

    if (site.mode === 'stake-us') {
      this.stakeEngine = createStakeEngine({
        ...sharedCallbacks,
      });
      this.nutsEngine = null;
      this.engine = this.stakeEngine;
    } else {
      this.stakeEngine = null;
      this.nutsEngine = createNutsEngine({
        ...sharedCallbacks,
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

    console.log(LOG_PREFIX, `Engines ready for ${site.name}`);
  }

  private createUi(mount: HTMLElement): AutoVaultUiApi {
    const site = this.site!;
    const engine = this.engine!;
    const sessionWatch = this.sessionWatch!;

    return mountAutoVaultUi({
      mount,
      site,
      engine,
      sessionWatch,
      config: getConfig(),
      onboarded: this.onboarded,
      lastRunning: this.lastRunning,
      onConfigChange: (cfg) => {
        void saveConfig(cfg);
      },
      onEngineStart: () => {
        engine.start();
        void setLastRunning(true);
        this.ui?.render();
      },
      onEngineStop: (clearLast) => {
        engine.stop();
        if (clearLast) void setLastRunning(false);
        this.ui?.render();
      },
      onEngineKill: () => {
        engine.kill();
        void setLastRunning(false);
        this.ui?.render();
      },
      onOnboardComplete: async () => {
        await setOnboarded();
        this.onboarded = true;
        this.ui?.destroy();
        this.ui = null;
        if (this.mountEl) {
          this.ui = this.createUi(this.mountEl);
        }
        void setLastRunning(true);
        this.sessionWatch?.start();
        engine.start();
      },
      onResetOnboarding: async () => {
        engine.stop();
        this.sessionWatch?.stop();
        await resetOnboarding();
        this.ui?.destroy();
        this.ui = null;
        this.onboarded = false;
        await this.remount();
      },
      onStatus: () => {},
    });
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
    this.mountEl = null;
    this.teardown();
  }
}
