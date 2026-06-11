'use client';

import Link from 'next/link';
import {
  STAKE_CATEGORY_BLOCKS,
  type GameExclusionMode,
  type StakeCategoryId,
} from '@tiltcheck/shared';

type Props = {
  selected: Set<StakeCategoryId>;
  defaultMode: GameExclusionMode;
  overrides: Partial<Record<StakeCategoryId, GameExclusionMode>>;
  onChangeSelected: (next: Set<StakeCategoryId>) => void;
  onChangeDefaultMode: (mode: GameExclusionMode) => void;
  onChangeOverride: (id: StakeCategoryId, mode: GameExclusionMode | undefined) => void;
};

export function StakeCategoryPicker({
  selected,
  defaultMode,
  overrides,
  onChangeSelected,
  onChangeDefaultMode,
  onChangeOverride,
}: Props) {
  function toggleCategory(id: StakeCategoryId, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else {
      next.delete(id);
      onChangeOverride(id, undefined);
    }
    onChangeSelected(next);
  }

  return (
    <div className="stake-category-picker">
      <div className="dashboard-field">
        <label htmlFor="stake-category-default-mode">Default mode for selected categories</label>
        <select
          id="stake-category-default-mode"
          value={defaultMode}
          onChange={(e) => onChangeDefaultMode(e.target.value as GameExclusionMode)}
        >
          <option value="block">Block — immediate lockout</option>
          <option value="warn">Warn — 10s countdown first</option>
        </select>
      </div>

      <div className="sensitivity-card-grid">
        {STAKE_CATEGORY_BLOCKS.map((category) => {
          const isSelected = selected.has(category.id);
          const override = overrides[category.id];
          return (
            <div
              key={category.id}
              className={`sensitivity-card${isSelected ? ' sensitivity-card--selected' : ''}`}
            >
              <label className="dashboard-checkbox" style={{ marginTop: 0 }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleCategory(category.id, e.target.checked)}
                />
                <span className="sensitivity-card__title">{category.label}</span>
              </label>
              <span className="sensitivity-card__copy">{category.copy}</span>
              {isSelected ? (
                <details className="stake-category-picker__override">
                  <summary>Override mode for this category</summary>
                  <div className="dashboard-field">
                    <label htmlFor={`stake-category-override-${category.id}`}>Mode</label>
                    <select
                      id={`stake-category-override-${category.id}`}
                      value={override ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        onChangeOverride(
                          category.id,
                          value === '' ? undefined : (value as GameExclusionMode),
                        );
                      }}
                    >
                      <option value="">Use default ({defaultMode})</option>
                      <option value="block">Block — immediate lockout</option>
                      <option value="warn">Warn — 10s countdown first</option>
                    </select>
                  </div>
                </details>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="public-page-card__copy" style={{ marginTop: '1rem' }}>
        Need a specific game URL or keyword? Add custom blocks in{' '}
        <Link href="/settings#game-exclusion">Settings → Game blocks</Link>.
      </p>
    </div>
  );
}
