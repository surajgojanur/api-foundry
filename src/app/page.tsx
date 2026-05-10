import Link from "next/link";
import { Bell, CheckCircle2, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { ProjectCard } from "@/components/project-card";
import { AlertBadge, EmptyState, IntegrationBadge, SectionHeader } from "@/components/ui-primitives";
import { getAnakinHealth } from "@/lib/anakin";
import { getOpenAIHealth } from "@/lib/openai-insights";
import { getProjects } from "@/lib/project-store";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = getProjects();
  const anakinHealth = await getAnakinHealth();
  const openaiHealth = await getOpenAIHealth();
  const telegramHealth = getTelegramHealth();

  const anakinMode = typeof anakinHealth === "object" && anakinHealth !== null && "mode" in anakinHealth ? String(anakinHealth.mode) : "fallback";
  const criticalAlerts = projects.reduce((sum, project) => sum + project.changes.filter((change) => change.severity === "high").length, 0);
  const alertsSent = projects.reduce((sum, project) => sum + (project.alertDeliveries?.filter((item) => item.ok).length ?? 0), 0);
  const latestCheck = projects.length ? new Date(Math.max(...projects.map((project) => new Date(project.lastUpdated).getTime()))).toLocaleString() : "Not yet";
  const recommendations = projects.flatMap((project) => project.insights).slice(0, 5);
  const criticalChanges = projects.flatMap((project) => project.changes.map((change) => ({ project, change })))
    .filter((item) => item.change.severity === "high")
    .sort((a, b) => new Date(b.change.detectedAt).getTime() - new Date(a.change.detectedAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-3xl p-7 sm:p-9">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PricePulse</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">Competitor Alert Assistant</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-300">Track competitors automatically and get Telegram alerts when prices, offers, or stock changes matter.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/projects/new" className="btn-primary">Track a Competitor</Link>
          <Link href="/telegram" className="btn-secondary">Setup Telegram Alerts</Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <IntegrationBadge label={anakinMode === "live" ? "Anakin tracking ready" : "Fallback ready"} state={anakinMode === "live" ? "ready" : "warning"} />
          <IntegrationBadge label={openaiHealth.mode === "ai-live" || openaiHealth.mode === "ai-live-ready" ? "OpenAI analysis ready" : "Deterministic analysis ready"} state="ready" />
          <IntegrationBadge label={telegramHealth.configured ? "Telegram ready" : "Telegram setup needed"} state={telegramHealth.configured ? "ready" : "warning"} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Competitors Tracked" value={String(projects.length)} description="Active competitors" trend="Live" icon={CheckCircle2} variant="cyan" />
        <StatCard title="Critical Alerts" value={String(criticalAlerts)} description="Needs attention" trend="Priority" icon={ShieldAlert} variant="violet" />
        <StatCard title="Telegram Alerts Sent" value={String(alertsSent)} description="Delivered successfully" trend="Sent" icon={Bell} variant="emerald" />
        <StatCard title="Last Checked" value={latestCheck} description="Across competitors" trend="Fresh" icon={CheckCircle2} variant="blue" />
        <StatCard title="Recommended Actions" value={String(recommendations.length)} description="Business actions" trend="Ready" icon={CheckCircle2} variant="cyan" />
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Today's Critical Alerts" subtitle="High-impact changes you may want to act on today." />
        <div className="space-y-2">
          {criticalChanges.length ? criticalChanges.map((item) => (
            <div key={item.change.id} className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.project.name}: {item.change.title}</p>
                <AlertBadge severity="critical" />
              </div>
              <p className="mt-1 text-xs text-slate-300">Impact: {item.change.explanation}</p>
              <p className="mt-1 text-xs text-slate-300">Suggested action: Check your pricing or stock response today.</p>
            </div>
          )) : <EmptyState title="No critical alerts right now" message="PricePulse is still watching competitor updates for you." />}
        </div>
      </section>

      <section>
        <SectionHeader title="Competitors You Track" subtitle="Monitor each competitor and open their alert timeline." />
        <div className="grid gap-4 xl:grid-cols-2">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <SectionHeader title="Recommended Actions" subtitle="Simple next steps generated from changes and insights." />
          <div className="space-y-2 text-sm">
            {recommendations.length ? recommendations.map((insight) => (
              <div key={insight.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 text-slate-200">
                <p className="font-medium">{insight.title}</p>
                <p className="mt-1 text-slate-300">{insight.recommendation}</p>
              </div>
            )) : <EmptyState title="No recommendations yet" message="Add or refresh a competitor to generate actions." />}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <SectionHeader title="Telegram Alert Setup" subtitle="Connect Telegram once and receive important competitor alerts." />
          <p className="text-sm text-slate-300">Status: <span className="text-slate-100">{telegramHealth.configured ? "Ready" : "Setup needed"}</span></p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link href="/telegram" className="btn-primary">Open Telegram Setup</Link>
            <a href="/api/telegram/health" className="btn-secondary">Telegram Health</a>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Advanced Developer Tools" subtitle="Internal endpoints are available for technical integration." />
        <Link href="/api-docs" className="btn-secondary">Open Advanced APIs</Link>
      </section>
    </div>
  );
}
