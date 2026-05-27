import Link from 'next/link';

export default function LegalPage() {
  return (
    <main className="public-page text-white">
      <section className="public-page-section px-4 py-12">
        <div className="landing-shell public-page-card">
          <h1 className="public-page-card__title">Legal</h1>
          <ul className="space-y-2 mt-4">
            <li>
              <Link href="/privacy" className="text-teal-300">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-teal-300">
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
