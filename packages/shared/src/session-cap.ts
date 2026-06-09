export type LockoutStyle = 'hard_stop' | 'friction_first';

export type SessionCapConfig = {
  durationMinutes: number;
  lockoutStyle: LockoutStyle;
  snoozeEnabled: boolean;
  futureMeNote: string;
};

const DEFAULTS: SessionCapConfig = {
  durationMinutes: 10,
  lockoutStyle: 'friction_first',
  snoozeEnabled: false,
  futureMeNote: '',
};

export function normalizeSessionCapConfig(raw: Record<string, unknown> = {}): SessionCapConfig {
  const durationRaw =
    typeof raw.durationMinutes === 'number'
      ? raw.durationMinutes
      : typeof raw.maxMinutes === 'number'
        ? raw.maxMinutes
        : DEFAULTS.durationMinutes;
  const durationMinutes = Math.min(60, Math.max(1, Math.trunc(durationRaw)));
  const lockoutStyle = raw.lockoutStyle === 'hard_stop' ? 'hard_stop' : 'friction_first';
  const snoozeEnabled = raw.snoozeEnabled === true;
  let futureMeNote = typeof raw.futureMeNote === 'string' ? raw.futureMeNote.trim() : '';
  if (futureMeNote.length > 140) futureMeNote = futureMeNote.slice(0, 140);
  return { durationMinutes, lockoutStyle, snoozeEnabled, futureMeNote };
}
