import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchGameExclusion,
  matchGameExclusionForPage,
  pathnameMatchesPrefix,
  patternsFromGameUrl,
  validateGameExclusions,
} from './game-exclusion.js';
import type { GameExclusionEntry } from './types.js';
import { stakeCategoryToExclusion, STAKE_CATEGORY_BLOCKS } from './stake-categories.js';

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

describe('pathnameMatchesPrefix', () => {
  it('matches exact pathname', () => {
    assert.equal(pathnameMatchesPrefix('/casino/group/slots', '/casino/group/slots'), true);
  });

  it('matches nested path under prefix', () => {
    assert.equal(pathnameMatchesPrefix('/casino/group/slots/extra', '/casino/group/slots'), true);
  });

  it('does not match partial segment prefix', () => {
    assert.equal(pathnameMatchesPrefix('/casino/group/slots-extra', '/casino/group/slots'), false);
  });
});

describe('matchGameExclusionForPage', () => {
  const originals = stakeCategoryToExclusion(
    STAKE_CATEGORY_BLOCKS.find((c) => c.id === 'stake-originals')!,
    'block',
  );
  const slots = stakeCategoryToExclusion(
    STAKE_CATEGORY_BLOCKS.find((c) => c.id === 'slots')!,
    'block',
  );

  it('matches stake category group lobby on stake host', () => {
    const hit = matchGameExclusionForPage(
      '/casino/group/stake-originals',
      'stake originals lobby',
      [originals],
      { stakeHost: true },
    );
    assert.equal(hit?.label, 'Stake Originals');
  });

  it('matches stake category game path on stake host', () => {
    const hit = matchGameExclusionForPage('/casino/games/plinko', 'plinko', [originals], {
      stakeHost: true,
    });
    assert.equal(hit?.label, 'Stake Originals');
  });

  it('does not match unrelated game with originals-only entry', () => {
    const hit = matchGameExclusionForPage('/casino/games/blackjack', 'blackjack', [originals], {
      stakeHost: true,
    });
    assert.equal(hit, null);
  });

  it('matches keyword pattern via haystack substring', () => {
    const hit = matchGameExclusionForPage('/games/table', 'live blackjack table 7', [blackjack], {
      stakeHost: true,
    });
    assert.equal(hit?.label, 'Blackjack');
  });

  it('matches nested path under slots group prefix', () => {
    const hit = matchGameExclusionForPage('/casino/group/slots/extra', 'slots', [slots], {
      stakeHost: true,
    });
    assert.equal(hit?.label, 'Slots');
  });

  it('ignores path-prefix patterns off stake host', () => {
    const hit = matchGameExclusionForPage('/casino/games/plinko', 'unrelated page', [originals], {
      stakeHost: false,
    });
    assert.equal(hit, null);
  });

  it('still matches haystack substrings off stake host', () => {
    const hit = matchGameExclusionForPage('', 'https://other.casino/games/blackjack', [blackjack]);
    assert.equal(hit?.label, 'Blackjack');
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

  it('accepts stake_category source', () => {
    const stakeCat: GameExclusionEntry = {
      id: 'stake-cat-slots',
      label: 'Slots',
      matchPatterns: ['/casino/group/slots'],
      mode: 'block',
      source: 'stake_category',
    };
    const result = validateGameExclusions([stakeCat]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value[0].source, 'stake_category');
  });
});
