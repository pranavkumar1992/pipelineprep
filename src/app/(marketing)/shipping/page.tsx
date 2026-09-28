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
  title: "Shipping & Delivery",
  description:
    "PipelinePrep sells digital products only. Access is granted immediately after payment confirmation, with no physical shipment.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping & Delivery"
      updated={UPDATED}
      description="This document exists to satisfy payment gateway requirements for digital goods. It is short because there is nothing physical to ship."
    >
      <LegalSection heading="1. Digital products only">
        <p>
          {env.businessName()} sells digital educational content only: practice
          quizzes, written explanations, and guided troubleshooting scenarios,
          delivered through the {env.siteUrl()} website.
        </p>
        <p>
          We do not sell, stock, or dispatch any physical goods, merchandise,
          printed material, or equipment. No courier, postal service, or
          logistics provider is involved in fulfilling an order.
        </p>
      </LegalSection>

      <LegalNote title="No shipping charges">
        <p>
          There are no shipping, handling, or delivery charges. The amount you
          pay at checkout is the complete price, inclusive of GST
          ({env.gstRate()}%). No amount is added later for delivery.
        </p>
      </LegalNote>

      <LegalSection heading="2. How delivery works">
        <div className="space-y-3">
          <Clause label="Instantaneous delivery">
            <p>
              Access to Premium content is granted electronically and
              automatically, normally within seconds of your payment being
              confirmed. There is nothing to wait for and nothing to receive by
              post or courier.
            </p>
          </Clause>

          <Clause label="What counts as delivery">
            <p>
              Delivery is complete when your Premium access is active. We
              confirm this by email, including your invoice number. That email,
              together with the order and invoice number it contains, serves as
              the delivery receipt for your order.
            </p>
          </Clause>

          <Clause label="Who receives access">
            <p>
              Access is granted to the individual account associated with the
              email address used at checkout. Plans are personal licences and are
              not transferable between people or accounts.
            </p>
          </Clause>
          <Clause label="Where you can use it">
            <p>
              Access works from anywhere you can reach the website, so it is not
              limited to India. Pricing is quoted in INR.
            </p>
          </Clause>
        </div>
      </LegalSection>

      <LegalSection heading="3. If your access does not arrive">
        <p>
          Delivery failures are rare, but if your Premium access is not active
          within a few minutes of payment, or the confirmation email has not
          arrived, please contact us and we will resolve it. In order of
          likelihood, the cause is one of:
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            The confirmation email landed in spam or a promotions folder. Search
            for &ldquo;PipelinePrep&rdquo; and check those folders.
          </li>
          <li>
            You signed in with a different email address than the one used at
            checkout.
          </li>
          <li>
            Your bank shows a pending rather than completed payment. Access is
            granted once the payment settles.
          </li>
          <li>
            A payment notification did not reach us. Our refund policy requires
            you to contact us before filing a chargeback precisely so we can fix
            this quickly.
          </li>
        </ul>
        <p>
          Email{" "}
          <a
            href={`mailto:${env.businessSupportEmail()}`}
            className="text-brand-400 underline"
          >
            {env.businessSupportEmail()}
          </a>{" "}
          with your registered email address and payment reference. We aim to
          resolve delivery issues within one business day.
        </p>
      </LegalSection>

      <LegalSection heading="4. Returns and refunds">
        <p>
          Because delivery is instantaneous and digital, our returns position is
          governed by the{" "}
          <Link href="/refund" className="text-brand-400 underline">
            Refund Policy
          </Link>
          , which provides a 7-day money-back window on first purchases subject
          to a fair-use condition. That policy, rather than a physical-goods
          returns process, applies to all orders.
        </p>
      </LegalSection>

      <LegalSection heading="5. Related documents">
        <p>
          <Link href="/terms" className="text-brand-400 underline">
            Terms of Service
          </Link>{" "}
          &middot;{" "}
          <Link href="/privacy" className="text-brand-400 underline">
            Privacy Policy
          </Link>{" "}
          &middot;{" "}
          <Link href="/refund" className="text-brand-400 underline">
            Refund Policy
          </Link>{" "}
          &middot;{" "}
          <Link href="/contact" className="text-brand-400 underline">
            Contact
          </Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
