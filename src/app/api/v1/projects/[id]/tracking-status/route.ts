import { jsonError, jsonOk } from "@/lib/api-response";
import { summarizeChangeEvents } from "@/lib/change-detection";
import { isAnakinConfigured } from "@/lib/anakin";
import { isOpenAIConfigured } from "@/lib/openai-insights";
import { getProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);

  if (!project) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  return jsonOk({
    ok: true,
    projectId: project.id,
    name: project.name,
    companyUrl: project.companyUrl,
    status: project.status,
    trackingMode: project.trackingMode ?? "fallback",
    liveSource: project.liveSource ?? "demo-fallback",
    lastLiveCheckAt: project.lastLiveCheckAt ?? project.lastUpdated,
    liveUrlsFound: project.liveUrlsFound ?? 0,
    selectedLiveUrlsCount: project.selectedLiveUrlsCount ?? 0,
    extractionQuality: project.extractionQuality ?? "fallback",
    selectedBlocks: project.selectedBlocks,
    discoveredUrls: project.discoveredUrls,
    generatedEndpoints: {
      feed: project.endpoint,
      changes: project.changesEndpoint,
      schema: project.schemaEndpoint,
      insights: `/api/v1/projects/${project.id}/insights`,
      aiAnalysis: `/api/v1/projects/${project.id}/ai-analysis`,
      refresh: `/api/v1/projects/${project.id}/refresh`,
    },
    changeSummary: summarizeChangeEvents(project.changes),
    aiReady: isOpenAIConfigured(),
    anakinReady: isAnakinConfigured(),
    notes: project.trackingNotes ?? [],
  });
}
