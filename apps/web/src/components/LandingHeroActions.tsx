import Link from 'next/link';
import { chromeWebStoreUrl, isChromeWebStoreLive } from '@/lib/extension-install';

const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';

export default function LandingHeroActions() {
  const cwsLive = isChromeWebStoreLive();
  const cwsUrl = chromeWebStoreUrl();

  return (
    <>
      <div className="hero-actions hero-actions--desktop">
        <Link
          href="/extension"
          className="btn btn-primary"
          data-funnel-event="landing_install_click"
          data-funnel-source="web-home-hero"
          data-funnel-label="Install the Extension"
        >
          INSTALL THE EXTENSION
        </Link>
        {cwsLive ? (
          <a
            href={cwsUrl}
            className="btn btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
            data-funnel-event="landing_cws_click"
            data-funnel-source="web-home-hero"
            data-funnel-label="Chrome Web Store"
          >
            CHROME WEB STORE
          </a>
        ) : null}
        <Link
          href="/casinos"
          className="btn btn-ghost"
          data-funnel-event="landing_trust_click"
          data-funnel-source="web-home-hero"
          data-funnel-label="Check Casino Trust"
        >
          CHECK CASINO TRUST
        </Link>
        <Link href="/login?redirect=/dashboard" className="btn btn-ghost">
          ALREADY LINKED? LOG IN
        </Link>
      </div>

      <div className="hero-actions hero-actions--mobile">
        <Link
          href="/extension"
          className="btn btn-primary"
          data-funnel-event="landing_install_click"
          data-funnel-source="web-home-hero-mobile"
          data-funnel-label="Install the Extension"
        >
          INSTALL THE EXTENSION
        </Link>
        {cwsLive ? (
          <a
            href={cwsUrl}
            className="btn btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
            data-funnel-event="landing_cws_click"
            data-funnel-source="web-home-hero-mobile"
            data-funnel-label="Chrome Web Store"
          >
            CHROME WEB STORE
          </a>
        ) : null}
        <Link
          href="/casinos"
          className="btn btn-ghost"
          data-funnel-event="landing_trust_click"
          data-funnel-source="web-home-hero-mobile"
          data-funnel-label="Check Casino Trust"
        >
          CHECK CASINO TRUST
        </Link>
        <Link href="/login?redirect=/dashboard" className="btn btn-ghost">
          LOG IN
        </Link>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hero-actions__desktop-link"
        >
          Join Discord
        </a>
      </div>
    </>
  );
}
