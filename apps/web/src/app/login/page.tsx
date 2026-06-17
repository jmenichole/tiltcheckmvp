'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDiscordLoginUrl } from '@/lib/discord-login';

const ERROR_COPY: Record<string, string> = {
  missing_token: 'Discord login did not return a session token. Try again.',
};

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
  const errorKey = searchParams.get('error');
  const safeRedirect = redirect?.startsWith('/') ? redirect : '/dashboard';
  const loginUrl = getDiscordLoginUrl(safeRedirect);
  const errorMessage = errorKey ? (ERROR_COPY[errorKey] ?? 'Login failed. Try again.') : null;

  return (
    <main className="public-page text-white auth-page">
      <section className="hero-surface auth-hero">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">Discord login</span>
          <h1 className="landing-hero-title landing-hero-title--centered">Connect your account</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered">
            One login for game exclusions, tilt sensitivity, session cap, and extension sync. No separate
            dashboard subdomain — just tiltcheck.me.
          </p>

          {errorMessage ? (
            <p className="dashboard-status dashboard-status--error mt-4 max-w-md mx-auto" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div className="hero-actions">
            <a href={loginUrl} className="btn btn-primary">
              LOGIN WITH DISCORD
            </a>
            <Link href="/" className="btn btn-ghost">
              Back to home
            </Link>
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
