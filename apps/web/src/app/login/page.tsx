'use client';

import { apiBaseUrl } from '@/lib/api';

export default function LoginPage() {
  const loginUrl = `${apiBaseUrl()}/auth/discord/login?source=web&redirect=/dashboard`;

  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Discord login</span>
          <h1 className="landing-hero-title">Connect your account</h1>
          <p className="landing-hero-subtitle">
            Unified dashboard on tiltcheck.me — no separate dashboard subdomain.
          </p>
          <a href={loginUrl} className="btn btn-primary">
            LOGIN WITH DISCORD
          </a>
        </div>
      </section>
    </main>
  );
}
