import { sendTelegramMessage } from "@/lib/telegram";
import type {
  AlertDelivery,
  AlertRule,
  AlertSeverity,
  ChangeEvent,
  ChangeSeverity,
  CompetitorProject,
} from "@/lib/types";
import { getTelegramHealth, isTelegramConfigured } from "@/lib/telegram";

export function alertSeverityRank(severity: AlertSeverity): number {
  if (severity === "low") return 1;
  if (severity === "medium") return 2;
  if (severity === "high") return 3;
  return 4;
}

export function mapChangeSeverityToAlertSeverity(changeSeverity: ChangeSeverity): AlertSeverity {
  if (changeSeverity === "high") return "critical";
  if (changeSeverity === "medium") return "high";
  return "medium";
}

export function getDefaultAlertRule(projectId: string): AlertRule {
  return {
    id: `${projectId}-default-telegram-rule`,
    projectId,
    name: "Important competitor changes",
    enabled: true,
    channel: "telegram",
    minSeverity: "high",
    eventTypes: ["price_changed", "offer_added", "availability_changed", "announcement_added"],
    createdAt: new Date().toISOString(),
  };
}

export function shouldAlertForChange(change: ChangeEvent, rules: AlertRule[]): boolean {
  const severity = mapChangeSeverityToAlertSeverity(change.severity);

  return rules.some((rule) => {
    if (!rule.enabled) return false;
    if (rule.channel !== "telegram") return false;
    if (!rule.eventTypes.includes(change.type)) return false;
    return alertSeverityRank(severity) >= alertSeverityRank(rule.minSeverity);
  });
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "Not available";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function suggestionByType(change: ChangeEvent): string {
  if (change.type === "price_changed") return "Review your pricing today and decide if you want to match or highlight better value.";
  if (change.type === "offer_added") return "Check if you should launch a quick counter-offer for key products.";
  if (change.type === "availability_changed") return "Check your own stock and consider highlighting availability to customers.";
  if (change.type === "announcement_added") return "Review this competitor update and prepare a response plan for customers.";
  return "Review this change and decide if you need a same-day response.";
}

export function buildSimpleUserAlertMessage(input: {
  project: CompetitorProject;
  change: ChangeEvent;
  aiSummary?: string;
}): string {
  const severity = mapChangeSeverityToAlertSeverity(input.change.severity);
  const impact = severity.charAt(0).toUpperCase() + severity.slice(1);
  const reason = input.aiSummary?.trim() || "This can affect customer buying decisions today.";

  return [
    "🚨 PricePulse Alert",
    "",
    `Competitor: ${input.project.name}`,
    `Impact: ${impact}`,
    "",
    "What changed:",
    `${input.change.title}.`,
    "",
    `Before: ${formatValue(input.change.oldValue)}`,
    `Now: ${formatValue(input.change.newValue)}`,
    "",
    "Why it matters:",
    reason,
    "",
    "Suggested action:",
    suggestionByType(input.change),
    "",
    "Open dashboard:",
    `http://localhost:3000/projects/${input.project.id}`,
  ].join("\n");
}

export function composeAlertMessages(project: CompetitorProject): Array<{
  change: ChangeEvent;
  text: string;
  severity: AlertSeverity;
}> {
  const rules = project.alertRules?.length ? project.alertRules : [getDefaultAlertRule(project.id)];

  const messages = project.changes
    .filter((change) => shouldAlertForChange(change, rules))
    .map((change) => ({
      change,
      text: buildSimpleUserAlertMessage({ project, change }),
      severity: mapChangeSeverityToAlertSeverity(change.severity),
    }))
    .sort((a, b) => {
      const rankDiff = alertSeverityRank(b.severity) - alertSeverityRank(a.severity);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.change.detectedAt).getTime() - new Date(a.change.detectedAt).getTime();
    })
    .slice(0, 5);

  return messages;
}

export async function sendProjectTelegramAlerts(project: CompetitorProject): Promise<AlertDelivery[]> {
  if (project.telegramAlertsEnabled === false) {
    return [];
  }

  const composed = composeAlertMessages(project);
  if (!composed.length) return [];

  if (!isTelegramConfigured()) {
    const health = getTelegramHealth();
    return composed.map((item, index) => ({
      id: `${project.id}-alert-${Date.now()}-${index}`,
      projectId: project.id,
      channel: "telegram",
      severity: item.severity,
      title: item.change.title,
      message: item.text,
      sentAt: new Date().toISOString(),
      ok: false,
      error: health.message,
    }));
  }

  const deliveries: AlertDelivery[] = [];

  for (let i = 0; i < composed.length; i += 1) {
    const item = composed[i];
    const result = await sendTelegramMessage({ text: item.text });

    deliveries.push({
      id: `${project.id}-alert-${Date.now()}-${i}`,
      projectId: project.id,
      channel: "telegram",
      severity: item.severity,
      title: item.change.title,
      message: item.text,
      sentAt: new Date().toISOString(),
      ok: result.ok,
      error: result.ok ? undefined : result.error ?? "Telegram delivery failed",
    });

    // Stop fast on timeout/network failures to avoid long request chains during demos.
    if (!result.ok && (result.error?.toLowerCase().includes("timed out") || result.error?.toLowerCase().includes("failed"))) {
      for (let j = i + 1; j < composed.length; j += 1) {
        deliveries.push({
          id: `${project.id}-alert-${Date.now()}-${j}`,
          projectId: project.id,
          channel: "telegram",
          severity: composed[j].severity,
          title: composed[j].change.title,
          message: composed[j].text,
          sentAt: new Date().toISOString(),
          ok: false,
          error: "Skipped after earlier Telegram send failure",
        });
      }
      break;
    }
  }

  return deliveries;
}
