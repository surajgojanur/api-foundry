import { jsonOk } from "@/lib/api-response";
import { compareProjects, getProjects } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("projects");
  const ids = requested
    ? requested.split(",").map((id) => id.trim()).filter(Boolean)
    : getProjects().map((project) => project.id);

  const result = compareProjects(ids);

  return jsonOk({
    ok: true,
    comparedProjectIds: ids,
    result,
    comparisonInsights: result.comparisonInsights,
    mostAggressive: result.comparisonInsights?.mostAggressive,
    mostStable: result.comparisonInsights?.mostStable,
    monitoringPriority: result.comparisonInsights?.monitoringPriority,
    marketNarrative: result.comparisonInsights?.marketNarrative,
    recommendedActions: result.comparisonInsights?.recommendedActions,
    meta: {
      generatedBy: "PricePulse",
      description: "Competitor comparison generated from project feeds and change events",
      demoMode: true,
    },
  });
}
