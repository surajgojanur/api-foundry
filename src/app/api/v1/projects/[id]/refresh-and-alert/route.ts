import { jsonError, jsonOk } from "@/lib/api-response";
import { sendProjectTelegramAlerts } from "@/lib/alerts";
import { didLastAnakinCallSucceed, isAnakinConfigured, refreshProjectFromAnakin } from "@/lib/anakin";
import { getTelegramHealth } from "@/lib/telegram";
import { addAlertDeliveries, getProject, refreshProject } from "@/lib/project-store";

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

  const deliveries = await sendProjectTelegramAlerts(project);
  addAlertDeliveries(project.id, deliveries);

  return jsonOk({
    ok: true,
    mode: isAnakinConfigured() && didLastAnakinCallSucceed() ? "live" : "fallback",
    projectId: project.id,
    projectName: project.name,
    changesDetected: project.changes.length,
    alertsAttempted: deliveries.length,
    alertsSent: deliveries.filter((item) => item.ok).length,
    deliveries,
    telegramConfigured: getTelegramHealth().configured,
    message: "Refresh complete and alerts processed",
  });
}
