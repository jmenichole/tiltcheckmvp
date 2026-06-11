import type { GameExclusionEntry, GameExclusionMode } from './types.js';

export type StakeCategoryId =
  | 'stake-originals'
  | 'scratch-cards'
  | 'slots'
  | 'live-casino'
  | 'table-games';

export type StakeCategoryBlock = {
  id: StakeCategoryId;
  label: string;
  copy: string;
  pathPrefixes: string[];
};

export const STAKE_CATEGORY_BLOCKS: StakeCategoryBlock[] = [
  {
    id: 'stake-originals',
    label: 'Stake Originals',
    copy: 'Plinko, Dice, Crash, Mines — fast loops built to keep you clicking.',
    pathPrefixes: [
      '/casino/group/stake-originals',
      '/casino/games/plinko',
      '/casino/games/dice',
      '/casino/games/limbo',
      '/casino/games/crash',
      '/casino/games/mines',
      '/casino/games/keno',
      '/casino/games/wheel',
      '/casino/games/hilo',
      '/casino/games/dragon-tower',
      '/casino/games/diamonds',
    ],
  },
  {
    id: 'scratch-cards',
    label: 'Scratch Cards',
    copy: 'Instant reveals that feel harmless until the stack is gone.',
    pathPrefixes: [
      '/casino/group/scratch-cards',
      '/casino/games/scratch',
      '/casino/games/scratch-cards',
      '/casino/games/scratch-gold',
      '/casino/games/scratch-platinum',
      '/casino/games/scratch-silver',
    ],
  },
  {
    id: 'slots',
    label: 'Slots',
    copy: 'Spin-heavy games — easy to autopilot when the reels are hot.',
    pathPrefixes: [
      '/casino/group/slots',
      '/casino/games/sweet-bonanza',
      '/casino/games/gates-of-olympus',
      '/casino/games/sugar-rush',
      '/casino/games/wanted-dead-or-a-wild',
      '/casino/games/big-bass-bonanza',
      '/casino/games/starlight-princess',
      '/casino/games/the-dog-house',
      '/casino/games/fruit-party',
      '/casino/games/wolf-gold',
      '/casino/games/book-of-dead',
      '/casino/games/buffalo-king',
    ],
  },
  {
    id: 'live-casino',
    label: 'Live Casino',
    copy: 'Real dealers, real pace — harder to pause mid-hand.',
    pathPrefixes: [
      '/casino/group/live-casino',
      '/casino/games/live-blackjack',
      '/casino/games/live-roulette',
      '/casino/games/live-baccarat',
      '/casino/games/live-crazy-time',
      '/casino/games/lightning-roulette',
    ],
  },
  {
    id: 'table-games',
    label: 'Table Games',
    copy: 'Blackjack, roulette, baccarat — classic traps when you chase losses.',
    pathPrefixes: [
      '/casino/group/table-games',
      '/casino/games/blackjack',
      '/casino/games/roulette',
      '/casino/games/baccarat',
      '/casino/games/video-poker',
      '/casino/games/craps',
    ],
  },
];

export function stakeCategoryToExclusion(
  category: StakeCategoryBlock,
  mode: GameExclusionMode,
): GameExclusionEntry {
  return {
    id: `stake-cat-${category.id}`,
    label: category.label,
    matchPatterns: [...category.pathPrefixes],
    mode,
    source: 'stake_category',
  };
}

export function buildStakeCategoryExclusions(
  selected: StakeCategoryId[],
  defaultMode: GameExclusionMode,
  overrides: Partial<Record<StakeCategoryId, GameExclusionMode>> = {},
): GameExclusionEntry[] {
  const byId = new Map(STAKE_CATEGORY_BLOCKS.map((c) => [c.id, c]));
  return selected
    .map((id) => {
      const category = byId.get(id);
      if (!category) return null;
      const mode = overrides[id] ?? defaultMode;
      return stakeCategoryToExclusion(category, mode);
    })
    .filter((entry): entry is GameExclusionEntry => entry !== null);
}
