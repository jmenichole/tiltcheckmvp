import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVaultPledgeConfig,
  isPledgeActive,
  pledgeAppliesToSite,
  autoReleaseIfExpired,
  buildPledgeReleaseAt,
} from './vault-pledge.js';

describe('normalizeVaultPledgeConfig', () => {
  it('clamps duration', () => {
    const c = normalizeVaultPledgeConfig({ durationMinutes: 5 });
    assert.equal(c.durationMinutes, 15);
  });
});

describe('isPledgeActive', () => {
  it('false when released', () => {
    const c = normalizeVaultPledgeConfig({ status: 'released' });
    assert.equal(isPledgeActive(c), false);
  });

  it('true when releaseAt in future', () => {
    const future = buildPledgeReleaseAt(60);
    const c = normalizeVaultPledgeConfig({ releaseAt: future, status: 'active' });
    assert.equal(isPledgeActive(c), true);
  });
});

describe('pledgeAppliesToSite', () => {
  it('both matches stake', () => {
    const c = normalizeVaultPledgeConfig({ site: 'both', durationMinutes: 60 });
    assert.equal(pledgeAppliesToSite(c, 'stake_us'), true);
  });
});

describe('autoReleaseIfExpired', () => {
  it('marks released when past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const c = normalizeVaultPledgeConfig({ releaseAt: past, status: 'active' });
    assert.equal(autoReleaseIfExpired(c).status, 'released');
  });
});
