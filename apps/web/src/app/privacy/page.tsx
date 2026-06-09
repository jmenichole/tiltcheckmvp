import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy — TiltCheck',
  description:
    'How TiltCheck collects, uses, and protects your data when you use the website, dashboard, and browser extension.',
};

const EFFECTIVE = 'May 27, 2026';
const UPDATED = 'May 27, 2026';

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Policy" effectiveDate={EFFECTIVE} lastUpdated={UPDATED}>
      <p className="lead">
        This Privacy Policy explains how TiltCheck Ecosystem (&quot;TiltCheck,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) collects, uses, shares, and protects information when you use
        our website, dashboard, APIs, and browser extension (the &quot;Service&quot;). We built TiltCheck for
        harm reduction — that includes being straight with you about data.
      </p>

      <section id="controller">
        <h2>1. Who We Are</h2>
        <p>
          TiltCheck Ecosystem operates the Service. For privacy requests, contact us at{' '}
          <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a> or via our{' '}
          <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer">
            Discord community
          </a>
          .
        </p>
      </section>

      <section id="collect">
        <h2>2. Information We Collect</h2>

        <h3>2.1 Account and identity (Discord OAuth)</h3>
        <p>When you sign in with Discord, we receive and store:</p>
        <ul>
          <li>Discord user ID, username, avatar URL, and email (if shared by Discord);</li>
          <li>A session token used to authenticate API requests from the website and extension.</li>
        </ul>
        <p>We do not receive your Discord password.</p>

        <h3>2.2 Settings and vault configuration</h3>
        <p>When you save preferences on the dashboard, we store data such as:</p>
        <ul>
          <li>Tilt sensitivity profile (conservative, moderate, degen);</li>
          <li>Game exclusion rules (labels, match patterns, block/warn mode);</li>
          <li>Session cap / &quot;My Line&quot; settings (duration, friction vs hard stop, snooze, notes);</li>
          <li>Notification and demo-mode flags;</li>
          <li>Onboarding completion timestamp.</li>
        </ul>

        <h3>2.3 Extension and on-device data</h3>
        <p>
          The browser extension stores configuration and runtime state locally in{' '}
          <strong>Chrome extension storage</strong> (and session storage for live tab status), including:
        </p>
        <ul>
          <li>Synced vault rules and game exclusions;</li>
          <li>Session token and username for API sync;</li>
          <li>Tilt-learning patterns used to suggest blocks (stored locally unless you accept a suggestion);</li>
          <li>AutoVault preferences on supported casino tabs.</li>
        </ul>
        <p>
          To detect tilt and enforce your rules, the extension processes <strong>page context on sites you
          visit</strong> — URLs, titles, headings, and interaction timing. This processing happens on your
          device to drive warnings and lockouts. We do not continuously upload full page content to our
          servers as part of normal operation.
        </p>

        <h3>2.4 Technical and usage data</h3>
        <p>Our hosting providers may automatically log:</p>
        <ul>
          <li>IP address, browser type, request timestamps, and error diagnostics;</li>
          <li>API request metadata needed to operate and secure the Service.</li>
        </ul>

        <h3>2.5 Information we do not collect</h3>
        <ul>
          <li>We do not collect payment card numbers through the core Service (no checkout in MVP);</li>
          <li>We do not sell your personal information;</li>
          <li>We do not require real-name identity beyond what Discord provides.</li>
        </ul>
      </section>

      <section id="use">
        <h2>3. How We Use Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Authenticate you and sync settings between web and extension;</li>
          <li>Enforce the protection features you configure;</li>
          <li>Operate casino trust scores and public intel surfaces;</li>
          <li>Maintain security, debug failures, and prevent abuse;</li>
          <li>Communicate service updates (e.g. via Discord or email if you opt in).</li>
        </ul>
      </section>

      <section id="legal-bases">
        <h2>4. Legal Bases (EEA/UK Users)</h2>
        <p>If you are in the European Economic Area or United Kingdom, we process personal data on these bases:</p>
        <ul>
          <li>
            <strong>Contract</strong> — to provide the Service you sign up for (account, sync, enforcement);
          </li>
          <li>
            <strong>Legitimate interests</strong> — to secure the Service, prevent fraud, and improve features,
            balanced against your rights;
          </li>
          <li>
            <strong>Consent</strong> — where required (e.g. optional communications). You may withdraw consent
            without affecting core account deletion rights.
          </li>
        </ul>
      </section>

      <section id="sharing">
        <h2>5. How We Share Information</h2>
        <p>We share information only as described below:</p>
        <ul>
          <li>
            <strong>Service providers</strong> — hosting (e.g. Railway), database (e.g. Supabase), and
            authentication (Discord) process data on our behalf under contractual safeguards;
          </li>
          <li>
            <strong>Legal requirements</strong> — if required by law, subpoena, or to protect rights, safety,
            and security;
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger, acquisition, or asset sale,
            subject to notice where required by law.
          </li>
        </ul>
        <p>
          <strong>We do not sell</strong> your personal information to data brokers or advertisers.
        </p>
      </section>

      <section id="retention">
        <h2>6. Data Retention</h2>
        <p>
          We retain account and settings data while your account is active and for a reasonable period
          afterward to comply with legal obligations, resolve disputes, and enforce agreements. You may
          request deletion (see Section 8). Server logs are retained for a limited operational window unless
          longer retention is required for security investigations.
        </p>
      </section>

      <section id="security">
        <h2>7. Security</h2>
        <p>
          We use industry-standard measures including HTTPS, httpOnly session cookies on the web app, and
          server-side access controls for database operations. No method of transmission or storage is 100%
          secure; you are responsible for keeping your Discord account and devices secure.
        </p>
      </section>

      <section id="rights">
        <h2>8. Your Rights and Choices</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul>
          <li>Access, correct, or delete personal data we hold about you;</li>
          <li>Export your settings (available via dashboard and API while logged in);</li>
          <li>Object to or restrict certain processing;</li>
          <li>Lodge a complaint with a supervisory authority (EEA/UK).</li>
        </ul>
        <p>
          To exercise these rights, email{' '}
          <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a> with the subject line{' '}
          <strong>Privacy Request</strong>. We may verify your identity via your Discord account or session
          before fulfilling requests.
        </p>
        <p>
          You can also <strong>log out</strong>, <strong>uninstall the extension</strong>, and clear local
          extension storage at any time. Uninstalling stops on-device processing immediately; server-side
          deletion requires a request or account closure.
        </p>
      </section>

      <section id="cookies">
        <h2>9. Cookies and Similar Technologies</h2>
        <p>
          The website uses a <strong>session cookie</strong> (<code>tc_session</code>) to keep you logged in
          after Discord authentication. It is httpOnly and scoped to our domain. The extension uses browser
          storage APIs instead of website cookies for sync state.
        </p>
        <p>
          We do not use third-party advertising cookies on core product pages. Analytics, if added later,
          will be disclosed here.
        </p>
      </section>

      <section id="children">
        <h2>10. Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to anyone under 18. We do not knowingly collect personal information
          from children. If you believe a minor has provided data, contact us and we will delete it.
        </p>
      </section>

      <section id="international">
        <h2>11. International Transfers</h2>
        <p>
          We may process data in the United States and other countries where our providers operate. Where
          required, we rely on appropriate safeguards (such as standard contractual clauses) for transfers
          from the EEA/UK.
        </p>
      </section>

      <section id="california">
        <h2>12. California Privacy Notice (CCPA/CPRA)</h2>
        <p>California residents have additional rights, including:</p>
        <ul>
          <li>Right to know what personal information we collect, use, and disclose;</li>
          <li>Right to delete personal information (subject to exceptions);</li>
          <li>Right to correct inaccurate information;</li>
          <li>Right to opt out of sale/share — we do not sell personal information;</li>
          <li>Right to non-discrimination for exercising privacy rights.</li>
        </ul>
        <p>
          Submit requests to <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a>. We will verify
          and respond as required by law.
        </p>
      </section>

      <section id="changes">
        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised policy on this page
          and update the &quot;Last updated&quot; date. Material changes may be communicated via the website
          or Discord.
        </p>
      </section>

      <section id="contact">
        <h2>14. Contact</h2>
        <p>Privacy questions or requests:</p>
        <ul>
          <li>
            Email: <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a>
          </li>
          <li>
            Discord:{' '}
            <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer">
              TiltCheck community
            </a>
          </li>
        </ul>
        <p>
          See also our <a href="/terms">Terms of Service</a>.
        </p>
      </section>
    </LegalDocument>
  );
}
