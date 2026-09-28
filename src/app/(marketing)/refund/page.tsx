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
  title: "Refund Policy",
  description:
    "Our refund terms: a 7-day money-back window on first purchases, conditions on consumption, how refunds are processed, and what is not refundable.",
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated={UPDATED}
      description="We want you to be able to try PipelinePrep without financial risk. Here is exactly when we refund, and when we do not."
    >
      <LegalSection heading="1. The short version">
        <p>
          If PipelinePrep is not working for you, tell us within 7 days of your
          first purchase and we will refund you, provided you have not consumed a
          material portion of the content. We do not ask you to justify your
          reason.
        </p>
        <LegalNote title="Our commitment">
          <p>
            We will not ask you to sit through a retention call, and we will not
            make you argue with an automated system. Email us, include your
            registered email address and payment reference, and we will process
            the refund.
          </p>
        </LegalNote>
      </LegalSection>

      <LegalSection heading="2. The 7-day money-back window">
        <div className="space-y-3">
          <Clause label="Who qualifies">
            <p>
              The window applies to your <strong className="text-slate-200">
                first purchase
              </strong>{" "}
              on PipelinePrep. It is measured from the date and time your payment
              was confirmed, in Indian Standard Time.
            </p>
          </Clause>

          <Clause label="What the window covers">
            <p>
              Seven (7) calendar days from the purchase date. We review refund
              requests within 5 to 7 working days of receiving them. A request
              sent on day 8 is outside the window and cannot be refunded under
              this policy.
            </p>
          </Clause>

          <Clause label="Condition: no material consumption">
            <p>
              To keep this fair to everyone, a refund can be declined if a
              material portion of the Premium content has been accessed. For our
              purposes, material consumption is:
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1.5">
              <li>
                Attempting more than 20% of the Premium quizzes or Premium
                scenarios available on the plan, or
              </li>
              <li>
                Attempting 10 or more individual Premium quizzes or scenarios.
              </li>
            </ul>
            <p className="mt-2">
              Browsing the catalogue, reading topic descriptions, viewing
              previews, and playing any free content do not count as consumption
              of Premium material.
            </p>
          </Clause>

          <Clause label="We ask first">
            <p>
              If we believe a request falls just outside the consumption
              condition, we will tell you where you stand and give you the
              chance to withdraw the request. We do not quietly decline.
            </p>
          </Clause>
        </div>
      </LegalSection>

      <LegalSection heading="3. How to request a refund">
        <p>
          Email{" "}
          <a
            href={`mailto:${env.businessSupportEmail()}`}
            className="text-brand-400 underline"
          >
            {env.businessSupportEmail()}
          </a>{" "}
          with both of the following:
        </p>
        <ol className="ml-4 list-decimal space-y-1.5">
          <li>the email address on your PipelinePrep account, and</li>
          <li>
            the payment reference, invoice number, or the last four digits of the
            card or UPI reference used.
          </li>
        </ol>
        <p>
          You can also raise it from the{" "}
          <Link href="/contact" className="text-brand-400 underline">
            contact page
          </Link>
          . A short note is fine. You do not need to write an explanation, and
          we will not ask for one.
        </p>
      </LegalSection>

      <LegalSection heading="4. How refunds are processed">
        <div className="space-y-3">
          <Clause label="Review window">
            <p>
              We acknowledge requests within 2 working days and complete our
              review within 5 to 7 working days.
            </p>
          </Clause>

          <Clause label="Method and timing">
            <p>
              Approved refunds are returned to your original payment method. The
              time the money takes to appear depends on your bank or UPI
              provider, typically 5 to 10 working days after we submit the refund
              to the payment gateway. We cannot refund to a different account,
              card, or UPI ID than the one used for the purchase.
            </p>
          </Clause>

          <Clause label="No cash refunds">
            <p>
              Refunds are made only to the original payment method. We do not pay
              cash, bank transfer to an unrelated account, or gift card
              balances.
            </p>
          </Clause>

          <Clause label="Gateway fees">
            <p>
              Any non-refundable processing fee charged by the payment gateway or
              your bank may be deducted from the refund amount. Where we can
              recover such fees from the gateway, we return the full amount to
              you.
            </p>
          </Clause>
        </div>
      </LegalSection>

      <LegalSection heading="5. What happens to your account">
        <p>
          When a refund is processed, Premium access ends immediately or at the
          end of the current paid period, whichever we agree with you. Your
          account, attempt history, and saved progress are not deleted, so if you
          purchase again later your history is intact. We may suspend Premium
          content access while a refund request is being reviewed, in which case
          you will be told.
        </p>
      </LegalSection>

      <LegalSection heading="6. Cases where we cannot refund">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong className="text-slate-200">Renewals after the window.</strong>{" "}
            A second or later purchase is not covered by the 7-day money-back
            window, because the 7-day guarantee applies to a first purchase where
            you are evaluating the product for the first time.
          </li>
          <li>
            <strong className="text-slate-200">Consumed content.</strong>{" "}
            Where the consumption condition in section 2 is met, we may decline a
            request. We will explain which threshold you reached.
          </li>
          <li>
            <strong className="text-slate-200">Free content.</strong>{" "}
            Free-tier content is not a purchase and cannot be refunded. We do not
            charge for it.
          </li>
          <li>
            <strong className="text-slate-200">Chargebacks.</strong> If you file
            a chargeback or dispute directly with your bank without contacting us
            first, we are generally unable to process a refund separately, and
            the bank process takes considerably longer.
          </li>
          <li>
            <strong className="text-slate-200">Abuse and fraud.</strong>{" "}
            Accounts involved in payment fraud, refund abuse, account sharing for
            resale, or circumventing access controls are not eligible.
          </li>
          <li>
            <strong className="text-slate-200">Partial refunds.</strong>{" "}
            We do not offer partial or pro-rated refunds on elapsed time. If your
            situation is genuinely exceptional, contact us anyway and we will
            consider it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Disputes and chargebacks">
        <p>
          Please contact us first. Most billing issues are a failed webhook, a
          duplicate charge, or a payment captured after a timeout, all of which we
          can resolve within a day. We would always rather fix a billing problem
          than defend a chargeback, which is slow and costly for you.
        </p>
        <p>
          If you do file a chargeback, your Premium access may be suspended while
          the bank investigates. This is not a decision we enjoy, but it protects
          the platform against repeat disputes.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          We may update this policy, and updated terms will apply to refunds
          requested after the change takes effect. Where we make a change that
          is more favourable to you, the new terms apply to your existing
          purchase.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Refund requests:{" "}
          <a
            href={`mailto:${env.businessSupportEmail()}`}
            className="text-brand-400 underline"
          >
            {env.businessSupportEmail()}
          </a>
          {env.businessPhone() ? `, or ${env.businessPhone()}` : ""}.
          {env.businessGstin() && (
            <>
              {" "}
              GSTIN: <span className="font-mono">{env.businessGstin()}</span>
            </>
          )}
          . Please include your account email and payment reference so we can act
          quickly.
        </p>
        <p className="mt-4">
          See also our{" "}
          <Link href="/terms" className="text-brand-400 underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link href="/privacy" className="text-brand-400 underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/shipping" className="text-brand-400 underline">
            Shipping &amp; Delivery
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
