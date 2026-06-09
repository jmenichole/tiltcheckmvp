import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPresetLabelsInHaystack,
  emptyTiltLearnedStore,
  isPresetExcluded,
  rankExclusionSuggestions,
  recordTiltLearnEvent,
} from './tilt-game-suggestions.js';

describe('tilt-game-suggestions', () => {
  it('detects crash preset in haystack', () => {
    const labels = detectPresetLabelsInHaystack(
      'https://stake.us/casino/games/crash crash game limbo',
    );
    assert.ok(labels.includes('Crash / Limbo'));
  });

  it('learns tilt hits on detected game', () => {
    let store = emptyTiltLearnedStore();
    store = recordTiltLearnEvent(store, {
      patternTypes: ['fast_clicks'],
      haystack: 'stake.us/casino/games/crash',
    });
    store = recordTiltLearnEvent(store, {
      patternTypes: ['fast_clicks'],
      haystack: 'stake.us/casino/games/crash',
    });
    const suggestions = rankExclusionSuggestions(store, []);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].label, 'Crash / Limbo');
    assert.equal(suggestions[0].score, 2);
  });

  it('skips already excluded presets', () => {
    let store = emptyTiltLearnedStore();
    store = recordTiltLearnEvent(store, {
      patternTypes: ['fast_clicks'],
      haystack: 'blackjack table',
    });
    store = recordTiltLearnEvent(store, {
      patternTypes: ['fast_clicks'],
      haystack: 'blackjack table',
    });
    const suggestions = rankExclusionSuggestions(store, [
      {
        id: '1',
        label: 'Blackjack',
        matchPatterns: ['blackjack'],
        mode: 'warn',
        source: 'preset',
      },
    ]);
    assert.equal(suggestions.length, 0);
  });

  it('isPresetExcluded matches custom patterns', () => {
    assert.equal(
      isPresetExcluded('Slots', [
        {
          id: 'c',
          label: 'My slots',
          matchPatterns: ['slot'],
          mode: 'block',
          source: 'keywords',
        },
      ]),
      true,
    );
  });
});
