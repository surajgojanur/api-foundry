import { jsonOk } from "@/lib/api-response";
import { createProjectFromAnakinFast, refreshProjectFromAnakin, withTimeout } from "@/lib/anakin";
import { getLiveTrackingTargets } from "@/lib/live-targets";
import { getProject, upsertProject } from "@/lib/project-store";

export const dynamic = "force-dynamic";
const PER_TARGET_TIMEOUT_MS = 25_000;

export async function POST() {
  const startedAt = Date.now();
  const refreshedAt = new Date().toISOString();
  const tasks = getLiveTrackingTargets().map(async (target) => {
    const targetStarted = Date.now();
    const targetId = target.projectId ?? "";
    try {
      let project = getProject(targetId);
      if (!project) {
        project = await createProjectFromAnakinFast({ ...target, forcedId: targetId });
      }

      const refreshed = await withTimeout(
        refreshProjectFromAnakin(project.id),
        PER_TARGET_TIMEOUT_MS,
        () => undefined,
      );
      const finalProject = refreshed ?? project;
      const highSeverityChanges = finalProject.changes.filter((item) => item.severity === "high").length;
      const timedOut = !refreshed;
      const trackingNotes = timedOut
        ? [...(finalProject.trackingNotes ?? []), "Deep refresh timed out; previous snapshot retained."]
        : (finalProject.trackingNotes ?? []);
      if (timedOut) upsertProject({ ...finalProject, trackingNotes, lastLiveCheckAt: new Date().toISOString() });

      return {
        status: "fulfilled" as const,
        value: {
        id: finalProject.id,
        name: finalProject.name,
        durationMs: Date.now() - targetStarted,
        status: finalProject.status,
        trackingMode: finalProject.trackingMode ?? "fallback",
        extractionQuality: finalProject.extractionQuality ?? "fallback",
        liveUrlsFound: finalProject.liveUrlsFound ?? 0,
        selectedLiveUrlsCount: finalProject.selectedLiveUrlsCount ?? 0,
        trackingNotes,
        changesDetected: finalProject.changes.length,
        highSeverityChanges,
        lastUpdated: finalProject.lastUpdated,
        endpoint: finalProject.endpoint,
        changesEndpoint: finalProject.changesEndpoint,
        aiAnalysisEndpoint: `/api/v1/projects/${finalProject.id}/ai-analysis`,
      }};
    } catch (error) {
      return {
        status: "rejected" as const,
        value: {
        id: targetId,
        name: target.name,
        durationMs: Date.now() - targetStarted,
        status: "error",
        trackingMode: "fallback",
        extractionQuality: "fallback",
        liveUrlsFound: 0,
        selectedLiveUrlsCount: 0,
        trackingNotes: ["Deep refresh timed out; previous snapshot retained."],
        changesDetected: 0,
        highSeverityChanges: 0,
        error: process.env.NODE_ENV === "development" ? (error as Error).message : "Refresh failed",
      }};
    }
  });

  const settled = await Promise.all(tasks);
  const results = settled.map((item) => item.value);

  return jsonOk({
    ok: true,
    refreshedAt,
    refreshDurationMs: Date.now() - startedAt,
    results,
  });
}
