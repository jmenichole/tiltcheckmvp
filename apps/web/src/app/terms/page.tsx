import type { Metadata } from 'next';
import LegalDocument from '@/components/LegalDocument';

export const metadata: Metadata = {
  title: 'Terms of Service — TiltCheck',
  description:
    'Terms governing use of the TiltCheck website, dashboard, and browser extension for responsible gaming tools.',
};

const EFFECTIVE = 'May 27, 2026';
const UPDATED = 'May 27, 2026';

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service" effectiveDate={EFFECTIVE} lastUpdated={UPDATED}>
      <p className="lead">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the TiltCheck website,
        web application, APIs, and browser extension (collectively, the &quot;Service&quot;) operated by
        TiltCheck Ecosystem (&quot;TiltCheck,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
        accessing or using the Service, you agree to these Terms. If you do not agree, do not use the
        Service.
      </p>

      <section id="eligibility">
        <h2>1. Eligibility</h2>
        <p>
          You must be at least <strong>18 years old</strong> (or the age of majority in your jurisdiction,
          whichever is higher) to use the Service. The Service is intended for adults who choose to engage
          with online gambling or gaming-adjacent sites and want harm-reduction tooling.
        </p>
        <p>
          You represent that your use of the Service complies with all applicable laws in your location,
          including laws related to online gambling, data protection, and computer access. We do not
          guarantee that the Service is appropriate or lawful in every jurisdiction.
        </p>
      </section>

      <section id="service">
        <h2>2. Description of the Service</h2>
        <p>
          TiltCheck provides <strong>voluntary protection tools</strong> for people who play on third-party
          casino and gaming sites, including but not limited to:
        </p>
        <ul>
          <li>Game self-exclusion and warning rules matched against page URLs, titles, and headings;</li>
          <li>Tilt-pattern detection and session enforcement (warnings, friction screens, and lockouts);</li>
          <li>Session caps and &quot;Past You Pact&quot; settings synced between dashboard and extension;</li>
          <li>AutoVault-style win-skimming helpers on supported sites (e.g. Stake.us, nuts.gg);</li>
          <li>Casino trust scores, bonus intel, and related informational surfaces.</li>
        </ul>
        <p>
          The Service is <strong>user-directed</strong>. You configure thresholds, exclusions, and lockout
          behavior. TiltCheck does not place bets, hold funds, or operate as a casino, sportsbook, bank, or
          payment processor.
        </p>
      </section>

      <section id="not-advice">
        <h2>3. Not Financial, Legal, or Medical Advice</h2>
        <p>
          TiltCheck is provided for <strong>entertainment harm reduction</strong> and personal
          self-control. Nothing in the Service constitutes financial, investment, legal, or medical advice.
          Trust scores, bonus listings, and tilt indicators are informational and may be incomplete or
          outdated. You are solely responsible for decisions you make while gambling or using third-party
          sites.
        </p>
        <p>
          If you believe you have a gambling problem, contact a qualified professional or a helpline such
          as the{' '}
          <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer">
            National Council on Problem Gambling (NCPG)
          </a>
          .
        </p>
      </section>

      <section id="accounts">
        <h2>4. Accounts and Authentication</h2>
        <p>
          Certain features require signing in with <strong>Discord OAuth</strong>. You are responsible for
          maintaining the security of your Discord account and any session tokens stored in your browser or
          extension. You agree not to share credentials or impersonate another user.
        </p>
        <p>
          We may suspend or terminate access if we reasonably believe your account is compromised, abusive,
          or used in violation of these Terms.
        </p>
      </section>

      <section id="extension">
        <h2>5. Browser Extension</h2>
        <p>
          The TiltCheck extension runs on web pages you visit. It may read page URLs, titles, DOM text
          relevant to game detection, and interaction patterns (e.g. click timing) to provide tilt and
          exclusion features. Extension behavior depends on settings you save and sync.
        </p>
        <p>
          You install and enable the extension at your own discretion. We do not guarantee compatibility
          with every site, browser version, or operating system. Updates may change enforcement behavior to
          improve safety or comply with platform policies.
        </p>
      </section>

      <section id="acceptable-use">
        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service to violate any law or third-party terms of service;</li>
          <li>Reverse engineer, scrape, or abuse the API in ways that degrade the Service for others;</li>
          <li>Attempt to bypass enforcement, authentication, or rate limits without authorization;</li>
          <li>Upload malware, interfere with servers, or probe systems for vulnerabilities without permission;</li>
          <li>Misrepresent TiltCheck as an operator, lender, or guaranteed way to profit from gambling.</li>
        </ul>
      </section>

      <section id="third-party">
        <h2>7. Third-Party Sites and Services</h2>
        <p>
          The Service interacts with or links to third-party casinos, Discord, hosting providers, and other
          services we do not control. Your use of those services is governed by their own terms and policies.
          TiltCheck is not responsible for third-party conduct, outages, losses, or policy changes.
        </p>
      </section>

      <section id="ip">
        <h2>8. Intellectual Property</h2>
        <p>
          The Service, including software, branding, documentation, and design, is owned by TiltCheck or
          its licensors and protected by applicable intellectual property laws. We grant you a limited,
          non-exclusive, non-transferable license to use the Service for personal, non-commercial harm
          reduction in accordance with these Terms.
        </p>
        <p>
          Open-source components may be available under separate licenses listed in our{' '}
          <a href="https://github.com/jmenichole/tiltcheckmvp" target="_blank" rel="noopener noreferrer">
            public repository
          </a>
          .
        </p>
      </section>

      <section id="disclaimer">
        <h2>9. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED <strong>&quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;</strong> WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will prevent gambling losses, detect all tilt patterns,
          block every unwanted game, or operate without interruption or error. Enforcement is a best-effort
          assistive layer — not a guarantee of self-control.
        </p>
      </section>

      <section id="liability">
        <h2>10. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TILTCHECK AND ITS AFFILIATES, OFFICERS, DIRECTORS,
          EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR GAMBLING OUTCOMES,
          ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED THE
          GREATER OF (A) USD $100 OR (B) THE AMOUNT YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS
          BEFORE THE CLAIM. THE SERVICE IS CURRENTLY OFFERED WITHOUT A PAID TIER; APPLICABLE LIMITS MAY
          UPDATE IF PAID FEATURES ARE INTRODUCED.
        </p>
      </section>

      <section id="indemnity">
        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless TiltCheck from claims, damages, losses, and expenses
          (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of
          these Terms, or your violation of any law or third-party right.
        </p>
      </section>

      <section id="termination">
        <h2>12. Termination</h2>
        <p>
          You may stop using the Service at any time by uninstalling the extension, logging out, and
          discontinuing use of the website. We may suspend or terminate access with or without notice if
          you breach these Terms or if we discontinue the Service.
        </p>
        <p>
          Sections that by their nature should survive termination (including disclaimers, limitation of
          liability, indemnity, and governing law) will survive.
        </p>
      </section>

      <section id="changes">
        <h2>13. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the revised Terms on this page and
          update the &quot;Last updated&quot; date. Material changes may also be announced via the website or
          Discord. Continued use after changes become effective constitutes acceptance of the revised Terms.
        </p>
      </section>

      <section id="law">
        <h2>14. Governing Law and Disputes</h2>
        <p>
          These Terms are governed by the laws of the <strong>State of Delaware, United States</strong>,
          without regard to conflict-of-law principles, except where mandatory consumer protections in your
          country of residence apply.
        </p>
        <p>
          Any dispute arising from these Terms or the Service will be resolved in the state or federal courts
          located in Delaware, unless applicable law requires a different forum. You waive any objection to
          venue in those courts.
        </p>
      </section>

      <section id="contact">
        <h2>15. Contact</h2>
        <p>
          Questions about these Terms:
        </p>
        <ul>
          <li>
            Email:{' '}
            <a href="mailto:support@tiltcheck.me">support@tiltcheck.me</a>
          </li>
          <li>
            Discord:{' '}
            <a href="https://discord.gg/gdBsEJfCar" target="_blank" rel="noopener noreferrer">
              TiltCheck community
            </a>
          </li>
        </ul>
      </section>
    </LegalDocument>
  );
}
