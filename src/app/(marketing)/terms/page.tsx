import type { Metadata } from "next";
import Link from "next/link";
import {
  Clause,
  LegalNote,
  LegalPage,
  LegalSection,
} from "@/components/marketing/legal-page";
import { env } from "@/lib/env";

const UPDATED = "1 October 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of PipelinePrep, including subscriptions, content licensing, acceptable use and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      description="These terms govern your use of PipelinePrep. By creating an account or purchasing a plan, you agree to them."
    >
      <LegalSection heading="1. Acceptance of these terms">
        <p>
          These Terms of Service (the &ldquo;Terms&rdquo;) form a binding
          agreement between you and {env.businessName()} (referred to as
          &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). They apply
          to your access to and use of the PipelinePrep website and any content
          made available through it (collectively, the &ldquo;Platform&rdquo;).
        </p>
        <p>
          By creating an account, purchasing a plan, or otherwise using the
          Platform, you confirm that you have read, understood, and agree to be
          bound by these Terms, together with our{" "}
          <Link href="/privacy" className="text-brand-400 underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/refund" className="text-brand-400 underline">
            Refund Policy
          </Link>
          . If you do not agree with any part of these Terms, you must not use
          the Platform.
        </p>
      </LegalSection>

      <LegalSection heading="2. What the Platform provides">
        <p>
          {env.businessName()} provides practice content for cloud and DevOps
          study, consisting of multiple-choice quizzes with written explanations,
          and guided troubleshooting scenario walkthroughs. Access to Premium
          content is granted for the period covered by the plan you purchase.
        </p>

        <LegalNote title="What we do not provide" tone="warning">
          <ul className="ml-4 list-disc space-y-1.5">
            <li>
              Live instructor-led or cohort classes. Content is self-paced and
              asynchronous.
            </li>
            <li>
              Hands-on cloud lab environments, sandboxes or free cloud credits.
            </li>
            <li>
              Any guarantee of passing an interview, certification exam, or
              securing a job. Our content is educational material.
            </li>
            <li>
              Career counselling, resume review, or one-to-one mentoring.
            </li>
          </ul>
        </LegalNote>

        <p className="mt-4">
          We may add, modify, or remove content from time to time. We aim to
          improve accuracy and coverage, and may correct or retire questions
          that become outdated as technology changes. Where a correction
          materially affects content you have already completed, we may grant a
          credit or extend your access at our discretion.
        </p>
      </LegalSection>

      <LegalSection heading="3. Account obligations">
        <p>
          You are responsible for activity that occurs under your account. To
          keep the Platform secure and to comply with our obligations, please:
        </p>
        <div className="space-y-3">
          <Clause label="Accurate details">
            <p>
              Register with a real email address you control, and keep your
              profile information reasonably accurate.
            </p>
          </Clause>
          <Clause label="Password security">
            <p>
              Choose a strong password and do not share it. You are responsible
              for all activity performed using your credentials, including by
              anyone you have permitted to use your device.
            </p>
          </Clause>
          <Clause label="One account per person">
            <p>
              Access is licensed to a single individual. Creating multiple
              accounts, or sharing, reselling, lending, or transferring an
              account or plan to another person, is a material breach of these
              Terms. We may suspend or terminate accounts that do this.
            </p>
          </Clause>
          <Clause label="Minimum age">
            <p>
              You must be at least 18 years old, or the age of majority in your
              jurisdiction, to create an account. The Platform is not directed
              at children.
            </p>
          </Clause>
        </div>
      </LegalSection>

      <LegalSection heading="4. Subscriptions, plans and payment">
        <Clause label="Plan duration">
          <p>
            Each plan grants Premium access for the specific period shown at
            checkout (for example, one month, six months, or twelve months).
            Access is time-boxed and is not a perpetual licence.
          </p>
        </Clause>
        <Clause label="No auto-renewal">
          <p>
            Plans do not renew automatically. There is nothing to cancel and no
            charge will be made after your paid period ends. To continue using
            Premium you must purchase another plan.
          </p>
        </Clause>
        <Clause label="Stacking">
          <p>
            If you purchase a plan while another is active, the new period is
            added to your remaining access rather than replacing it. Your expiry
            date moves forward accordingly.
          </p>
        </Clause>
        <Clause label="Pricing and taxes">
          <p>
            Prices are stated in Indian Rupees (INR) and are inclusive of GST at
            the prevailing rate ({env.gstRate()}%). We may change pricing with
            reasonable notice; changes do not affect a plan you have already
            purchased. A valid tax invoice is issued for each payment.
          </p>
        </Clause>
        <Clause label="Payment">
          <p>
            Payments are processed by a third-party payment gateway. We do not
            store your card, UPI, or banking credentials. You are responsible for
            the accuracy of the payment details you provide, and for any bank
            charges your provider may levy. A completed payment is confirmed
            either by the gateway notification or by your return to the Platform,
            and Premium is granted automatically on confirmation.
          </p>
        </Clause>
        <Clause label="Non-payment">
          <p>
            If a payment fails or is reversed, Premium may be suspended. Your
            progress and attempt history are preserved and are restored when
            payment is settled.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection heading="5. Intellectual property">
        <p>
          All content on the Platform, including question text, explanations,
          scenario narratives, code samples, written text, design, and the
          PipelinePrep name and branding, is owned by us or our licensors and is
          protected by copyright and other intellectual property laws.
        </p>
        <p>
          We grant you a limited, personal, non-exclusive, non-transferable,
          revocable licence to access and use the content for your own learning
          during your subscription period. This licence does not permit:
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Copying, downloading, scraping, or redistributing content, in whole
            or in part, whether by automated means or manual.
          </li>
          <li>
            Publishing, posting, or sharing content publicly, including on
            social media, forums, or file-sharing services.
          </li>
          <li>
            Selling, sublicensing, or giving access to third parties, including
            through shared or purchased accounts.
          </li>
          <li>
            Removing or altering copyright, attribution, or licence notices.
          </li>
        </ul>
        <p>
          Questions relating to third-party products and services are our
          original editorial expression. The names and trademarks of third
          parties, including Amazon Web Services, Kubernetes, the Cloud Native
          Computing Foundation, HashiCorp, Docker, and others, belong to their
          respective owners and are used for identification only.
        </p>
      </LegalSection>

      <LegalSection heading="6. Acceptable use">
        <p>You agree not to, and not to permit anyone else to:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Attempt to access Premium content without a valid subscription, or
            circumvent, bypass, or attempt to circumvent any access control,
            paywall, rate limit, or entitlement check.
          </li>
          <li>
            Use automated tools, crawlers, scrapers, or bots to harvest content,
            except the search engine crawlers permitted in our robots policy.
          </li>
          <li>
            Probe, test, or attack the vulnerability of the Platform or its
            infrastructure, or interfere with its operation.
          </li>
          <li>
            Transmit malware, unlawful content, or content that infringes the
            rights of others.
          </li>
        </ul>
        <p>
          We employ technical measures to detect and prevent unauthorised
          automated access. We may apply rate limits, suspend accounts engaged in
          abusive or automated behaviour, and pursue any remedy available to us
          where these Terms are breached.
        </p>
      </LegalSection>

      <LegalSection heading="7. Third-party links">
        <p>
          The Platform may contain links to external websites. We do not control
          those sites and are not responsible for their content, accuracy, or
          practices. Links are provided for convenience and do not imply
          endorsement.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimer of warranties">
        <p>
          The Platform and its content are provided on an &ldquo;as is&rdquo;
          and &ldquo;as available&rdquo; basis, without warranties of any kind,
          whether express or implied, including implied warranties of
          merchantability, fitness for a particular purpose, accuracy,
          non-infringement, and uninterrupted availability.
        </p>
        <p>
          <strong className="text-slate-200">
            Educational content is not professional advice.
          </strong>{" "}
          Nothing on the Platform constitutes legal, financial, security, or
          career advice. Cloud and DevOps practices described may not be
          appropriate for your circumstances; validate any approach against the
          documentation for the products you operate, and against your
          organisation&rsquo;s policies, before applying it in production.
        </p>
        <p>
          We are not affiliated with, endorsed by, or sponsored by Amazon Web
          Services, Kubernetes, the Cloud Native Computing Foundation,
          HashiCorp, Docker, or any certification or examination body. Reference
          to their certifications, products, or trademarks does not imply any
          association, and no certification is awarded by completing our content.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {env.businessName()}{" "}
          {env.businessGstin() && `(GSTIN: ${env.businessGstin()})`} and its
          officers, directors, employees, and agents will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or
          for any loss of profits, revenue, data, goodwill, or business
          opportunity, arising out of or in connection with your use of the
          Platform, whether in contract, tort (including negligence), strict
          liability, or otherwise, even if we have been advised of the
          possibility of such damages.
        </p>
        <p>
          Our total aggregate liability to you for all claims arising out of or
          relating to the Platform shall not exceed the amount you paid us in the
          twelve (12) months preceding the event giving rise to the claim, or
          INR 1,000, whichever is higher.
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited by law,
          including liability for fraud, fraudulent misrepresentation, or any
          liability that cannot lawfully be excluded. Certain jurisdictions do
          not allow the exclusion of certain warranties or liabilities, so parts
          of this section may not apply to you.
        </p>
      </LegalSection>

      <LegalSection heading="10. Suspension and termination">
        <p>
          You may delete your account at any time from your dashboard. Deleting
          your account permanently removes your personal data, attempt history,
          and saved progress, and cannot be undone. Subscriptions already paid
          for are not refunded automatically; see our{" "}
          <Link href="/refund" className="text-brand-400 underline">
            Refund Policy
          </Link>
          .
        </p>
        <p>
          We may suspend or terminate your access if you materially breach these
          Terms, for example by sharing an account, scraping content, or
          circumventing access controls. Where the breach is capable of being
          remedied, we will ordinarily give you notice and an opportunity to
          remedy it first. Termination does not affect accrued rights or
          liabilities.
        </p>
      </LegalSection>

      <LegalSection heading="11. Changes to these Terms">
        <p>
          We may revise these Terms from time to time. Where a change is
          material and affects your rights, we will provide reasonable notice
          (for example, by email or by posting a notice on the Platform) before
          it takes effect. Continuing to use the Platform after the effective
          date of a change constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="12. General provisions">
        <Clause label="Entire agreement">
          <p>
            These Terms, together with our Privacy Policy and Refund Policy,
            constitute the entire agreement between us regarding the Platform and
            supersede all prior statements and understandings.
          </p>
        </Clause>
        <Clause label="Severance">
          <p>
            If any provision is found unenforceable, the remaining provisions
            remain in full force.
          </p>
        </Clause>
        <Clause label="Waiver">
          <p>
            A failure to enforce any provision is not a waiver of that provision
            or of any other provision.
          </p>
        </Clause>
        <Clause label="Assignment">
          <p>
            We may assign these Terms in connection with a merger, reorganisation,
            or sale of all or substantially all of our assets. You may not assign
            these Terms without our prior written consent.
          </p>
        </Clause>
        <Clause label="Force majeure">
          <p>
            Neither party is liable for delay or failure caused by events beyond
            its reasonable control, including natural disasters, acts of
            government, widespread internet or power failure, or third-party
            service outages.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection heading="13. Governing law and jurisdiction">
        <p>
          These Terms are governed by and construed in accordance with the laws
          of India, excluding its conflict of law provisions. Subject to the
          dispute resolution steps below, the courts at{" "}
          <span className="font-mono text-brand-400">
            [operator city, India]
          </span>{" "}
          shall have exclusive jurisdiction over any dispute arising out of or in
          connection with these Terms. We may update this clause to name our
          registered place of business.
        </p>
        <p>
          Before commencing proceedings, you agree to raise the dispute with us
          first via the{" "}
          <Link href="/contact" className="text-brand-400 underline">
            contact page
          </Link>{" "}
          and allow a reasonable opportunity to resolve it informally. Nothing in
          this clause prevents either party from seeking urgent injunctive
          relief in any court of competent jurisdiction.
        </p>
      </LegalSection>

      <LegalSection heading="14. Contact">
        <p>
          Questions about these Terms can be sent to{" "}
          <a
            href={`mailto:${env.businessSupportEmail()}`}
            className="text-brand-400 underline"
          >
            {env.businessSupportEmail()}
          </a>
          {env.businessPhone() ? ` or by phone on ${env.businessPhone()}` : ""}
          .
          {env.businessAddress() && (
            <>
              {" "}
              Our registered address is {env.businessAddress()}.
            </>
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
