'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`nav-topbar${scrolled ? ' nav-topbar--scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">TC</span>
          <span className="nav-logo-text">TILTCHECK</span>
        </Link>
        <nav className="nav-desktop-links">
          <Link href="/extension">Extension</Link>
          <Link href="/casinos">Casinos</Link>
          <Link href="/login">Login</Link>
        </nav>
        <div className="nav-topbar-right">
          <Link href="/login" className="btn btn-secondary btn-sm nav-desktop-actions">
            LOGIN
          </Link>
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
            <Link href="/login" onClick={() => setOpen(false)}>
              Login
            </Link>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </Link>
          </nav>
        </>
      ) : null}
    </>
  );
}
