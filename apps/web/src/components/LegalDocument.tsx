import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalDocumentProps = {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  children: ReactNode;
};

export default function LegalDocument({
  title,
  effectiveDate,
  lastUpdated,
  children,
}: LegalDocumentProps) {
  return (
    <main className="public-page text-white legal-page">
      <section className="hero-surface legal-page__hero">
        <div className="landing-shell">
          <span className="brand-eyebrow">Legal</span>
          <h1 className="brand-page-title">{title}</h1>
          <p className="brand-lead legal-page__meta">
            Effective {effectiveDate} · Last updated {lastUpdated}
          </p>
          <p className="legal-page__nav-links">
            <Link href="/terms">Terms of Service</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy">Privacy Policy</Link>
          </p>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <article className="public-page-card legal-document">{children}</article>
        </div>
      </section>
    </main>
  );
}
