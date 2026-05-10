import { jsonError, jsonOk } from "@/lib/api-response";
import { getProject, getProjectAlerts } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);

  if (!project) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  const alerts = getProjectAlerts(id);
  return jsonOk({
    ok: true,
    projectId: id,
    count: alerts.length,
    alerts,
  });
}
