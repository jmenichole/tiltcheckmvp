import type { SessionCapConfig } from '@tiltcheck/shared';
import { triggerTouchGrassTimeout, type TouchGrassOptions } from './enforcement.js';
import { isFrictionActive, triggerFrictionScreen } from './friction.js';

const FRICTION_KEY = 'tc_friction_used';
const SNOOZE_KEY = 'tc_snooze_used';

export function resetEnforcementSessionFlags(): void {
  sessionStorage.removeItem(FRICTION_KEY);
  sessionStorage.removeItem(SNOOZE_KEY);
}

export function handleCriticalEnforcement(
  pact: SessionCapConfig,
  opts: TouchGrassOptions,
  routing?: { forceTouchGrass?: boolean },
): void {
  const touchGrass = () => triggerTouchGrassTimeout(opts);

  if (routing?.forceTouchGrass || pact.lockoutStyle === 'hard_stop') {
    touchGrass();
    return;
  }

  if (sessionStorage.getItem(FRICTION_KEY) === '1') {
    touchGrass();
    return;
  }

  if (isFrictionActive()) return;

  sessionStorage.setItem(FRICTION_KEY, '1');

  const snoozeAvailable = pact.snoozeEnabled && sessionStorage.getItem(SNOOZE_KEY) !== '1';

  triggerFrictionScreen({
    pact,
    triggerReason: opts.triggerReason,
    triggerInsight: opts.triggerInsight,
    durationMinutes: opts.durationMinutes,
    futureMeNote: opts.futureMeNote,
    onSnooze: snoozeAvailable
      ? () => {
          sessionStorage.setItem(SNOOZE_KEY, '1');
        }
      : undefined,
  });
}
