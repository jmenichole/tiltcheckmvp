'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import SiteFooter from '@/components/SiteFooter';
import SiteNav from '@/components/SiteNav';

const MINIMAL_CHROME_PREFIXES = ['/stake', '/nuts'];

function isMinimalChrome(pathname: string | null): boolean {
  if (!pathname) return false;
  return MINIMAL_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = isMinimalChrome(pathname);

  if (minimal) {
    return <main className="min-h-screen text-white">{children}</main>;
  }

  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
