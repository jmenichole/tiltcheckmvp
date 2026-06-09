export type NavLink = { href: string; label: string; external?: boolean };

export type NavMenuGroup = { title: string; links: NavLink[] };

/** Setup page until Chrome Web Store listing is live. */
export const EXTENSION_INSTALL_HREF = '/extension';

export const NAV_QUICK_LINKS: NavLink[] = [
  { href: '/casinos', label: 'Casino Trust' },
  { href: '/bonuses', label: 'Bonuses' },
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
