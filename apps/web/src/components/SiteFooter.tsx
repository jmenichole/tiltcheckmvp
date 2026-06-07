import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-shell">
        <div className="footer-bottom">
          <div className="footer-bottom-links">
            <Link href="/extension">Extension</Link>
            <Link href="/casinos">Casinos</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/legal">Legal</Link>
            <Link href="/touch-grass">Touch Grass</Link>
          </div>
          <p className="footer-tagline">Made for degens. By degens &lt;3</p>
          <p className="footer-copyright">© 2024–2026 TiltCheck Ecosystem. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
