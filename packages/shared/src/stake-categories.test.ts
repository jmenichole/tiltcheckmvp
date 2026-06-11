import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAKE_CATEGORY_BLOCKS,
  buildStakeCategoryExclusions,
  stakeCategoryToExclusion,
} from './stake-categories.js';
import { validateGameExclusions } from './game-exclusion.js';

describe('stakeCategoryToExclusion', () => {
  it('maps category to exclusion entry with stake_category source', () => {
    const category = STAKE_CATEGORY_BLOCKS[0];
    const entry = stakeCategoryToExclusion(category, 'block');
    assert.equal(entry.id, 'stake-cat-stake-originals');
    assert.equal(entry.label, 'Stake Originals');
    assert.equal(entry.mode, 'block');
    assert.equal(entry.source, 'stake_category');
    assert.deepEqual(entry.matchPatterns, category.pathPrefixes);
  });
});

describe('buildStakeCategoryExclusions', () => {
  it('builds entries for selected categories with default mode', () => {
    const entries = buildStakeCategoryExclusions(['stake-originals', 'slots'], 'warn');
    assert.equal(entries.length, 2);
    assert.equal(entries[0].label, 'Stake Originals');
    assert.equal(entries[0].mode, 'warn');
    assert.equal(entries[1].label, 'Slots');
    assert.equal(entries[1].mode, 'warn');
  });

  it('applies per-category mode overrides', () => {
    const entries = buildStakeCategoryExclusions(['stake-originals', 'scratch-cards'], 'warn', {
      'stake-originals': 'block',
    });
    assert.equal(entries.length, 2);
    assert.equal(entries[0].mode, 'block');
    assert.equal(entries[1].mode, 'warn');
  });

  it('skips unknown category ids', () => {
    const entries = buildStakeCategoryExclusions(
      ['stake-originals', 'not-a-category' as 'stake-originals'],
      'block',
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, 'stake-cat-stake-originals');
  });

  it('returns empty array when nothing selected', () => {
    assert.deepEqual(buildStakeCategoryExclusions([], 'block'), []);
  });

  it('ship-gate categories pass validateGameExclusions', () => {
    const entries = buildStakeCategoryExclusions(['stake-originals', 'scratch-cards'], 'block');
    const result = validateGameExclusions(entries);
    assert.equal(result.ok, true);
  });

  it('all catalog categories pass validateGameExclusions', () => {
    const ids = STAKE_CATEGORY_BLOCKS.map((c) => c.id);
    const entries = buildStakeCategoryExclusions(ids, 'block');
    const result = validateGameExclusions(entries);
    assert.equal(result.ok, true);
  });
});
