import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-bottom footer-bottom--minimal">
          <div className="footer-bottom-links">
            <Link href="/extension">Extension</Link>
            <Link href="/casinos">Casino Trust</Link>
            <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer">
              Discord
            </a>
            <Link href="/touch-grass">Touch Grass</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <a href="https://github.com/jmenichole/tiltcheckmvp" target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </div>
          <p className="footer-disclaimer">
            Not a casino, not a bank, not financial advice. Problem gambling help:{' '}
            <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
              NCPG
            </a>
            .
          </p>
          <p className="footer-tagline">Made for Degens. By Degens.</p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
