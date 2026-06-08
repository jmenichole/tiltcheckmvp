'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiBaseUrl } from '@/lib/api';

function LoginFallback() {
  return (
    <main className="public-page text-white auth-page">
      <section className="hero-surface auth-hero">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Discord login</span>
          <h1 className="landing-hero-title landing-hero-title--centered">Connect your account</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">Loading...</p>
        </div>
      </section>
    </main>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const safeRedirect = redirect?.startsWith('/') ? redirect : '/dashboard';
  const loginUrl = `${apiBaseUrl()}/auth/discord/login?source=web&redirect=${encodeURIComponent(safeRedirect)}`;

  return (
    <main className="public-page text-white auth-page">
      <section className="hero-surface auth-hero">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Discord login</span>
          <h1 className="landing-hero-title landing-hero-title--centered">Connect your account</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            One login for your vault rules and extension sync. No separate dashboard subdomain — just
            tiltcheck.me.
          </p>
          <div className="hero-actions">
            <a href={loginUrl} className="btn btn-primary">
              LOGIN WITH DISCORD
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
