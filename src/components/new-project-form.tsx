"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CommandCard, IntegrationBadge, SectionHeader } from "@/components/ui-primitives";
import type { DataBlockType } from "@/lib/types";

type CreateResponse = {
  ok: boolean;
  mode: "live" | "mixed" | "fallback";
  fallbackReason?: string;
  note?: string;
  project: { id: string; name: string };
  next: { projectUrl: string };
};

const watchOptions: Array<{ label: string; value: DataBlockType }> = [
  { label: "Prices", value: "products" },
  { label: "Offers", value: "offers" },
  { label: "Stock availability", value: "availability" },
  { label: "Announcements", value: "announcements" },
];

const pipelineSteps = [
  "Checking website",
  "Finding useful pages",
  "Detecting important changes",
  "Preparing alerts",
  "Building recommendations",
];

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("Zepto");
  const [companyUrl, setCompanyUrl] = useState("https://www.zeptonow.com");
  const [country, setCountry] = useState("in");
  const [selectedBlocks, setSelectedBlocks] = useState<DataBlockType[]>(["products", "offers", "availability", "announcements"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [anakinReady, setAnakinReady] = useState<"ready" | "warning">("warning");
  const stepLabel = useMemo(() => pipelineSteps[Math.min(stepIndex, pipelineSteps.length - 1)], [stepIndex]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/anakin/health", { cache: "no-store" });
        const payload = await res.json();
        if (mounted) setAnakinReady(payload?.mode === "live" ? "ready" : "warning");
      } catch {
        if (mounted) setAnakinReady("warning");
      }
    }
    void check();
    return () => { mounted = false; };
  }, []);

  function toggleBlock(block: DataBlockType) {
    setSelectedBlocks((prev) => (prev.includes(block) ? prev.filter((item) => item !== block) : [...prev, block]));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStepIndex(0);

    const interval = window.setInterval(() => setStepIndex((prev) => (prev < pipelineSteps.length - 1 ? prev + 1 : prev)), 900);

    try {
      const response = await fetch("/api/projects/create-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          companyUrl,
          useCase: "competitor monitoring",
          country,
          selectedBlocks,
        }),
      });

      const payload = (await response.json()) as CreateResponse;
      if (!response.ok || !payload.ok) throw new Error("Unable to add competitor.");
      setResult(payload);
      setStepIndex(pipelineSteps.length - 1);
      router.refresh();
    } catch {
      setError("Could not add competitor right now.");
    } finally {
      window.clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">Track a New Competitor</h1>
        <p className="mt-2 text-sm text-slate-400">Add a competitor and let PricePulse watch important changes for you.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <IntegrationBadge label="Anakin" state={anakinReady} />
          <IntegrationBadge label="OpenAI" state="ready" />
          <IntegrationBadge label="Telegram" state="ready" />
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-sm text-slate-300">Competitor name</span><input value={name} onChange={(e) => setName(e.target.value)} required className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-200 outline-none focus:border-cyan-400/60" /></label>
            <label className="space-y-2"><span className="text-sm text-slate-300">Website URL</span><input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} required className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-200 outline-none focus:border-cyan-400/60" /></label>
          </div>

          <label className="space-y-2 block"><span className="text-sm text-slate-300">Country</span><input value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-200 outline-none focus:border-cyan-400/60" /></label>

          <div>
            <p className="mb-3 text-sm text-slate-300">What should we watch?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {watchOptions.map((option) => {
                const checked = selectedBlocks.includes(option.value);
                return (
                  <label key={option.value} className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
                    <input type="checkbox" checked={checked} onChange={() => toggleBlock(option.value)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400" />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Track Competitor
          </button>
        </form>

        {(loading || result) ? (
          <div className="mt-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
            <p className="text-sm text-cyan-200">Pipeline: {stepLabel}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {pipelineSteps.map((step, idx) => (
                <div key={step} className={`rounded-lg border px-2 py-1 text-[11px] ${idx <= stepIndex ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-200" : "border-slate-700 bg-slate-900/60 text-slate-400"}`}>{step}</div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
      </section>

      <aside className="glass-card rounded-3xl p-6">
        <SectionHeader title="Success State" subtitle="What happens after adding a competitor." />
        {!result ? (
          <div className="space-y-3 text-sm text-slate-300">
            <p className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">Competitor added</p>
            <p className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">Telegram alerts ready</p>
            <p className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">Demo-stable tracking enabled. Live extraction can be retried later.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-emerald-200">Competitor added: {result.project.name}</p>
            <Link href={result.next.projectUrl} className="btn-primary">View competitor</Link>
            <CommandCard command="curl -X POST http://localhost:3000/api/telegram/test" />
            <Link href="/" className="btn-secondary">Go to dashboard</Link>
            {result.mode !== "live" ? <p className="text-xs text-slate-400">Demo-stable tracking enabled. Live extraction can be retried later.</p> : null}
          </div>
        )}
      </aside>
    </div>
  );
}
