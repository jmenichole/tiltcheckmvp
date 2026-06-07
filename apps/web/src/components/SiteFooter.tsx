'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const QUOTES = [
  'Trust everybody, but cut the cards.',
  "Casinos don't win because they're lucky. They win because they're open 24/7 and the math is always in their favor.",
  "The house always wins, unless you're the architect.",
  'Risk is the price you pay for the chance to be right.',
  'Fortune favors the prepared.',
  'Zero drift. Zero mercy.',
  "Math doesn't care about your gut feeling.",
  'The machine has a memory. You have a prayer.',
  'The best way to double your money is to fold it in half and put it back in your pocket.',
  "Don't worry about the noise. Worry about the signal.",
];

type FooterLink = { href: string; label: string; external?: boolean };

const footerGroups: { title: string; links: FooterLink[] }[] = [
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
      { href: '/casinos', label: 'RTP Intel' },
      { href: '/tools/scan-scams', label: 'Scam Registry' },
      { href: '/extension', label: 'Browser Extension' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/', label: 'How it Works' },
      { href: '/', label: 'About' },
      { href: '/legal', label: 'Operators' },
      { href: '/legal', label: 'Docs' },
      { href: 'https://discord.gg/gdBsEJfCar', label: 'Contact', external: true },
      { href: '/dashboard', label: 'Your Dashboard' },
    ],
  },
];

export default function SiteFooter() {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="brand-eyebrow footer-eyebrow">TiltCheck</span>
            <h2 className="footer-title">See the session. Brake before you regret.</h2>
            <p className="footer-copy">
              TiltCheck is a read-only browser extension and public trust layer. It watches live play for tilt
              patterns, manipulative pressure, and session drift, then pairs that with trust signals and receipts when
              the math looks off. The point is simple: catch the spiral before another breathless deposit cooks you.
            </p>

            <div className="footer-actions">
              <Link href="/extension" className="footer-action footer-action--primary">
                Get Early Access
              </Link>
              <a
                href="https://discord.gg/gdBsEJfCar"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-action footer-action--secondary"
              >
                Join Discord
              </a>
            </div>

            {quote ? <p className="footer-quote">&ldquo;{quote}&rdquo;</p> : null}
          </div>

          <div className="footer-nav-groups">
            {footerGroups.map((group) => (
              <div key={group.title} className="footer-nav-group">
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`}>
                      {link.external ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href}>{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-links">
            <Link href="/touch-grass">Touch Grass Protocol</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/legal">Operator Pricing</Link>
            <Link href="/legal">Asset Risk Limits</Link>
            <a
              href="https://github.com/jmenichole/tiltcheckmvp"
              target="_blank"
              rel="noopener noreferrer"
            >
              The Source
            </a>
          </div>
          <p className="footer-tagline">Made for Degens. By Degens.</p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
