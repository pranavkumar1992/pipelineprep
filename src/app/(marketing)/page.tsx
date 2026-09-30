import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Flame, Target, TrendingUp, Sparkles, Zap, Bot } from "lucide-react";
import {
  getContentStats,
  getTopicsWithCounts,
  listScenarios,
} from "@/lib/content";
import { getCurrentUser } from "@/lib/auth/session";
import { isCareerToolsLive } from "@/lib/settings";
import { ButtonLink } from "@/components/ui/button";
import { AccessBadge, DifficultyBadge } from "@/components/ui/badges";
import { CareerToolsCard } from "@/components/career-tools/career-tools-card";
import { AiHeroShowcase } from "@/components/marketing/ai-hero-showcase";
import { pluralize } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DevOps practice quizzes and incident scenarios",
  description:
    "Practise AWS, Linux, Docker, Kubernetes, Terraform, CI/CD, monitoring, networking and IAM. Instant feedback with real explanations, plus guided incident walkthroughs.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [topics, stats, scenarios, user, careerLive] = await Promise.all([
    getTopicsWithCounts(),
    getContentStats(),
    listScenarios({ take: 3 }),
    getCurrentUser(),
    isCareerToolsLive(),
  ]);

  // Signed-in users go straight to practice rather than the pitch.
  if (user) redirect("/dashboard");

  return (
    <>
      {/*
        Hero.

        Split layout rather than one centred slogan: the left column sells the
        outcome, the right column shows the product itself. A single centred
        headline read like a landing page for a side project; showing the actual
        dashboard and quiz UI in-frame reads like a platform people pay for.
      */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="pp-grid absolute inset-0" aria-hidden="true" />
        <div className="pp-glow absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10 lg:py-24">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3.5 py-1 text-xs font-mono text-brand-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              <span>Next-Gen DevOps AI Studio</span>
              <span className="text-slate-600">&middot;</span>
              <span className="text-slate-300">Live Incident &amp; Prep Engine</span>
            </div>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              The AI-Powered
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-mint-400 bg-clip-text text-transparent">
                DevOps &amp; SRE
              </span>{" "}
              Interview Platform.
            </h1>

            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
              Simulate real-world cloud outages, diagnose weak areas with adaptive AI
              question banks, and audit your resume against live job descriptions. Master the
              architectural decisions behind every single failure.
            </p>

            {/* Capability list: what the platform actually does, up front. */}
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check
                    size={15}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-mint-400"
                  />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto shadow-lg shadow-brand-500/20">
                <Sparkles size={16} className="text-white" />
                Start AI Practice Free
              </ButtonLink>
              <ButtonLink
                href="/career-tools"
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Explore AI Career Tools
              </ButtonLink>
            </div>

            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-mint-400" />
              Instant free access &middot; No credit card required &middot; 30 question banks &amp; scenarios included
            </p>
          </div>

          {/* Product panel */}
          <AiHeroShowcase />
        </div>

        {/* Trust strip */}
        <div className="relative border-t border-ink-800/70 bg-ink-950/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-4">
            {[
              { value: stats.questions.toLocaleString("en-IN"), label: "Practice questions" },
              { value: String(stats.topics), label: "DevOps topics" },
              { value: String(stats.scenarios), label: "Incident walkthroughs" },
              { value: "3", label: "Levels per topic" },
            ].map((stat) => (
              <div key={stat.label} className="px-2 py-6 text-center sm:py-7">
                <p className="font-mono text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A sample question, so visitors see the product before signing up. */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-500">
              Sample question
            </span>
            <DifficultyBadge level="MEDIUM" />
          </div>

          <p className="mt-4 text-base font-medium leading-relaxed text-slate-100 sm:text-lg">
            Your ALB returns 502 on every request. Health checks pass. What does
            that specifically indicate?
          </p>

          <ul className="mt-5 space-y-2">
            {[
              "Client could not resolve the DNS name",
              "The load balancer could not get a valid response from a target",
              "The ALB security group blocked inbound traffic",
              "The database rejected the health check",
            ].map((option, i) => (
              <li
                key={option}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                  i === 1
                    ? "border-mint-400/40 bg-mint-400/10 text-mint-300"
                    : "border-ink-700 bg-ink-850 text-slate-400"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 font-mono text-xs"
                >
                  {i === 1 ? "\u2713" : String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{option}</span>
                {i === 1 ? (
                  <span className="sr-only">Correct answer</span>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg border border-ink-700 bg-ink-850 p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-brand-400">
              Why
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              502 is generated by the load balancer after it accepted the TCP
              connection but failed talking to the target: connection refused,
              reset, or an early close. 503 means no healthy targets at all, and
              504 is a timeout. So client DNS is ruled out, which saves an hour
              of looking in the wrong place. Every answer on PipelinePrep comes
              with this reasoning.
            </p>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            That is one of {pluralize(stats.questions, "question")} waiting for
            you.{" "}
            <Link href="/signup" className="text-brand-400 underline underline-offset-4">
              Create a free account
            </Link>{" "}
            to start.
          </p>
        </div>
      </section>

      {/* Three feature blocks */}
      <section className="border-y border-ink-800 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three ways to practise
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
            Video teaches you concepts. These make you capable under pressure.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-ink-700 bg-ink-900 p-6 transition-colors hover:border-ink-600"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-brand-400/25 bg-brand-400/10 font-mono text-lg text-brand-400"
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                  {feature.body}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {feature.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topic grid */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Ten topics, one question bank
            </h2>
            <p className="mt-3 max-w-xl text-slate-400">
              Every topic has its own quizzes, difficulty mix and scenario
              walkthroughs. Pick where you are weakest.
            </p>
          </div>
          <ButtonLink href="/quizzes" variant="secondary" size="sm">
            Browse all quizzes
          </ButtonLink>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href="/quizzes"
              className="group rounded-xl border border-ink-700 bg-ink-900 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-ink-850"
            >
              <div
                aria-hidden="true"
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 font-mono text-sm text-brand-400 transition-colors group-hover:border-brand-400/40"
              >
                {topic.icon.slice(0, 2)}
              </div>
              <h3 className="text-sm font-semibold text-white">{topic.name}</h3>
              <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                {topic.questionCount} Q &middot; {topic.scenarioCount} S
              </p>
              <span className="sr-only">Open the {topic.name} banks</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured content */}
      <section className="border-t border-ink-800 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Real-world scenarios
          </h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Step-by-step troubleshooting walkthroughs. Each step asks what you
            would check next, then explains the reasoning and shows the commands.
          </p>

          <div className="mt-10 space-y-3">
            {scenarios.map((scenario) => (
              <Link
                key={scenario.slug}
                href={`/scenarios/${scenario.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-ink-700 bg-ink-900 p-5 transition-all hover:border-brand-400/40 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-brand-400">
                      {scenario.topic.name}
                    </span>
                    <DifficultyBadge level={scenario.difficulty} />
                    <AccessBadge isPremium={scenario.isPremium} />
                    {scenario.durationMin ? (
                      <span className="font-mono text-[11px] text-slate-500">
                        ~{scenario.durationMin} min
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 font-semibold text-white group-hover:text-brand-400">
                    {scenario.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    {scenario.summary}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-600 group-hover:text-brand-400 sm:text-sm">
                  {scenario.stepCount} steps &rarr;
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-20 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Start with a quiz
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Beginner banks are free in every topic. Each attempt draws twenty
                random questions with a written explanation for every answer.
              </p>
            </div>
            <Link
              href="/quizzes"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:underline"
            >
              All {stats.topics * 3} banks
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topics.slice(0, 8).map((topic) => (
              <Link
                key={topic.id}
                href="/quizzes"
                className="group rounded-xl border border-ink-700 bg-ink-900 p-5 transition-all hover:border-brand-400/40"
              >
                <h3 className="font-semibold text-white group-hover:text-brand-400">
                  {topic.name}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">
                  {topic.description}
                </p>
                <p className="mt-4 font-mono text-[11px] text-slate-500">
                  {pluralize(topic.questionCount, "question")} &middot; 3 levels
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Career Tools teaser (addendum). Waitlist only — nothing is built yet. */}
      {careerLive ? (
        <section className="border-t border-ink-800 bg-ink-900/50">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <CareerToolsCard source="LANDING" isSignedIn={false} />
          </div>
        </section>
      ) : null}

      {/* Social proof (M-8) */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          What learners say
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 p-6"
            >
              <div aria-label={`Rated ${t.rating} out of 5`} className="text-amber-400">
                {"\u2605".repeat(t.rating)}
                <span className="text-slate-500">
                  {"\u2605".repeat(5 - t.rating)}
                </span>
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-ink-800 pt-4">
                <span className="text-sm font-medium text-white">{t.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {t.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink-800 bg-ink-900/50">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Frequently asked
          </h2>
          <div className="mt-10 divide-y divide-ink-800">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-white marker:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-slate-500 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Your next interview will ask these questions
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Practise free, upgrade when you are ready. Premium starts at{" "}
          &#8377;199 and covers every quiz and scenario.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
            Create free account
          </ButtonLink>
          <ButtonLink
            href="/pricing"
            size="lg"
            variant="secondary"
            className="w-full sm:w-auto"
          >
            See plans
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

/**
 * Hero capability bullets. Concrete and product-shaped rather than marketing
 * adjectives, so a visitor can tell what they are signing up for.
 */
const HERO_POINTS = [
  "AI Incident Simulator (AWS, K8s, Linux)",
  "Adaptive Weak-Area Question Engine",
  "AI Resume Review & ATS Job Matcher",
  "Deep Root-Cause Explanations for Every Answer",
  "Interactive Multi-Step Diagnostics",
  "Daily Cloud Incident Challenges & Streaks",
];

/**
 * Static preview of the product, in-frame next to the pitch.
 *
 * Deliberately hardcoded rather than a screenshot: it stays crisp on any display,
 * needs no asset pipeline, and cannot go stale against the live UI.
 */
function HeroPanel() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-3xl bg-brand-400/10 blur-3xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl shadow-black/50">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-950 px-4 py-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          </span>
          <span className="ml-2 truncate font-mono text-xs text-slate-500">
            pipelineprep.in/dashboard
          </span>
        </div>

        <div className="space-y-4 p-5">
          {/* Streak + goal */}
          <div className="grid grid-cols-3 gap-3">
            <PanelStat
              icon={<Flame size={13} aria-hidden="true" />}
              tone="amber"
              label="Streak"
              value="12 days"
            />
            <PanelStat
              icon={<Target size={13} aria-hidden="true" />}
              tone="brand"
              label="Today"
              value="10 / 10"
            />
            <PanelStat
              icon={<TrendingUp size={13} aria-hidden="true" />}
              tone="mint"
              label="Accuracy"
              value="82%"
            />
          </div>

          {/* Live question */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide">
              <span className="text-brand-400">Kubernetes</span>
              <span className="text-slate-600">Question 3 of 20</span>
            </div>
            <p className="mt-2.5 text-sm font-medium leading-relaxed text-white">
              A pod is CrashLoopBackOff. Which command shows the previous
              container&apos;s logs?
            </p>

            <ul className="mt-3 space-y-1.5">
              {[
                { text: "kubectl describe pod", ok: false },
                { text: "kubectl logs <pod> --previous", ok: true },
                { text: "kubectl top pod", ok: false },
                { text: "kubectl exec <pod>", ok: false },
              ].map((option) => (
                <li
                  key={option.text}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 font-mono text-[11px] ${
                    option.ok
                      ? "border-mint-400/40 bg-mint-400/10 text-mint-300"
                      : "border-ink-700 bg-ink-900 text-slate-400"
                  }`}
                >
                  <span aria-hidden="true" className="shrink-0">
                    {option.ok ? "\u2713" : "\u2022"}
                  </span>
                  <span className="truncate">{option.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-ink-700 pt-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-brand-400">
                Why
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                <code className="font-mono text-slate-300">--previous</code>{" "}
                reads the terminated container&apos;s log. Without it you only see
                the current container, which is often the one still starting up.
              </p>
            </div>
          </div>

          {/* Weak areas */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
              Weak areas
            </p>
            <ul className="mt-3 space-y-2.5">
              {[
                { topic: "IAM", pct: 42, tone: "bg-rose-450" },
                { topic: "Networking", pct: 61, tone: "bg-amber-450" },
                { topic: "Docker", pct: 78, tone: "bg-brand-400" },
              ].map((row) => (
                <li key={row.topic}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{row.topic}</span>
                    <span className="font-mono text-slate-500">{row.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "amber" | "brand" | "mint";
}) {
  const toneClass = {
    amber: "text-amber-400",
    brand: "text-brand-400",
    mint: "text-mint-400",
  }[tone];

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 px-3 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
        <span aria-hidden="true" className={toneClass}>
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: "\u25A6",
    title: "Smart quizzes",
    body: "Topic-wise multiple choice with instant feedback after every answer, so you find out what you got wrong while it is still fresh.",
    points: [
      "Explanations that explain the reasoning, not just the answer",
      "Difficulty filters from Easy to Hard",
      "Per-topic score tracking on your dashboard",
      "Full attempt history to review later",
    ],
  },
  {
    icon: "\u26A0",
    title: "Real-world scenarios",
    body: "Guided troubleshooting walkthroughs modelled on incidents that actually happen: 502s from a load balancer, crash loops, evictions, disk exhaustion.",
    points: [
      "Each step asks what you would check next",
      "Real commands with syntax highlighting and copy buttons",
      "Root cause, fix, and prevention at the end",
      "Mark complete and track your progress",
    ],
  },
  {
    icon: "\u25C8",
    title: "Interview ready",
    body: "Content tagged for interviews across every topic, plus behavioural and system design practice for product-company rounds.",
    points: [
      "Technical Q&A tagged for interview prep",
      "STAR framework guidance for behavioural questions",
      "System design framing: clarify before you propose",
      "Company-style follow-up questions",
    ],
  },
];

const TESTIMONIALS = [
  {
    quote:
      "The explanations are the part that matters. I kept getting IAM policy evaluation wrong and one answer here finally made the deny-beats-allow ordering click.",
    name: "Ravi K.",
    role: "Backend engineer moving to SRE",
    rating: 5,
  },
  {
    quote:
      "I read the ALB 502 scenario the night before an interview and the interviewer asked almost the same question. The step-by-step structure meant I had a real answer, not a definition.",
    name: "Meera S.",
    role: "Cloud certification candidate",
    rating: 5,
  },
  {
    quote:
      "Cheap enough that I stopped looking for free PDFs that turned out to be outdated. Everything had current behaviour and the reasoning behind it.",
    name: "Asha P.",
    role: "Final-year student, DevOps track",
    rating: 4,
  },
];

const FAQ = [
  {
    q: "What do I get for free?",
    a: "A free account gives you access to free quizzes across every topic, your attempt history and score tracking, and a set of full incident scenarios. Premium unlocks every quiz and scenario, including everything added while you are subscribed.",
  },
  {
    q: "Do explanations cover why, not just what?",
    a: "Yes. Every question includes reasoning: what the service actually does, why the wrong options are wrong, and often a command or concrete detail. This is the part most free quiz sites skip, and it is the part that moves your score.",
  },
  {
    q: "How long does access last, and is it auto-renewed?",
    a: "Plans are time-boxed, from one month to twelve. There is no auto-renewal, so you decide when to extend. If you buy again before your current plan expires, the new period is added on top of the remaining time rather than replacing it.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes, within 7 days of purchase on a first purchase, provided you have not consumed a material portion of the content. See the refund policy for the full terms.",
  },
  {
    q: "What payment methods do you accept?",
    a: "UPI, cards, netbanking and wallets through Razorpay. Pricing is in INR and inclusive of GST.",
  },
];
