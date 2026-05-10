import "server-only";

import OpenAI from "openai";
import { buildInsightApiResponse, detectCompetitorStrategy } from "@/lib/insights";
import type { CompetitorProject } from "@/lib/types";

const MODEL_CANDIDATES = [process.env.OPENAI_MODEL || "gpt-5.5-mini", "gpt-4o-mini"];

type OpenAIHealth = {
  configured: boolean;
  valid?: boolean;
  mode: "ai-live-ready" | "ai-live" | "deterministic-fallback";
  maskedKey: string | null;
  checkedAt: string;
  message: string;
};

function stripWrappedQuotes(input: string) {
  return input.replace(/^['"]+|['"]+$/g, "");
}

export function getOpenAIApiKey(): string | null {
  const raw = process.env.OPENAI_API_KEY ?? process.env.OPEN_AI;
  if (!raw) return null;
  const cleaned = stripWrappedQuotes(raw.trim()).trim();
  return cleaned.length ? cleaned : null;
}

export function maskOpenAIKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey());
}

function isUnauthorizedError(error: unknown): boolean {
  const message = (error as Error)?.message?.toLowerCase() ?? "";
  const status = (error as { status?: number })?.status;
  return status === 401 || status === 403 || message.includes("unauthorized") || message.includes("invalid api key");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15_000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("OpenAI request timed out")), timeoutMs)),
  ]);
}

function getResponseText(response: unknown): string {
  const payload = response as { output_text?: unknown; output?: unknown[] };

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  if (Array.isArray(payload.output)) {
    const chunks: string[] = [];
    for (const item of payload.output) {
      const content = (item as { content?: unknown[] }).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const text = (c as { text?: string }).text;
        if (typeof text === "string") chunks.push(text);
      }
    }
    return chunks.join("\n");
  }

  return "";
}

function extractJsonObject(text: string): object | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const direct = (() => {
    try {
      return JSON.parse(trimmed) as object;
    } catch {
      return null;
    }
  })();
  if (direct && typeof direct === "object") return direct;

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const fragment = trimmed.slice(first, last + 1);
    try {
      const parsed = JSON.parse(fragment) as object;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

async function callOpenAIJson(prompt: string): Promise<object | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await withTimeout(
        client.responses.create({
          model,
          input: prompt,
        }),
      );

      const text = getResponseText(response);
      const parsed = extractJsonObject(text);
      if (parsed) return parsed;
    } catch {
      // Try fallback model.
    }
  }

  return null;
}

export async function getOpenAIHealth(options?: { validate?: boolean }): Promise<OpenAIHealth> {
  const key = getOpenAIApiKey();
  const configured = Boolean(key);
  const checkedAt = new Date().toISOString();

  if (!configured) {
    return {
      configured: false,
      mode: "deterministic-fallback",
      maskedKey: null,
      checkedAt,
      message: "OpenAI key missing. Deterministic fallback is active.",
    };
  }

  if (!options?.validate) {
    return {
      configured: true,
      mode: "ai-live-ready",
      maskedKey: maskOpenAIKey(key),
      checkedAt,
      message: "OpenAI key configured. Use ?validate=true to verify live API access.",
    };
  }

  const client = new OpenAI({ apiKey: key });

  for (const model of MODEL_CANDIDATES) {
    try {
      await withTimeout(
        client.responses.create({
          model,
          input: "Return only the word ok.",
        }),
        15_000,
      );

      return {
        configured: true,
        valid: true,
        mode: "ai-live",
        maskedKey: maskOpenAIKey(key),
        checkedAt,
        message: "OpenAI API key is valid",
      };
    } catch (error) {
      if (isUnauthorizedError(error)) {
        return {
          configured: true,
          valid: false,
          mode: "deterministic-fallback",
          maskedKey: maskOpenAIKey(key),
          checkedAt,
          message: "OpenAI API key invalid or inactive",
        };
      }
    }
  }

  return {
    configured: true,
    valid: false,
    mode: "deterministic-fallback",
    maskedKey: maskOpenAIKey(key),
    checkedAt,
    message: "OpenAI validation failed",
  };
}

function compactSnapshotSummary(project: CompetitorProject) {
  const snapshot = project.currentSnapshot;
  const byBlock = Object.fromEntries(
    project.selectedBlocks.map((block) => [block, snapshot.data[block]?.length ?? 0]),
  );
  return {
    capturedAt: snapshot.capturedAt,
    sourceUrls: snapshot.sourceUrls.slice(0, 8),
    blockCounts: byBlock,
  };
}

function compactChanges(project: CompetitorProject) {
  return project.changes.slice(0, 20).map((change) => ({
    type: change.type,
    title: change.title,
    entity: change.entity,
    severity: change.severity,
    oldValue: change.oldValue,
    newValue: change.newValue,
    explanation: change.explanation,
    detectedAt: change.detectedAt,
  }));
}

export function buildProjectAnalysisPrompt(project: CompetitorProject): string {
  const highSeverityCount = project.changes.filter((item) => item.severity === "high").length;
  const deterministic = buildInsightApiResponse(project);

  const context = {
    project: {
      id: project.id,
      name: project.name,
      companyUrl: project.companyUrl,
      status: project.status,
      selectedBlocks: project.selectedBlocks,
      endpoints: {
        feed: project.endpoint,
        changes: project.changesEndpoint,
        schema: project.schemaEndpoint,
        insights: `/api/v1/projects/${project.id}/insights`,
        refresh: `/api/v1/projects/${project.id}/refresh`,
      },
      strategyHint: detectCompetitorStrategy(project),
      highSeverityCount,
    },
    changeEvents: compactChanges(project),
    snapshotSummary: compactSnapshotSummary(project),
    deterministicSummary: {
      executiveSummary: deterministic.executiveSummary,
      sourceSignals: deterministic.sourceSignals,
    },
  };

  return [
    "You are an enterprise competitor-intelligence analyst.",
    "Use ONLY the provided data. Do not invent facts.",
    "Return STRICT JSON only (no markdown, no extra text).",
    "Output schema:",
    '{"headline":"string","executiveSummary":"string","competitorStrategy":"string","riskLevel":"low|medium|high","opportunities":["string"],"recommendedActions":["string"],"monitoringFocus":["string"],"apiUsageSuggestion":"string","confidenceScore":0}',
    `Data: ${JSON.stringify(context)}`,
  ].join("\n");
}

export async function generateOpenAIProjectAnalysis(project: CompetitorProject): Promise<object | null> {
  if (!isOpenAIConfigured()) return null;

  const prompt = buildProjectAnalysisPrompt(project);
  return await callOpenAIJson(prompt);
}

export async function generateOpenAIComparisonAnalysis(projects: CompetitorProject[]): Promise<object | null> {
  if (!isOpenAIConfigured()) return null;

  const compact = projects.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    selectedBlocks: project.selectedBlocks,
    changesCount: project.changes.length,
    highSeverityChanges: project.changes.filter((c) => c.severity === "high").length,
    topChanges: project.changes.slice(0, 8).map((c) => ({ type: c.type, title: c.title, severity: c.severity })),
    endpoints: {
      feed: project.endpoint,
      changes: project.changesEndpoint,
      schema: project.schemaEndpoint,
      insights: `/api/v1/projects/${project.id}/insights`,
    },
    strategyHint: detectCompetitorStrategy(project),
  }));

  const prompt = [
    "You are an enterprise market intelligence analyst.",
    "Use ONLY the provided data. Do not invent facts.",
    "Return STRICT JSON only.",
    "Output schema:",
    '{"marketNarrative":"string","mostAggressiveCompetitor":"string","mostStableCompetitor":"string","recommendedMonitoringOrder":["string"],"strategicRisks":["string"],"recommendedActions":["string"],"judgeDemoSummary":"string","confidenceScore":0}',
    `Data: ${JSON.stringify(compact)}`,
  ].join("\n");

  return await callOpenAIJson(prompt);
}

export function mergeOpenAIWithDeterministicInsights(
  _project: CompetitorProject,
  deterministicResponse: object,
  aiResponse: object | null,
) {
  return {
    mode: aiResponse ? "openai-enhanced" : "deterministic-fallback",
    aiAnalysis: aiResponse,
    deterministicBackup: deterministicResponse,
    generatedAt: new Date().toISOString(),
  };
}
