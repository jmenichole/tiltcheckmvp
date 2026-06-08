export type NavLink = { href: string; label: string; external?: boolean };

export type NavMenuGroup = { title: string; links: NavLink[] };

export const NAV_QUICK_LINKS: NavLink[] = [
  { href: '/extension', label: 'Extension' },
  { href: '/casinos', label: 'Casino Trust' },
  { href: '/bonuses', label: "Today's Bonuses" },
  { href: '/dashboard', label: 'Dashboard' },
];

export const NAV_MENU_GROUPS: NavMenuGroup[] = [
  {
    title: 'Tools',
    links: [
      { href: '/extension', label: 'All tools' },
      { href: '/stake', label: 'Profit Guardrails' },
      { href: '/tools/domain-verifier', label: 'Bet Verifier' },
      { href: '/dashboard', label: 'RTP Drift Watch' },
      { href: '/casinos', label: 'House Edge Scanner' },
    ],
  },
  {
    title: 'Intel',
    links: [
      { href: '/casinos', label: 'Casino Trust Scores' },
      { href: '/bonuses', label: 'Daily Bonus Tracker' },
      { href: '/tools/scan-scams', label: 'Scam Registry' },
      { href: '/extension', label: 'Browser Extension' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/', label: 'How it Works' },
      { href: '/legal', label: 'Operators & Docs' },
      { href: 'https://discord.gg/gdBsEJfCar', label: 'Contact', external: true },
      { href: '/touch-grass', label: 'Touch Grass Protocol' },
    ],
  },
];
