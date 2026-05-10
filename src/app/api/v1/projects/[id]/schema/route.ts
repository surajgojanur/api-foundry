import { jsonError, jsonOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";
import { getProjectSchema } from "@/lib/project-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const contract = getProjectSchema(id);

  if (!contract) {
    return jsonError("Project not found", 404, { projectId: id });
  }

  return jsonOk({
    ok: true,
    projectId: id,
    contract,
    meta: {
      generatedBy: "PricePulse",
      description: "API contract generated from selected competitor data blocks",
      demoMode: true,
    },
  });
}
