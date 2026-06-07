'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type NavUser = { username: string } | null;

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<NavUser>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    apiFetch('/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <>
      <header className={`nav-topbar${scrolled ? ' nav-topbar--scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">TC</span>
          <span className="nav-logo-text">TILTCHECK</span>
        </Link>
        <nav className="nav-desktop-links">
          <Link href="/extension" className="nav-desktop-link">
            Extension
          </Link>
          <Link href="/casinos" className="nav-desktop-link">
            Casinos
          </Link>
          {user ? (
            <Link href="/dashboard" className="nav-desktop-link">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="nav-desktop-link">
              Login
            </Link>
          )}
        </nav>
        <div className="nav-topbar-right">
          {user ? (
            <Link href="/dashboard" className="nav-auth-full nav-auth-user nav-desktop-actions">
              {user.username}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-secondary btn-sm nav-desktop-actions">
              LOGIN
            </Link>
          )}
          <button type="button" className="nav-hamburger" aria-label="Menu" onClick={() => setOpen(true)}>
            ☰
          </button>
        </div>
      </header>
      {open ? (
        <>
          <div className="nav-overlay" onClick={() => setOpen(false)} />
          <nav className="nav-collapse nav-collapse--open">
            <Link href="/extension" onClick={() => setOpen(false)}>
              Extension
            </Link>
            <Link href="/casinos" onClick={() => setOpen(false)}>
              Casinos
            </Link>
            {user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                Login
              </Link>
            )}
          </nav>
        </>
      ) : null}
    </>
  );
}
