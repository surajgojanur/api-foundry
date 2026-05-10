import { jsonError, jsonOk } from "@/lib/api-response";
import { summarizeChangeEvents } from "@/lib/change-detection";
import { didLastAnakinCallSucceed, isAnakinConfigured, refreshProjectFromAnakin } from "@/lib/anakin";
import { getProject, refreshProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!getProject(id)) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  let project = await refreshProjectFromAnakin(id);

  if (!project) {
    project = refreshProject(id);
  }

  if (!project) {
    return jsonError("Project refresh failed", 500, { projectId: id });
  }

  const mode: "live" | "fallback" = isAnakinConfigured() && didLastAnakinCallSucceed() ? "live" : "fallback";

  return jsonOk({
    ok: true,
    mode,
    message: "Project refreshed successfully",
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      lastUpdated: project.lastUpdated,
      changesDetected: project.changes.length,
      endpoint: project.endpoint,
      changesEndpoint: project.changesEndpoint,
      schemaEndpoint: project.schemaEndpoint,
    },
    changeSummary: summarizeChangeEvents(project.changes),
    latestChanges: project.changes.slice(0, 10),
  });
}
