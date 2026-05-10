import { notFound } from "next/navigation";
import { Globe2 } from "lucide-react";
import { AlertBadge, CommandCard, EmptyState, IntegrationBadge, SectionHeader } from "@/components/ui-primitives";
import { buildSimpleUserAlertMessage } from "@/lib/alerts";
import { getProject, getProjectAlerts } from "@/lib/project-store";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const telegramHealth = getTelegramHealth();
  const criticalChanges = project.changes.filter((item) => item.severity === "high");
  const alertHistory = getProjectAlerts(project.id);
  const topAction = project.insights[0]?.recommendation ?? "Run a fresh check and watch critical competitor changes.";
  const previewChange = project.changes[0];
  const previewMessage = previewChange
    ? buildSimpleUserAlertMessage({ project, change: previewChange })
    : "🚨 PricePulse Alert\n\nNo important changes detected yet.";

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">{project.name}</h1>
        <a href={project.companyUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-200"><Globe2 className="h-4 w-4" /> {project.companyUrl}</a>
        <div className="mt-4 flex flex-wrap gap-2">
          <IntegrationBadge label={`Status: ${project.status}`} state="neutral" />
          <IntegrationBadge label={`Telegram ${project.telegramAlertsEnabled === false ? "disabled" : "enabled"}`} state={project.telegramAlertsEnabled === false ? "warning" : "ready"} />
          <IntegrationBadge label={`Critical changes: ${criticalChanges.length}`} state={criticalChanges.length ? "warning" : "ready"} />
          <IntegrationBadge label={`Last checked: ${new Date(project.lastUpdated).toLocaleString()}`} state="neutral" />
        </div>
        <p className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm text-slate-200">Main suggested action: {topAction}</p>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Quick Actions" subtitle="Run checks and send alerts without leaving this page." />
        <div className="grid gap-2 md:grid-cols-2">
          <CommandCard command={`curl -X POST http://localhost:3000/api/v1/projects/${project.id}/refresh`} />
          <CommandCard command={`curl -X POST http://localhost:3000/api/v1/projects/${project.id}/refresh-and-alert`} />
          <CommandCard command={`curl -X POST http://localhost:3000/api/v1/projects/${project.id}/alerts/send`} />
          <CommandCard command={`curl -X POST http://localhost:3000/api/telegram/test`} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Important Changes" subtitle="Timeline of detected competitor changes." />
        <div className="space-y-2">
          {project.changes.slice(0, 12).map((change) => (
            <div key={change.id} className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-100">{change.title}</p>
                <AlertBadge severity={change.severity === "high" ? "critical" : change.severity === "medium" ? "high" : "medium"} />
              </div>
              <p className="mt-1 text-xs text-slate-300">Before: {String(change.oldValue ?? "Not available")} → Now: {String(change.newValue ?? "Not available")}</p>
              <p className="mt-1 text-xs text-slate-400">Why it matters: {change.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Telegram Alert Preview" subtitle="This is how your message appears in Telegram." />
        <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-200">{previewMessage}</pre>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Suggested Actions" subtitle="Practical actions for today." />
        <div className="space-y-2 text-sm text-slate-300">
          {project.insights.slice(0, 5).map((insight) => (
            <div key={insight.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
              <p className="font-medium text-slate-100">{insight.title}</p>
              <p className="mt-1">{insight.recommendation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Alert History" subtitle="Delivery status for Telegram alerts." />
        {alertHistory.length ? (
          <div className="space-y-2 text-sm">
            {alertHistory.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 text-slate-200">
                <p>{alert.title}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(alert.sentAt).toLocaleString()} | Channel: {alert.channel} | {alert.ok ? "Sent" : `Failed: ${alert.error ?? "Unknown error"}`}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No alert history yet" message="Send current alerts to Telegram to start delivery history." />}
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="AI Analysis" subtitle="OpenAI-enhanced summary with deterministic fallback." />
        <CommandCard command={`curl http://localhost:3000/api/v1/projects/${project.id}/ai-analysis`} />
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Advanced Developer Tools" subtitle="Internal endpoints for technical integration." />
        <div className="grid gap-2 md:grid-cols-2">
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-cyan-200">GET {project.endpoint}</p>
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-cyan-200">GET {project.changesEndpoint}</p>
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-cyan-200">GET {project.schemaEndpoint}</p>
          <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-cyan-200">GET /api/v1/projects/{project.id}/insights</p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Telegram Setup Status" />
        <div className="space-y-1 text-sm text-slate-300">
          <p>Mode: {telegramHealth.mode}</p>
          <p>Bot token configured: {telegramHealth.botTokenConfigured ? "Yes" : "No"}</p>
          <p>Chat ID configured: {telegramHealth.chatIdConfigured ? "Yes" : "No"}</p>
          <p>Masked token: {telegramHealth.maskedToken ?? "Not set"}</p>
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return { title: "Competitor Not Found | PricePulse" };
  return { title: `${project.name} | PricePulse` };
}
