import { CommandCard, IntegrationBadge, SectionHeader } from "@/components/ui-primitives";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default function TelegramPage() {
  const health = getTelegramHealth();

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-100">Telegram Alerts</h1>
        <p className="mt-3 text-slate-300">Get competitor alerts directly in Telegram.</p>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Status" subtitle="Current Telegram integration readiness." />
        <div className="mb-3">
          <IntegrationBadge label={health.configured ? "Telegram Ready" : "Setup Needed"} state={health.configured ? "ready" : "warning"} />
        </div>
        <div className="space-y-1 text-sm text-slate-300">
          <p>Bot token configured: {health.botTokenConfigured ? "Yes" : "No"}</p>
          <p>Chat ID configured: {health.chatIdConfigured ? "Yes" : "No"}</p>
          <p>Masked token: {health.maskedToken ?? "Not set"}</p>
          <p>Mode: {health.mode}</p>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Setup Steps" subtitle="One-time setup for Telegram delivery." />
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>Create a bot using BotFather.</li>
          <li>Add `TELEGRAM_BOT_TOKEN` to `.env.local`.</li>
          <li>Send `/start` to your bot.</li>
          <li>Get your chat ID from `getUpdates`.</li>
          <li>Add `TELEGRAM_CHAT_ID` to `.env.local`.</li>
          <li>Restart the app.</li>
          <li>Send a test alert.</li>
        </ol>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Actions" subtitle="Run these commands during demo." />
        <div className="space-y-2">
          <CommandCard command="curl -X POST http://localhost:3000/api/telegram/test" />
          <CommandCard command="curl -X POST http://localhost:3000/api/v1/projects/zepto/alerts/send" />
          <CommandCard command="curl -X POST http://localhost:3000/api/v1/projects/zepto/refresh-and-alert" />
          <CommandCard command="curl http://localhost:3000/api/v1/projects/zepto/alerts" />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader title="Message Preview" subtitle="What the Telegram alert looks like." />
        <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-200">{`🚨 PricePulse Alert

Competitor: Zepto
Impact: Critical
What changed: Toned Milk 1L price changed
Suggested action: Check your price and stock today.`}</pre>
      </section>
    </div>
  );
}
