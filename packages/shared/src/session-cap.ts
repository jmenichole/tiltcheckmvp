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

export const SESSION_CAP_MIN_MINUTES = 1;
export const SESSION_CAP_MAX_MINUTES = 24 * 60;

export function normalizeSessionCapConfig(raw: Record<string, unknown> = {}): SessionCapConfig {
  const durationRaw =
    typeof raw.durationMinutes === 'number'
      ? raw.durationMinutes
      : typeof raw.maxMinutes === 'number'
        ? raw.maxMinutes
        : DEFAULTS.durationMinutes;
  const durationMinutes = Math.min(
    SESSION_CAP_MAX_MINUTES,
    Math.max(SESSION_CAP_MIN_MINUTES, Math.trunc(durationRaw)),
  );
  const lockoutStyle = raw.lockoutStyle === 'hard_stop' ? 'hard_stop' : 'friction_first';
  const snoozeEnabled = raw.snoozeEnabled === true;
  let futureMeNote = typeof raw.futureMeNote === 'string' ? raw.futureMeNote.trim() : '';
  if (futureMeNote.length > 140) futureMeNote = futureMeNote.slice(0, 140);
  return { durationMinutes, lockoutStyle, snoozeEnabled, futureMeNote };
}

export function formatSessionCapDuration(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? '24 hrs' : `${days} days`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hrs = minutes / 60;
    return hrs === 1 ? '1 hr' : `${hrs} hrs`;
  }
  return `${minutes} min`;
}
