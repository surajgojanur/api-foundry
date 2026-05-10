import { jsonError, jsonOk } from "@/lib/api-response";
import { getProjectInsights } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const insightPayload = getProjectInsights(id);

  if (!insightPayload) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  return jsonOk({
    ok: true,
    ...(insightPayload as object),
    meta: {
      generatedBy: "PricePulse",
      description: "Deterministic AI-style competitor intelligence generated from extracted feeds and change events",
      demoMode: true,
      aiAnalysisEndpoint: `/api/v1/projects/${id}/ai-analysis`,
      note: "Use /ai-analysis for OpenAI-enhanced analysis when OPENAI_API_KEY or OPEN_AI is configured.",
    },
  });
}
