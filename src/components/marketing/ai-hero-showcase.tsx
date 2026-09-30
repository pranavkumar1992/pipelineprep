"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Terminal,
  FileText,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Bot,
} from "lucide-react";

type TabKey = "incident" | "resume" | "adaptive";

export function AiHeroShowcase() {
  const [activeTab, setActiveTab] = useState<TabKey>("incident");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationCount((c) => c + 1);
    }, 600);
  };

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Background ambient neon glow */}
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-brand-500/20 via-purple-500/20 to-mint-400/20 blur-2xl opacity-75"
      />

      <div className="relative overflow-hidden rounded-2xl border border-ink-700/80 bg-ink-900/90 shadow-2xl backdrop-blur-xl transition-all">
        {/* Top Window Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-ink-800 bg-ink-950/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-mint-400/80" />
            </div>
            <div className="ml-2 flex items-center gap-1.5 rounded-md border border-brand-400/20 bg-brand-400/10 px-2 py-0.5 font-mono text-[11px] text-brand-300">
              <Sparkles size={11} className="animate-pulse text-brand-400" />
              <span>PipelinePrep AI Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-ink-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-ping" />
              Live AI Agent
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-ink-800 bg-ink-950/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("incident")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              activeTab === "incident"
                ? "bg-ink-800 text-white shadow-sm border border-ink-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal size={13} className="text-brand-400" />
            <span>AI Incident Gen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("resume")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              activeTab === "resume"
                ? "bg-ink-800 text-white shadow-sm border border-ink-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText size={13} className="text-purple-400" />
            <span>AI ATS Matcher</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("adaptive")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              activeTab === "adaptive"
                ? "bg-ink-800 text-white shadow-sm border border-ink-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap size={13} className="text-amber-400" />
            <span>Adaptive Quiz AI</span>
          </button>
        </div>

        {/* Tab 1: AI Incident Generator */}
        {activeTab === "incident" && (
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Prompt input simulation */}
            <div className="rounded-xl border border-ink-700 bg-ink-950/70 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1.5">
                <span className="flex items-center gap-1 text-brand-400">
                  <Bot size={12} /> Prompt Specification
                </span>
                <span className="text-slate-500">Latency: 0.8s</span>
              </div>
              <p className="font-mono text-xs text-slate-200 leading-relaxed">
                <span className="text-slate-500">&gt;</span> &ldquo;Generate an AWS EKS production incident with multi-AZ network partition, CrashLoopBackOff &amp; silent RDS connection timeouts.&rdquo;
              </p>
            </div>

            {/* AI Output Simulation */}
            <div className="rounded-xl border border-brand-400/25 bg-gradient-to-b from-brand-950/20 to-ink-900 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-brand-400">
                    Scenario Generated #30{generationCount % 3}
                  </span>
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[10px] text-rose-300">
                    High Severity P1
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-brand-300 transition-colors"
                >
                  <RefreshCw size={11} className={isGenerating ? "animate-spin text-brand-400" : ""} />
                  <span>Regenerate</span>
                </button>
              </div>

              <div className="mt-3">
                <h4 className="font-semibold text-white text-sm">
                  Kube-DNS Packet Drop &amp; Aurora Failover Deadlock
                </h4>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Worker nodes in <code className="text-brand-300 font-mono text-[11px]">ap-south-1b</code> cannot reach Aurora reader endpoint after cross-AZ ENI saturation.
                </p>

                {/* Simulated Terminal Log Snippet */}
                <div className="mt-3 rounded-lg border border-ink-800 bg-ink-950 p-2.5 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] pb-1 border-b border-ink-800/50">
                    <span>cluster-events.log</span>
                    <span className="text-mint-400">LIVE DUMP</span>
                  </div>
                  <p className="text-rose-400 mt-1.5">
                    ERROR: dial tcp 10.0.4.12:5432: i/o timeout
                  </p>
                  <p className="text-amber-300">
                    WARN: CoreDNS upstream fallback triggered (2800ms)
                  </p>
                  <p className="text-slate-400">
                    STEP 1/5: Trace CoreDNS metrics via <span className="text-brand-400">kubectl exec -it</span>
                  </p>
                </div>
              </div>

              {/* Action Button inside simulator */}
              <div className="mt-3.5 flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Cpu size={12} className="text-brand-400" />
                  <span>5-Step Guided Solution</span>
                </div>
                <Link
                  href="/scenarios"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"
                >
                  Solve Scenario <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI ATS Resume & JD Matcher */}
        {activeTab === "resume" && (
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-950/70 p-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-purple-400">Target Role</span>
                <p className="font-semibold text-white text-xs sm:text-sm">Staff Site Reliability Engineer &middot; Cloud Platforms</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-mono text-mint-400">89%</span>
                <p className="text-[10px] font-mono text-slate-500">ATS Score</p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-purple-500/20 bg-purple-950/10 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5 text-purple-300">
                  <CheckCircle2 size={13} className="text-mint-400" /> Matching Strengths
                </span>
                <span className="font-mono text-[10px] text-slate-500">6 detected</span>
              </div>
              <p className="text-xs text-slate-400">
                &bull; Production Terraform modularization, multi-region AWS transit gateways, and ArgoCD GitOps pipelines.
              </p>

              <div className="pt-2 border-t border-ink-800">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle size={13} className="text-amber-400" /> AI Recommended Fixes
                  </span>
                  <span className="font-mono text-[10px] text-amber-400/80">+11% ATS bump</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  &bull; Add concrete MTTR recovery metrics and mention <code className="text-brand-300 font-mono text-[11px]">OpenTelemetry / eBPF</code> observability.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-500">Free preview enabled</span>
              <Link
                href="/career-tools/resume-review"
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                Scan Your Resume <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Adaptive Quiz AI */}
        {activeTab === "adaptive" && (
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-950/70 p-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400">Dynamic Adaptation</span>
                <p className="font-medium text-white text-xs">Targeting Detected Weak Area: <span className="text-brand-400">AWS IAM Cross-Account</span></p>
              </div>
              <span className="rounded bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                Difficulty: Hard
              </span>
            </div>

            <div className="rounded-xl border border-amber-450/20 bg-ink-850 p-3.5 space-y-2">
              <p className="text-xs font-medium text-white leading-relaxed">
                Q: When assuming an IAM role across AWS accounts, which component must explicitly trust the external account principal?
              </p>

              <div className="space-y-1.5 pt-1">
                <div className="rounded border border-mint-400/40 bg-mint-400/10 px-3 py-1.5 text-xs text-mint-300 font-mono flex items-center justify-between">
                  <span>&bull; The Role&apos;s Trust Policy (sts:AssumeRole)</span>
                  <span className="text-[10px] text-mint-400">Correct &middot; 94% explain rate</span>
                </div>
                <div className="rounded border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-slate-400 font-mono">
                  <span>&bull; The calling user&apos;s inline permissions boundary</span>
                </div>
              </div>

              <div className="rounded border border-ink-800 bg-ink-950 p-2 mt-2">
                <span className="font-mono text-[10px] text-brand-400 uppercase">AI Explanation Insight:</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cross-account delegation requires a handshake: the caller must have permission to call <code className="text-slate-300">sts:AssumeRole</code>, AND the role&apos;s trust policy must allow that external principal.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-500">20 questions generated per bank</span>
              <Link
                href="/quizzes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Start Adaptive Quiz <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* Footer strip of the showcase */}
        <div className="border-t border-ink-800/80 bg-ink-950/90 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5">
            <Layers size={11} className="text-brand-400" />
            149+ Verified Incidents &amp; Questions
          </span>
          <span className="text-slate-400">Zero Hallucinations Guarantee</span>
        </div>
      </div>
    </div>
  );
}
