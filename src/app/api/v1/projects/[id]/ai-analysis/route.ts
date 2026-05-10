import { jsonError, jsonOk } from "@/lib/api-response";
import { buildInsightApiResponse } from "@/lib/insights";
import { getProject } from "@/lib/project-store";
import { generateOpenAIProjectAnalysis, isOpenAIConfigured, mergeOpenAIWithDeterministicInsights } from "@/lib/openai-insights";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);

  if (!project) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  const deterministic = buildInsightApiResponse(project);
  const aiResponse = await generateOpenAIProjectAnalysis(project);
  const analysis = mergeOpenAIWithDeterministicInsights(project, deterministic, aiResponse);

  return jsonOk({
    ok: true,
    projectId: project.id,
    projectName: project.name,
    mode: analysis.mode,
    analysis,
    recommendedEndpoints: {
      feed: project.endpoint,
      changes: project.changesEndpoint,
      schema: project.schemaEndpoint,
      insights: `/api/v1/projects/${project.id}/insights`,
      aiAnalysis: `/api/v1/projects/${project.id}/ai-analysis`,
      refresh: `/api/v1/projects/${project.id}/refresh`,
    },
    meta: {
      generatedBy: "PricePulse",
      description: "OpenAI-enhanced competitor analysis with deterministic fallback",
      openAIConfigured: isOpenAIConfigured(),
    },
  });
}
