import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSessionCapConfig } from './session-cap.js';

describe('normalizeSessionCapConfig', () => {
  it('defaults friction_first and no snooze', () => {
    const c = normalizeSessionCapConfig({});
    assert.equal(c.durationMinutes, 10);
    assert.equal(c.lockoutStyle, 'friction_first');
    assert.equal(c.snoozeEnabled, false);
    assert.equal(c.futureMeNote, '');
  });

  it('truncates note to 140', () => {
    const c = normalizeSessionCapConfig({ futureMeNote: 'x'.repeat(200) });
    assert.equal(c.futureMeNote.length, 140);
  });

  it('clamps duration 1-1440', () => {
    assert.equal(normalizeSessionCapConfig({ durationMinutes: 0 }).durationMinutes, 1);
    assert.equal(normalizeSessionCapConfig({ durationMinutes: 99 }).durationMinutes, 99);
    assert.equal(normalizeSessionCapConfig({ durationMinutes: 2000 }).durationMinutes, 1440);
  });
});
