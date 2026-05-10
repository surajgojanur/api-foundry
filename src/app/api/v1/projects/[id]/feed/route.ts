import { getExecutiveSummary } from "@/lib/project-store";
import { jsonError, jsonOk } from "@/lib/api-response";
import { getProject, getProjectFeed } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);
  const feed = getProjectFeed(id);

  if (!project || !feed) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  const highSeverityChangeCount = project.changes.filter((item) => item.severity === "high").length;
  const executiveHeadline = (getExecutiveSummary(project.id) as { headline?: string } | undefined)?.headline;

  return jsonOk({
    ok: true,
    ...(feed as object),
    meta: {
      generatedBy: "PricePulse",
      description: "Generated competitor intelligence feed",
      refreshMode: "on-demand",
      demoMode: true,
      changeCount: project.changes.length,
      highSeverityChangeCount,
      lastChangeDetectedAt: project.changes[0]?.detectedAt ?? null,
      refreshEndpoint: `/api/v1/projects/${project.id}/refresh`,
      insightsEndpoint: `/api/v1/projects/${project.id}/insights`,
      executiveHeadline: executiveHeadline ?? null,
    },
  });
}
