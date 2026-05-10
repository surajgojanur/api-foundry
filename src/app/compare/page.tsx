import { generateComparisonInsights } from "@/lib/insights";
import { getProjects } from "@/lib/project-store";
import { SectionHeader, CommandCard } from "@/components/ui-primitives";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  const projects = getProjects();
  const insights = generateComparisonInsights(projects);

  const rows = projects.map((project) => {
    const priceChanges = project.changes.filter((item) => item.type === "price_changed").length;
    const offerChanges = project.changes.filter((item) => item.type === "offer_added").length;
    const stockIssues = project.changes.filter((item) => item.type === "availability_changed").length;
    const critical = project.changes.filter((item) => item.severity === "high").length;
    const attention = critical >= 3 ? "High" : critical >= 1 ? "Medium" : "Low";
    return { project, priceChanges, offerChanges, stockIssues, critical, attention };
  });

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">Competitor Comparison</h1>
        <p className="mt-3 text-slate-300">See who changed prices, added offers, or needs attention today.</p>
      </section>

      <section className="glass-card overflow-x-auto rounded-3xl p-5">
        <SectionHeader title="Who Needs Attention?" subtitle="Simple summary across competitors." />
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-3 py-2 font-medium">Competitor</th>
              <th className="px-3 py-2 font-medium">Attention level</th>
              <th className="px-3 py-2 font-medium">Critical alerts</th>
              <th className="px-3 py-2 font-medium">Price changes</th>
              <th className="px-3 py-2 font-medium">Offer changes</th>
              <th className="px-3 py-2 font-medium">Stock issues</th>
              <th className="px-3 py-2 font-medium">Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.project.id} className="border-b border-slate-900/90 text-slate-200">
                <td className="px-3 py-4 font-medium text-slate-100">{row.project.name}</td>
                <td className="px-3 py-4">{row.attention}</td>
                <td className="px-3 py-4">{row.critical}</td>
                <td className="px-3 py-4">{row.priceChanges}</td>
                <td className="px-3 py-4">{row.offerChanges}</td>
                <td className="px-3 py-4">{row.stockIssues}</td>
                <td className="px-3 py-4 text-xs text-slate-300">{row.project.insights[0]?.recommendation ?? "Check now"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl p-4">
          <SectionHeader title="Recommended Action Today" subtitle="Immediate actions for business users." />
          <ul className="space-y-2 text-sm text-slate-300">
            {insights.recommendedActions.map((action) => <li key={action} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2">{action}</li>)}
          </ul>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <SectionHeader title="OpenAI Market Summary" subtitle="Enhanced summary with deterministic fallback." />
          <p className="text-sm text-slate-300">Use this endpoint for a concise market summary during demo:</p>
          <div className="mt-2">
            <CommandCard command={`curl "http://localhost:3000/api/v1/compare/ai-analysis?projects=${projects.map((p) => p.id).join(",")}"`} />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <SectionHeader title="Advanced Endpoints" subtitle="Developer-focused comparison APIs." />
        <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-xs text-cyan-200">GET /api/v1/compare?projects=blinkit,zepto,bigbasket</p>
      </section>
    </div>
  );
}
