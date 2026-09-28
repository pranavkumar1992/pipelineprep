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
  title: "Privacy Policy",
  description:
    "How PipelinePrep collects, uses, stores and protects your personal data under the Digital Personal Data Protection Act, 2023.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      description={`This policy explains what personal data ${env.businessName()} collects, why we collect it, how long we keep it, and the rights you have over it.`}
    >
      <LegalSection heading="1. Who we are and scope">
        <p>
          {env.businessName()} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates
          the PipelinePrep website at {env.siteUrl()}. This policy covers the
          Platform, including accounts, purchases, quizzes, and scenarios.
        </p>
        <p>
          We process personal data in accordance with the{" "}
          <strong className="text-slate-200">
            Digital Personal Data Protection Act, 2023
          </strong>{" "}
          (the &ldquo;DPDP Act&rdquo;) and applicable rules made under it. Where
          this policy is inconsistent with the DPDP Act, the Act prevails.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we collect">
        <LegalNote title="We do not collect payment credentials">
          <p>
            Card numbers, UPI handles, and banking credentials are entered
            directly into our payment gateway (Razorpay) and are never received,
            stored, or transmitted through our servers. We store only the payment
            identifiers, amount, and status needed to grant and record access, and
            we receive a limited transaction report from the gateway. Razorpay
            handles your payment data under its own privacy policy and its
            PCI DSS obligations.
          </p>
        </LegalNote>

        <p className="mt-5">
          We collect the following categories of data:
        </p>

        <div className="space-y-4">
          <Clause label="Account data">
            <p>
              Your email address, hashed password, display name, and account
              creation date. If you choose to provide them: your target role,
              experience level, and leaderboard display preference.
            </p>
          </Clause>

          <Clause label="Practice activity">
            <p>
              Quiz attempts and your answers, scores, time taken, scenario
              progress and completion, and bookmarks. This is what powers your
              dashboard, history, and score tracking. If you do not want us to
              retain this history, you can delete your account.
            </p>
          </Clause>

          <Clause label="Purchase and billing records">
            <p>
              Your plan, the amount paid, any coupon applied, order and invoice
              numbers, payment and order identifiers from the gateway, and
              subscription start and expiry dates. We retain these because tax
              and accounting law requires it.
            </p>
          </Clause>

          <Clause label="Messages">
            <p>
              If you contact us, we collect the name, email address, and content
              of your message so we can respond.
            </p>
          </Clause>

          <Clause label="Technical data">
            <p>
              Our servers may process your IP address, user agent, and request
              logs for security, rate limiting, and diagnosing errors. We keep
              these briefly and do not use them to build advertising profiles.
            </p>
          </Clause>
        </div>

        <p className="mt-4">
          We also record aggregated, non-identifying usage statistics (for
          example, how many people attempted a given quiz) to decide what content
          to write next. These statistics are not linked to an individual.
        </p>
      </LegalSection>

      <LegalSection heading="3. How we use your data, and on what basis">
        <p>We process data only for the purposes listed here:</p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-slate-200">To provide the service.</strong>{" "}
            Authenticating you, delivering quizzes and scenarios, grading your
            answers, and showing your progress and history.
          </li>
          <li>
            <strong className="text-slate-200">
              To process payments and meet legal obligations.
            </strong>{" "}
            Granting Premium access, issuing tax invoices, and retaining records
            required by tax and accounting law.
          </li>
          <li>
            <strong className="text-slate-200">To secure the service.</strong>{" "}
            Preventing abuse, enforcing rate limits, detecting fraud, and
            investigating account compromise.
          </li>
          <li>
            <strong className="text-slate-200">To communicate with you.</strong>{" "}
            Password reset links, receipts, subscription expiry reminders, and
            replies to your messages.
          </li>
          <li>
            <strong className="text-slate-200">To improve the service.</strong>{" "}
            Understanding which content is useful through aggregated statistics.
          </li>
        </ul>
        <p className="mt-4">
          Our lawful bases, as recognised by the DPDP Act, are performance of a
          contract (for accounts, content, and payments), compliance with a legal
          obligation (tax and accounting records), and legitimate interests
          (security, fraud prevention, and service improvement). We do not use
          your data for cross-context behavioural advertising, and we do not sell
          or share your personal data with third parties for their own marketing.
        </p>
        <p>
          Where consent is the appropriate basis (for example, optional
          marketing emails), you may withdraw it at any time without affecting
          the lawfulness of processing carried out before withdrawal. Service and
          transactional emails are not marketing and cannot be opted out of
          while you hold an account.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies and local storage">
        <p>
          We use a small number of cookies, all necessary rather than optional:
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-slate-200">
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-brand-400">
                pp_session
              </code>
            </strong>{" "}
            &mdash; a signed, HTTP-only session cookie that keeps you signed in.
            It contains only an identifier and a signature; it does not contain
            your personal data in readable form.
          </li>
          <li>
            <strong className="text-slate-200">Rate limiting</strong> &mdash;
            short-lived server-side records keyed by IP address used to prevent
            automated abuse of sign-in and checkout.
          </li>
        </ul>
        <p>
          We do not use advertising cookies or third-party tracking pixels. If
          privacy-respecting analytics are enabled, they are configured to set
          no cookies and to record no cross-site identifiers.
        </p>
      </LegalSection>

      <LegalSection heading="5. Who we share data with">
        <p>
          We share the minimum necessary data with the following categories of
          processors, each bound to use the data only to provide services to us:
        </p>
        <div className="space-y-4">
          <Clause label="Payment gateway">
            <p>
              Razorpay, for processing payments, verifying them, and issuing
              refunds. Your payment credentials go directly to them and are not
              held by us.
            </p>
          </Clause>
          <Clause label="Cloud hosting">
            <p>
              Amazon Web Services, which hosts our servers and database. Data is
              stored in an AWS region in India wherever practicable.
            </p>
          </Clause>
          <Clause label="Email delivery">
            <p>
              An email delivery provider (Amazon SES or equivalent) that sends
              transactional emails on our behalf, such as password resets and
              invoices.
            </p>
          </Clause>
          <Clause label="Professional advisers">
            <p>
              Accountants, auditors, and legal advisers, where required to comply
              with our legal and tax obligations.
            </p>
          </Clause>
        </div>
        <p className="mt-4">
          We do not sell personal data, rent mailing lists, or disclose personal
          data to third parties for their own commercial purposes. We may
          disclose data where required by law, a valid court order, or to
          establish or defend legal claims.
        </p>
      </LegalSection>

      <LegalSection heading="6. How long we keep data">
        <div className="space-y-3">
          <Clause label="Account data">
            <p>
              For as long as your account is active, and for 12 months
              afterwards unless you ask us to delete it sooner.
            </p>
          </Clause>
          <Clause label="Practice history">
            <p>
              Until you delete your account, or 12 months after your last
              activity.
            </p>
          </Clause>
          <Clause label="Billing records">
            <p>
              Retained for 8 years from the date of transaction, as required by
              Indian tax and accounting law, even if you delete your account.
            </p>
          </Clause>
          <Clause label="Security logs">
            <p>
              Typically 90 days, or longer where needed to investigate an
              incident.
            </p>
          </Clause>
        </div>
        <p className="mt-4">
          Data is deleted or anonymised when the applicable period ends.
          Anonymised aggregate statistics may be retained indefinitely because
          they cannot be linked back to you.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          Under the DPDP Act, you have the following rights. To exercise any of
          them, email{" "}
          <a
            href={`mailto:${env.businessSupportEmail()}`}
            className="text-brand-400 underline"
          >
            {env.businessSupportEmail()}
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="text-brand-400 underline">
            contact page
          </Link>
          . We respond within 30 days and may ask you to verify your identity
          first.
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-slate-200">Access.</strong> A copy of the
            personal data we hold about you, and information about how we use it.
          </li>
          <li>
            <strong className="text-slate-200">Correction.</strong> Have
            inaccurate or incomplete data corrected. You can edit most profile
            fields yourself from your dashboard.
          </li>
          <li>
            <strong className="text-slate-200">Erasure.</strong> Have your
            data erased, where there is no overriding legal reason to keep it.
            Note that billing records must be retained for tax purposes, and that
            deleting your account removes your progress and history permanently.
          </li>
          <li>
            <strong className="text-slate-200">
              Data portability / export.
            </strong>{" "}
            Receive your data in a structured, commonly used, machine-readable
            format. Ask us and we will provide a JSON export of your account,
            attempts, and orders.
          </li>
          <li>
            <strong className="text-slate-200">Withdraw consent.</strong> Where
            we rely on consent, withdraw it at any time.
          </li>
          <li>
            <strong className="text-slate-200">Nominate someone.</strong>{" "}
            Where you are unable to exercise these rights yourself, you may
            nominate another person to do so on your behalf.
          </li>
          <li>
            <strong className="text-slate-200">Grievance redressal.</strong>{" "}
            Raise a complaint and receive a response. See section 10.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="8. Security practices">
        <p>
          We apply technical and organisational measures proportionate to the
          risk, including:
        </p>
        <ul className="ml-4 list-disc space-y-2">
          <li>
            Encryption of data in transit using TLS, with HTTPS enforced across
            the whole Platform.
          </li>
          <li>
            Passwords hashed with bcrypt using a per-password salt. We never
            store or log plaintext passwords, and we cannot see your password.
          </li>
          <li>
            Premium content access checked on the server for every request.
            Correct answers and premium scenario content are not sent to clients
            that are not entitled to see them.
          </li>
          <li>
            Rate limiting on sign-in, sign-up, password reset, contact, and
            checkout endpoints to prevent abuse and credential stuffing.
          </li>
          <li>
            Webhook signature verification on payment notifications, so
            subscription state cannot be altered by forged requests.
          </li>
          <li>
            Regular database backups, and access controls limiting who can reach
            production data.
          </li>
        </ul>
        <p className="mt-4">
          No system is perfectly secure. If we become aware of a personal data
          breach that is likely to harm you, we will notify the Data Protection
          Board and notify you without delay as required by the DPDP Act,
          including a description of the breach, the likely consequences, and
          the remedial measures taken.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children's data">
        <p>
          The Platform is not directed at children, and we do not knowingly
          collect personal data from anyone under 18. If you are under 18, do
          not create an account. If you believe a child has created one, contact
          us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection heading="10. Grievance officer and contact">
        <p>
          In line with the DPDP Act, we have designated a grievance officer who
          is responsible for ensuring compliance and addressing complaints about
          the processing of personal data.
        </p>
        <div className="space-y-2">
          <p>
            <span className="text-slate-400">Grievance Officer:</span>{" "}
            <span className="text-slate-200">
              [Name, to be published]
            </span>
          </p>
          <p>
            <span className="text-slate-400">Email:</span>{" "}
            <a
              href={`mailto:${env.businessSupportEmail()}`}
              className="text-brand-400 underline"
            >
              {env.businessSupportEmail()}
            </a>
          </p>
          {env.businessAddress() ? (
            <p>
              <span className="text-slate-400">Address:</span>{" "}
              <span className="text-slate-300">{env.businessAddress()}</span>
            </p>
          ) : null}
        </div>
        <p>
          If you are not satisfied with our response, you may approach the
          Data Protection Board of India. We would rather you raise it with us
          first, and we will treat that as a priority.
        </p>
      </LegalSection>

      <LegalSection heading="11. International transfers and hosting">
        <p>
          Our servers and database are hosted on Amazon Web Services. We use an
          AWS region in India as our primary location. Some service providers
          (for example, email delivery or support tooling) may process data
          outside India. Where personal data is transferred outside India, we
          rely on contractual safeguards and, where required, obtain any
          certification or consent mandated by the DPDP Act.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          announced on the Platform or by email before they take effect. Your
          rights under the DPDP Act apply regardless of the version of this
          policy in force when your data was collected.
        </p>
      </LegalSection>

      <LegalSection heading="13. Related documents">
        <p>
          See also our{" "}
          <Link href="/terms" className="text-brand-400 underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/refund" className="text-brand-400 underline">
            Refund Policy
          </Link>
          , and{" "}
          <Link href="/shipping" className="text-brand-400 underline">
            Shipping &amp; Delivery
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
