export default function GlobalLoading() {
  return (
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <p className="brand-lead" role="status" aria-live="polite">
            Loading…
          </p>
        </div>
      </section>
    </main>
  );
}
