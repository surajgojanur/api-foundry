import Link from "next/link";
import { IntegrationBadge, SectionHeader, CommandCard } from "@/components/ui-primitives";
import { getAnakinHealth } from "@/lib/anakin";
import { getOpenAIHealth } from "@/lib/openai-insights";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default async function DemoPage() {
  const anakin = await getAnakinHealth();
  const openai = await getOpenAIHealth();
  const telegram = getTelegramHealth();
  const anakinMode = typeof anakin === "object" && anakin !== null && "mode" in anakin ? String(anakin.mode) : "fallback";

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">PricePulse Judge Demo</h1>
        <p className="mt-3 text-slate-300">PricePulse tracks competitor websites, detects important price/stock/offer changes, and sends simple Telegram alerts with recommended actions.</p>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Live Integrations Status" />
        <div className="flex flex-wrap gap-2">
          <IntegrationBadge label={anakinMode === "live" ? "Anakin ready" : "Fallback ready"} state={anakinMode === "live" ? "ready" : "warning"} />
          <IntegrationBadge label={openai.mode === "ai-live" || openai.mode === "ai-live-ready" ? "OpenAI ready" : "OpenAI fallback"} state="ready" />
          <IntegrationBadge label={telegram.configured ? "Telegram ready" : "Telegram setup needed"} state={telegram.configured ? "ready" : "warning"} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Demo Flow" />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/" className="btn-primary">Dashboard</Link>
          <Link href="/live-tracking" className="btn-secondary">Live Tracking</Link>
          <Link href="/telegram" className="btn-secondary">Telegram Setup</Link>
          <Link href="/projects/zepto" className="btn-secondary">Zepto Project</Link>
          <Link href="/compare" className="btn-secondary">Compare</Link>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Final Pitch" />
        <p className="text-sm text-slate-300">Competitor website -&gt; important change detected -&gt; Telegram alert -&gt; recommended action for small business owners.</p>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Test Commands" />
        <div className="space-y-2">
          <CommandCard command="curl http://localhost:3000/api/telegram/health" />
          <CommandCard command="curl -X POST http://localhost:3000/api/telegram/test" />
          <CommandCard command="curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert" />
        </div>
      </section>
    </div>
  );
}
