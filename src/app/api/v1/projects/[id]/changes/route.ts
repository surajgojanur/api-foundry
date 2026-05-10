import { jsonError, jsonOk } from "@/lib/api-response";
import { summarizeChangeEvents } from "@/lib/change-detection";
import { getProjectChanges } from "@/lib/project-store";
import type { ChangeEventType, ChangeSeverity } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const validSeverities: ChangeSeverity[] = ["low", "medium", "high"];
const validTypes: ChangeEventType[] = [
  "price_changed",
  "offer_added",
  "availability_changed",
  "item_added",
  "item_removed",
  "announcement_added",
  "content_changed",
];

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const changes = getProjectChanges(id);

  if (!changes) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity");
  const type = searchParams.get("type");
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(100, Number(limitRaw) || changes.length)) : changes.length;

  const filtered = changes.filter((change) => {
    const severityMatches = severity && validSeverities.includes(severity as ChangeSeverity)
      ? change.severity === severity
      : true;
    const typeMatches = type && validTypes.includes(type as ChangeEventType)
      ? change.type === type
      : true;
    return severityMatches && typeMatches;
  }).slice(0, limit);

  return jsonOk({
    ok: true,
    projectId: id,
    count: filtered.length,
    changeSummary: summarizeChangeEvents(filtered),
    filters: {
      severity: severity && validSeverities.includes(severity as ChangeSeverity) ? severity : null,
      type: type && validTypes.includes(type as ChangeEventType) ? type : null,
      limit,
    },
    changes: filtered,
    meta: {
      generatedBy: "PricePulse",
      description: "Change events detected between previous and current competitor snapshots",
      demoMode: true,
    },
  });
}
