import { jsonOk } from "@/lib/api-response";
import { compareProjects, getProject, getProjects } from "@/lib/project-store";
import { generateOpenAIComparisonAnalysis } from "@/lib/openai-insights";
import type { CompetitorProject } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("projects");
  const ids = requested
    ? requested.split(",").map((id) => id.trim()).filter(Boolean)
    : getProjects().map((project) => project.id);

  const deterministicComparison = compareProjects(ids);
  const projects = ids
    .map((id) => getProject(id))
    .filter((project): project is CompetitorProject => Boolean(project));

  const aiComparison = await generateOpenAIComparisonAnalysis(projects);

  return jsonOk({
    ok: true,
    mode: aiComparison ? "openai-enhanced" : "deterministic-fallback",
    deterministicComparison,
    aiComparison,
    meta: {
      generatedBy: "PricePulse",
      description: "OpenAI-enhanced market comparison with deterministic fallback",
    },
  });
}
