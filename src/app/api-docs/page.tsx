import { SectionHeader, CommandCard } from "@/components/ui-primitives";

const health = [
  "GET /api/anakin/health",
  "GET /api/openai/health",
  "GET /api/telegram/health",
];

const competitor = [
  "GET /api/v1/projects",
  "POST /api/projects/create-from-url",
  "POST /api/v1/projects/{id}/refresh",
];

const alerts = [
  "POST /api/telegram/test",
  "GET /api/v1/projects/{id}/alerts",
  "POST /api/v1/projects/{id}/alerts/send",
  "POST /api/v1/projects/{id}/refresh-and-alert",
];

const feed = [
  "GET /api/v1/projects/{id}/feed",
  "GET /api/v1/projects/{id}/changes",
  "GET /api/v1/projects/{id}/insights",
  "GET /api/v1/projects/{id}/ai-analysis",
  "GET /api/v1/projects/{id}/schema",
];

const live = [
  "POST /api/live/setup",
  "POST /api/live/refresh-all",
  "GET /api/live/compare",
  "GET /api/v1/projects/live-zepto/tracking-status",
  "GET /api/v1/projects/live-blinkit/tracking-status",
];

function EndpointGroup({ title, endpoints }: { title: string; endpoints: string[] }) {
  return (
    <section className="glass-card rounded-2xl p-4">
      <SectionHeader title={title} />
      <div className="space-y-2">
        {endpoints.map((endpoint) => <p key={endpoint} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 font-mono text-xs text-cyan-200">{endpoint}</p>)}
      </div>
    </section>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">Advanced APIs</h1>
        <p className="mt-3 text-slate-300">These endpoints power PricePulse. Normal users do not need them, but developers can integrate them.</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <EndpointGroup title="Health Checks" endpoints={health} />
        <EndpointGroup title="Competitor Management" endpoints={competitor} />
        <EndpointGroup title="Alert Endpoints" endpoints={alerts} />
        <EndpointGroup title="Advanced Feed Endpoints" endpoints={feed} />
        <EndpointGroup title="Live Tracking Endpoints" endpoints={live} />
      </div>

      <section className="glass-card rounded-2xl p-4">
        <SectionHeader title="Quick Commands" subtitle="Useful during integration testing." />
        <div className="space-y-2">
          <CommandCard command="curl http://localhost:3000/api/telegram/health" />
          <CommandCard command="curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert" />
        </div>
      </section>
    </div>
  );
}
