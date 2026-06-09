export type NavLink = { href: string; label: string; external?: boolean };

export type NavMenuGroup = { title: string; links: NavLink[] };

export const NAV_QUICK_LINKS: NavLink[] = [
  { href: '/casinos', label: 'Casino Trust' },
  { href: '/dashboard', label: 'Dashboard' },
];

/** Persistent desktop header links (md+). */
export const NAV_DESKTOP_LINKS: NavLink[] = [
  { href: '/casinos', label: 'Casino Trust' },
  { href: '/extension', label: 'Extension' },
  { href: '/dashboard', label: 'Dashboard' },
];

export const NAV_MENU_GROUPS: NavMenuGroup[] = [
  {
    title: 'Tools',
    links: [
      { href: '/stake', label: 'Stake Auto-Vault' },
      { href: '/nuts', label: 'nuts.gg Auto-Vault' },
      { href: '/tools/domain-verifier', label: 'Promo Link Checker' },
      { href: '/tools/scan-scams', label: 'Scam Registry' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/', label: 'How it Works' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
      { href: 'https://discord.gg/gdBsEJfCar', label: 'Contact', external: true },
      { href: '/touch-grass', label: 'Touch Grass Protocol' },
    ],
  },
];
