import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMonitoredGamblingHost } from './community-casinos.js';

describe('isMonitoredGamblingHost', () => {
  it('matches known casino domains and subdomains', () => {
    assert.equal(isMonitoredGamblingHost('stake.us'), true);
    assert.equal(isMonitoredGamblingHost('www.stake.us'), true);
    assert.equal(isMonitoredGamblingHost('play.stake.us'), true);
    assert.equal(isMonitoredGamblingHost('nuts.gg'), true);
    assert.equal(isMonitoredGamblingHost('www.mcluck.com'), true);
  });

  it('rejects non-casino sites', () => {
    assert.equal(isMonitoredGamblingHost('mail.yahoo.com'), false);
    assert.equal(isMonitoredGamblingHost('google.com'), false);
    assert.equal(isMonitoredGamblingHost('tiltcheckmvp-production.up.railway.app'), false);
  });
});
