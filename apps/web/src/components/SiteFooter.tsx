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

export default function SiteFooter() {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-top footer-top--slim">
          <div className="footer-brand">
            <span className="brand-eyebrow footer-eyebrow">TiltCheck</span>
            <h2 className="footer-title">See the session. Brake before you regret.</h2>
            <p className="footer-copy footer-copy--compact">
              Read-only extension. Live tilt guardrails. Public trust receipts. Catch the spiral before another
              breathless deposit cooks you.
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
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-links">
            <Link href="/touch-grass">Touch Grass</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/legal">Operators</Link>
            <a href="https://github.com/jmenichole/tiltcheckmvp" target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </div>
          <p className="footer-tagline">Made for Degens. By Degens.</p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
