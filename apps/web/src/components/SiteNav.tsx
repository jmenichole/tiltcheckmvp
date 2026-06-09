'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  EXTENSION_INSTALL_HREF,
  NAV_DESKTOP_LINKS,
  NAV_MENU_GROUPS,
  NAV_QUICK_LINKS,
} from '@/lib/nav-menu';

type NavUser = { username: string; avatarUrl: string | null } | null;

function filterQuickLinks(links: typeof NAV_QUICK_LINKS, authed: boolean) {
  if (!authed) return links;
  return links.filter((link) => link.href !== '/dashboard');
}

function mapMenuGroups(groups: typeof NAV_MENU_GROUPS, authed: boolean) {
  if (!authed) return groups;
  return groups.map((group) => {
    if (group.title !== 'Company') return group;
    return {
      ...group,
      links: group.links.map((link) =>
        link.href === '/' ? { ...link, label: 'Command center' } : link,
      ),
    };
  });
}

function NavMenuLink({
  link,
  onNavigate,
}: {
  link: { href: string; label: string; external?: boolean };
  onNavigate: () => void;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="nav-sidebar-link"
        onClick={onNavigate}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className="nav-sidebar-link" onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export default function SiteNav() {
  const router = useRouter();
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

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  async function handleLogout() {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
    closeMenu();
    router.push('/');
    router.refresh();
  }

  const avatarInitial = user?.username?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <>
      <a href="#main-content" className="nav-skip-link">
        Skip to content
      </a>
      <header className={`nav-topbar${scrolled ? ' nav-topbar--scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">TC</span>
          <span className="nav-logo-text">TILTCHECK</span>
        </Link>

        <nav className="nav-desktop-links" aria-label="Primary">
          {NAV_DESKTOP_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-desktop-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-topbar-right">
          <Link
            href={EXTENSION_INSTALL_HREF}
            className="nav-install-btn"
            aria-label="Install extension"
            title="Install extension"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v10m0 0l4-4m-4 4L8 9M5 17h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="nav-avatar"
              aria-label={`${user.username} — dashboard`}
              title={`${user.username} — dashboard`}
            >
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="nav-avatar__image" />
              ) : (
                <span className="nav-avatar__initial" aria-hidden="true">
                  {avatarInitial}
                </span>
              )}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-secondary btn-sm nav-login-btn">
              LOGIN
            </Link>
          )}
          <button
            type="button"
            className="nav-hamburger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {open ? (
        <>
          <div className="nav-overlay" onClick={closeMenu} aria-hidden="true" />
          <nav className="nav-collapse nav-collapse--open" aria-label="Site menu">
            <div className="nav-collapse-links">
              {user ? (
                <div className="nav-collapse-group">
                  <p className="nav-collapse-group__title">Account</p>
                  <Link href="/dashboard" className="nav-sidebar-link" onClick={closeMenu}>
                    Dashboard
                  </Link>
                  <Link href="/settings" className="nav-sidebar-link" onClick={closeMenu}>
                    Profile &amp; settings
                  </Link>
                  <button type="button" className="nav-sidebar-link nav-sidebar-link--button" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              ) : null}

              <div className="nav-collapse-group">
                <p className="nav-collapse-group__title">Quick links</p>
                {filterQuickLinks(NAV_QUICK_LINKS, Boolean(user)).map((link) => (
                  <NavMenuLink key={link.href} link={link} onNavigate={closeMenu} />
                ))}
              </div>

              {mapMenuGroups(NAV_MENU_GROUPS, Boolean(user)).map((group) => (
                <div key={group.title} className="nav-collapse-group">
                  <p className="nav-collapse-group__title">{group.title}</p>
                  {group.links.map((link) => (
                    <NavMenuLink key={link.href} link={link} onNavigate={closeMenu} />
                  ))}
                </div>
              ))}
            </div>

            <div className="nav-collapse-foot">
              {user ? (
                <Link href="/settings" className="nav-collapse-foot__user" onClick={closeMenu}>
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="nav-avatar__image nav-avatar__image--sm" />
                  ) : (
                    <span className="nav-avatar nav-avatar--sm">
                      <span className="nav-avatar__initial">{avatarInitial}</span>
                    </span>
                  )}
                  <span>{user.username}</span>
                </Link>
              ) : (
                <Link href="/login" className="btn btn-primary btn-sm" onClick={closeMenu}>
                  LOGIN WITH DISCORD
                </Link>
              )}
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}
