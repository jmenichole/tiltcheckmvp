import Link from 'next/link';

const DISCORD_URL = 'https://discord.gg/gdBsEJfCar';

export default function LandingHeroActions() {
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
        <Link
          href="/casinos"
          className="btn btn-ghost"
          data-funnel-event="landing_trust_click"
          data-funnel-source="web-home-hero"
          data-funnel-label="Check Casino Trust"
        >
          CHECK CASINO TRUST
        </Link>
      </div>

      <div className="hero-actions hero-actions--mobile">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-discord"
          data-funnel-event="landing_discord_click"
          data-funnel-source="web-home-hero-mobile"
          data-funnel-label="Join Discord"
        >
          JOIN DISCORD
        </a>
        <Link
          href="/casinos"
          className="btn btn-ghost"
          data-funnel-event="landing_trust_click"
          data-funnel-source="web-home-hero-mobile"
          data-funnel-label="Check Casino Trust"
        >
          CHECK CASINO TRUST
        </Link>
        <Link href="/extension" className="hero-actions__desktop-link">
          Get the desktop install link
        </Link>
      </div>
    </>
  );
}
