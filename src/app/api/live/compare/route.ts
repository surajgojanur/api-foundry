import { jsonOk } from "@/lib/api-response";
import { compareProjects, getProject } from "@/lib/project-store";
import { generateOpenAIComparisonAnalysis } from "@/lib/openai-insights";
import type { CompetitorProject } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const compared = ["live-zepto", "live-blinkit"];
  const deterministicComparison = compareProjects(compared);
  const projects = compared
    .map((id) => getProject(id))
    .filter((project): project is CompetitorProject => Boolean(project));

  const aiComparison = await generateOpenAIComparisonAnalysis(projects);

  return jsonOk({
    ok: true,
    compared,
    deterministicComparison,
    aiComparisonMode: aiComparison ? "openai-enhanced" : "deterministic-fallback",
    aiComparison,
    endpoints: {
      zepto: {
        feed: "/api/v1/projects/live-zepto/feed",
        changes: "/api/v1/projects/live-zepto/changes",
        insights: "/api/v1/projects/live-zepto/insights",
        aiAnalysis: "/api/v1/projects/live-zepto/ai-analysis",
      },
      blinkit: {
        feed: "/api/v1/projects/live-blinkit/feed",
        changes: "/api/v1/projects/live-blinkit/changes",
        insights: "/api/v1/projects/live-blinkit/insights",
        aiAnalysis: "/api/v1/projects/live-blinkit/ai-analysis",
      },
    },
  });
}
