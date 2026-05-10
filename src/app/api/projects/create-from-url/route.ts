import { jsonError, jsonOk } from "@/lib/api-response";
import { createProjectFromAnakin, didLastAnakinCallSucceed, isAnakinConfigured, validateAnakinCredentials } from "@/lib/anakin";
import { upsertProject } from "@/lib/project-store";
import type { CreateProjectInput, DataBlockType } from "@/lib/types";

type CreateFromUrlBody = {
  name?: string;
  companyUrl?: string;
  useCase?: string;
  country?: string;
  selectedBlocks?: DataBlockType[];
};

const defaultBlocks: DataBlockType[] = ["products", "offers", "availability"];
const allowedBlocks: DataBlockType[] = ["products", "prices", "offers", "availability", "announcements", "jobs", "blog", "locations"];
export const dynamic = "force-dynamic";

function toValidUrl(input: string) {
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`;
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeBlocks(blocks: unknown): DataBlockType[] {
  if (!Array.isArray(blocks)) return defaultBlocks;
  const selected = blocks.filter((item): item is DataBlockType => typeof item === "string" && allowedBlocks.includes(item as DataBlockType));
  return selected.length ? selected : defaultBlocks;
}

export async function POST(request: Request) {
  let body: CreateFromUrlBody;
  try {
    body = (await request.json()) as CreateFromUrlBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.name || body.name.trim().length < 2) return jsonError("name is required", 400);
  if (!body.companyUrl) return jsonError("companyUrl is required", 400);

  const companyUrl = toValidUrl(body.companyUrl);
  if (!companyUrl) return jsonError("companyUrl must be a valid URL", 400);

  const payload: CreateProjectInput = {
    name: body.name.trim(),
    companyUrl,
    useCase: body.useCase?.trim() || "competitor intelligence",
    country: (body.country ?? "in").toLowerCase(),
    selectedBlocks: sanitizeBlocks(body.selectedBlocks),
  };

  try {
    const project = await createProjectFromAnakin(payload);
    const savedProject = upsertProject(project);
    const mode: "live" | "mixed" | "fallback" = savedProject.trackingMode
      ?? (isAnakinConfigured() && didLastAnakinCallSucceed() ? "live" : "fallback");

    let fallbackReason: string | undefined;
    if (mode === "fallback") {
      fallbackReason = "Fallback demo mode";
      if (isAnakinConfigured()) {
        const validation = await validateAnakinCredentials();
        if (validation.configured && validation.valid === false && validation.statusCode && [401, 403].includes(validation.statusCode)) {
          fallbackReason = "Anakin API key invalid/inactive";
        } else {
          fallbackReason = "Anakin request failed";
        }
      } else {
        fallbackReason = "Anakin API key missing";
      }
    }

    return jsonOk({
      ok: true,
      mode,
      fallbackReason,
      note: mode === "fallback"
        ? "Project created using demo-stable fallback extraction. Add a valid Anakin API key for live extraction."
        : undefined,
      project: {
        id: savedProject.id,
        name: savedProject.name,
        companyUrl: savedProject.companyUrl,
        selectedBlocks: savedProject.selectedBlocks,
        discoveredUrls: savedProject.discoveredUrls,
        endpoint: savedProject.endpoint,
        schemaEndpoint: savedProject.schemaEndpoint,
        changesEndpoint: savedProject.changesEndpoint,
        insightsEndpoint: `/api/v1/projects/${savedProject.id}/insights`,
        aiAnalysisEndpoint: `/api/v1/projects/${savedProject.id}/ai-analysis`,
        lastUpdated: savedProject.lastUpdated,
        status: savedProject.status,
        trackingMode: savedProject.trackingMode ?? mode,
      },
      next: {
        projectUrl: `/projects/${savedProject.id}`,
        feedEndpoint: savedProject.endpoint,
        changesEndpoint: savedProject.changesEndpoint,
        schemaEndpoint: savedProject.schemaEndpoint,
        insightsEndpoint: `/api/v1/projects/${savedProject.id}/insights`,
        aiAnalysisEndpoint: `/api/v1/projects/${savedProject.id}/ai-analysis`,
      },
    });
  } catch (error) {
    const details = process.env.NODE_ENV === "development" ? { reason: (error as Error).message } : undefined;
    return jsonError("Unable to create project from the provided URL", 500, details);
  }
}
