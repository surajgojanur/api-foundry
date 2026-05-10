import { detectCompetitorStrategy, scoreProjectAggressiveness, scoreProjectStability } from "@/lib/insights";
import { jsonOk } from "@/lib/api-response";
import { getProjects } from "@/lib/project-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = getProjects().map((project) => {
    const highSeverityChanges = project.changes.filter((item) => item.severity === "high").length;
    return {
      id: project.id,
      name: project.name,
      companyUrl: project.companyUrl,
      status: project.status,
      useCase: project.useCase,
      selectedBlocks: project.selectedBlocks,
      endpoint: project.endpoint,
      trackingMode: project.trackingMode ?? "fallback",
      extractionQuality: project.extractionQuality ?? "fallback",
      schemaEndpoint: project.schemaEndpoint,
      changesEndpoint: project.changesEndpoint,
      insightsEndpoint: `/api/v1/projects/${project.id}/insights`,
      refreshEndpoint: `/api/v1/projects/${project.id}/refresh`,
      lastUpdated: project.lastUpdated,
      changesDetected: project.changes.length,
      highSeverityChanges,
      latestChangeTitle: project.changes[0]?.title ?? "No recent change",
      strategy: detectCompetitorStrategy(project),
      aggressivenessScore: scoreProjectAggressiveness(project),
      stabilityScore: scoreProjectStability(project),
    };
  });

  return jsonOk({ ok: true, count: projects.length, projects });
}
