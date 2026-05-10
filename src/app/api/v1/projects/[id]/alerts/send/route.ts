import { jsonError, jsonOk } from "@/lib/api-response";
import { sendProjectTelegramAlerts } from "@/lib/alerts";
import { getTelegramHealth } from "@/lib/telegram";
import { addAlertDeliveries, getProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);

  if (!project) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  const deliveries = await sendProjectTelegramAlerts(project);
  addAlertDeliveries(project.id, deliveries);

  return jsonOk({
    ok: true,
    projectId: project.id,
    projectName: project.name,
    alertsAttempted: deliveries.length,
    alertsSent: deliveries.filter((item) => item.ok).length,
    deliveries,
    telegramConfigured: getTelegramHealth().configured,
  });
}
