import { jsonOk } from "@/lib/api-response";
import { getProjects } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = getProjects();

  return jsonOk({
    ok: true,
    count: projects.length,
    ids: projects.map((p) => p.id),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      companyUrl: p.companyUrl,
      status: p.status,
      trackingMode: p.trackingMode ?? "fallback",
      endpoint: p.endpoint,
      lastUpdated: p.lastUpdated,
    })),
  });
}
