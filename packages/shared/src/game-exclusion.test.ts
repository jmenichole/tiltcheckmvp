import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchGameExclusion,
  patternsFromGameUrl,
  validateGameExclusions,
} from './game-exclusion.js';
import type { GameExclusionEntry } from './types.js';

const blackjack: GameExclusionEntry = {
  id: '1',
  label: 'Blackjack',
  matchPatterns: ['blackjack'],
  mode: 'block',
  source: 'preset',
};

describe('matchGameExclusion', () => {
  it('matches url path containing pattern', () => {
    const hit = matchGameExclusion('https://casino.test/games/blackjack/live', [blackjack]);
    assert.equal(hit?.label, 'Blackjack');
  });

  it('returns null when no match', () => {
    assert.equal(matchGameExclusion('https://casino.test/games/roulette', [blackjack]), null);
  });

  it('is case insensitive', () => {
    assert.ok(matchGameExclusion('BLACKJACK table 7', [blackjack]));
  });
});

describe('patternsFromGameUrl', () => {
  it('extracts pathname and last segment', () => {
    const patterns = patternsFromGameUrl('https://stake.us/casino/games/blackjack');
    assert.ok(patterns.includes('/casino/games/blackjack'));
    assert.ok(patterns.includes('blackjack'));
  });

  it('rejects invalid url', () => {
    assert.throws(() => patternsFromGameUrl('not-a-url'), /Invalid game URL/);
  });
});

describe('validateGameExclusions', () => {
  it('accepts valid entries', () => {
    const result = validateGameExclusions([blackjack]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value[0].label, 'Blackjack');
  });

  it('rejects over limit', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({
      ...blackjack,
      id: String(i),
    }));
    const result = validateGameExclusions(many);
    assert.equal(result.ok, false);
  });

  it('rejects bad mode', () => {
    const result = validateGameExclusions([{ ...blackjack, mode: 'nuke' }]);
    assert.equal(result.ok, false);
  });
});
