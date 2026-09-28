import type { Metadata } from "next";
import Link from "next/link";
import {
  getPaymentSettings,
  isCareerToolsLive,
  maskSecret,
} from "@/lib/settings";
import { saveSettingsAction } from "@/app/actions/admin";
import { AdminEditor, AInput, ACheckbox } from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Settings" };

/**
 * Payment and feature settings.
 *
 * Values saved here go to the database. Environment variables take precedence
 * when set, and the page says which source each credential is coming from so a
 * value that appears to save but has no effect is visible rather than confusing.
 */
export default async function AdminSettingsPage() {
  const [settings, careerLive] = await Promise.all([
    getPaymentSettings(),
    isCareerToolsLive(),
  ]);

  const lockedByEnv = {
    keyId: Boolean(process.env.RAZORPAY_KEY_ID),
    keySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
    webhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
  };

  const ready = settings.keyId !== "" && settings.keySecret !== "";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Payment credentials, tax rate and feature switches.
        </p>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          ready && settings.checkoutEnabled
            ? "border-mint-400/30 bg-mint-400/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            ready && settings.checkoutEnabled ? "text-mint-200" : "text-amber-200"
          }`}
        >
          {ready
            ? settings.checkoutEnabled
              ? "Checkout is live."
              : "Keys are present but checkout is switched off."
            : "Checkout is not live — no Razorpay key pair is configured."}
        </p>
        <p className="mt-1.5 text-sm text-slate-400">
          {ready
            ? settings.keyId
            : "Paste your Razorpay key ID and key secret below. Find them in Razorpay Dashboard → Settings → API Keys."}
        </p>
      </div>

      <AdminEditor title="Payment and feature settings" action={saveSettingsAction} defaultOpen>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-400">Razorpay</p>
            <p className="text-[11px] text-slate-500">
              Currently using {settings.sources.keyId === "env" ? "the environment" : settings.sources.keyId === "database" ? "the saved value" : "nothing"}
              {" "}({maskSecret(settings.keyId)}).
            </p>
          </div>

          <AInput
            label="Key ID"
            name="keyId"
            defaultValue={lockedByEnv.keyId ? undefined : settings.keyId}
            placeholder={lockedByEnv.keyId ? "Set in environment" : "rzp_live_xxxxxxxx"}
            hint={
              lockedByEnv.keyId
                ? "RAZORPAY_KEY_ID is set in the environment and wins. Clear it there to change this from the panel."
                : "Public key. Safe to expose to the browser."
            }
          />

          <AInput
            label="Key secret"
            name="keySecret"
            type="password"
            defaultValue={lockedByEnv.keySecret ? undefined : settings.keySecret}
            placeholder={lockedByEnv.keySecret ? "Set in environment" : "Secret, never shown again"}
            hint={
              lockedByEnv.keySecret
                ? "RAZORPAY_KEY_SECRET is set in the environment and wins."
                : "Leave blank to keep the current value."
            }
          />

          <AInput
            label="Webhook secret"
            name="webhookSecret"
            type="password"
            defaultValue={lockedByEnv.webhookSecret ? undefined : settings.webhookSecret}
            placeholder={lockedByEnv.webhookSecret ? "Set in environment" : "Secret, never shown again"}
            hint={
              lockedByEnv.webhookSecret
                ? "RAZORPAY_WEBHOOK_SECRET is set in the environment and wins."
                : "Required for the payment webhook to verify requests."
            }
          />

          <AInput
            label="GST rate (%)"
            name="gstRate"
            type="number"
            defaultValue={settings.gstRate}
            hint="Added on top of the listed price at checkout."
          />

          <div className="space-y-3 border-t border-ink-800 pt-4">
            <ACheckbox
              label="Checkout enabled"
              name="checkoutEnabled"
              defaultChecked={settings.checkoutEnabled}
              hint="Turn off to stop new payments without removing your keys."
            />
            <ACheckbox
              label="Career Tools teaser"
              name="careerToolsEnabled"
              defaultChecked={careerLive}
              hint="Shows the waitlist teaser and the /career-tools page. Still teaser only."
            />
          </div>
        </div>
      </AdminEditor>

      <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="font-semibold text-white">Webhook endpoint</h2>
        <p className="mt-2 text-sm text-slate-400">
          Point the Razorpay webhook at this URL for the{" "}
          <code className="font-mono text-brand-400">order.paid</code> event.
        </p>
        <code className="mt-3 block overflow-x-auto rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2.5 font-mono text-xs text-slate-300">
          {process.env.NEXT_PUBLIC_SITE_URL ?? "https://pipelineprep.in"}/api/webhooks/razorpay
        </code>
      </section>
    </div>
  );
}
