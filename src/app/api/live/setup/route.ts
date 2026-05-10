import { jsonOk } from "@/lib/api-response";
import { buildFallbackLiveProject, createProjectFromAnakinFast, withTimeout } from "@/lib/anakin";
import { getLiveTrackingTargets } from "@/lib/live-targets";
import { upsertProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";

const PER_TARGET_TIMEOUT_MS = 12_000;

export async function POST() {
  const startedAt = Date.now();
  const createdAt = new Date().toISOString();
  const tasks = getLiveTrackingTargets().map(async (target) => {
    const targetStarted = Date.now();
    const targetId = target.projectId ?? `${target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const project = await withTimeout(
      createProjectFromAnakinFast({ ...target, forcedId: targetId }),
      PER_TARGET_TIMEOUT_MS,
      () => buildFallbackLiveProject({ ...target, forcedId: targetId }),
    );
    const saved = upsertProject(project.id === targetId ? project : { ...project, id: targetId });
    return {
      status: "fulfilled" as const,
      value: {
        id: targetId,
        name: saved.name,
        success: true,
        durationMs: Date.now() - targetStarted,
        trackingMode: saved.trackingMode ?? "fallback",
        extractionQuality: saved.extractionQuality ?? "fallback",
        liveUrlsFound: saved.liveUrlsFound ?? 0,
        selectedLiveUrlsCount: saved.selectedLiveUrlsCount ?? 0,
        trackingNotes: saved.trackingNotes ?? [],
        companyUrl: saved.companyUrl,
        endpoint: saved.endpoint,
        changesEndpoint: saved.changesEndpoint,
        insightsEndpoint: `/api/v1/projects/${targetId}/insights`,
        aiAnalysisEndpoint: `/api/v1/projects/${targetId}/ai-analysis`,
        projectUrl: `/projects/${targetId}`,
      },
    };
  });

  const settled = await Promise.allSettled(tasks);
  const results = settled.map((entry, index) => {
    const target = getLiveTrackingTargets()[index];
    const targetId = target.projectId ?? `${target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    if (entry.status === "fulfilled") return entry.value.value;

    const fallback = upsertProject(buildFallbackLiveProject({ ...target, forcedId: targetId }));
    return {
      id: targetId,
      name: target.name,
      success: true,
      durationMs: PER_TARGET_TIMEOUT_MS,
      trackingMode: fallback.trackingMode ?? "fallback",
      extractionQuality: fallback.extractionQuality ?? "fallback",
      liveUrlsFound: fallback.liveUrlsFound ?? 0,
      selectedLiveUrlsCount: fallback.selectedLiveUrlsCount ?? 0,
      trackingNotes: fallback.trackingNotes ?? [],
      endpoint: fallback.endpoint,
      changesEndpoint: fallback.changesEndpoint,
      insightsEndpoint: `/api/v1/projects/${targetId}/insights`,
      aiAnalysisEndpoint: `/api/v1/projects/${targetId}/ai-analysis`,
      projectUrl: `/projects/${targetId}`,
      companyUrl: target.companyUrl,
      error: process.env.NODE_ENV === "development" ? entry.reason instanceof Error ? entry.reason.message : "Target setup failed" : "Target setup failed",
    };
  });

  return jsonOk({
    ok: true,
    createdAt,
    setupDurationMs: Date.now() - startedAt,
    targets: results,
  });
}
