/** Shared 3-step protection loop — used on authed home, not repeated on dashboard. */
export const PROTECTION_STEPS = [
  {
    step: '01',
    title: 'Block problem games',
    description:
      'In Settings: exclude games by preset, keywords, or pasted URL. Block or warn per game.',
  },
  {
    step: '02',
    title: 'Set your session cap',
    description:
      'How long Touch Grass locks the screen — for tilt critical and blocked-game lockouts.',
  },
  {
    step: '03',
    title: 'Play with the extension on',
    description:
      'Read-only watcher on casino tabs. Tilt sensitivity controls how early warnings fire.',
  },
] as const;

export const HABIT_LOOP_COPY = {
  eyebrow: 'After your first lockout',
  title: 'Come back here. Tweak the cap. That is the habit loop.',
  body: 'Too short and you are back on the machine before the tilt clears? Bump it. Still ragging through the timer? Go shorter next time. Set → play → get pulled out → adjust.',
} as const;
