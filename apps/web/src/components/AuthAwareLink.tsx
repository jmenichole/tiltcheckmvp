'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** Shown when logged out; defaults to children */
  loginLabel?: string;
};

export default function AuthAwareLink({ href, className, children, loginLabel }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return (
      <span className={className} aria-busy="true">
        {children}
      </span>
    );
  }

  if (authed) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  const loginHref = `/login?redirect=${encodeURIComponent(href)}`;
  return (
    <Link href={loginHref} className={className} title="Sign in required">
      {loginLabel ?? children}
    </Link>
  );
}
