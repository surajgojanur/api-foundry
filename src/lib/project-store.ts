import { buildApiContract, buildFeedResponse } from "@/lib/api-contract";
import { summarizeChangeEvents, detectChanges } from "@/lib/change-detection";
import { demoProjects } from "@/lib/demo-data";
import { getDefaultAlertRule } from "@/lib/alerts";
import { buildInsightApiResponse, generateComparisonInsights, generateExecutiveSummary, generateProjectInsights } from "@/lib/insights";
import type {
  AlertDelivery,
  AlertRule,
  ChangeEvent,
  CompetitorProject,
  CreateProjectInput,
  DataBlockType,
  InsightCard,
  ProjectSnapshot,
} from "@/lib/types";

const globalForProjects = globalThis as typeof globalThis & {
  __API_FOUNDRY_PROJECTS__?: CompetitorProject[];
};

function isoNow() {
  return new Date().toISOString();
}

export function ensureProjectAlertDefaults(project: CompetitorProject): CompetitorProject {
  const alertRules = project.alertRules?.length ? project.alertRules : [getDefaultAlertRule(project.id)];
  return {
    ...project,
    alertRules,
    alertDeliveries: project.alertDeliveries ?? [],
    telegramAlertsEnabled: project.telegramAlertsEnabled ?? true,
  };
}

if (!globalForProjects.__API_FOUNDRY_PROJECTS__) {
  globalForProjects.__API_FOUNDRY_PROJECTS__ = structuredClone(demoProjects).map((project) => ensureProjectAlertDefaults(project));
}

function store(): CompetitorProject[] {
  return globalForProjects.__API_FOUNDRY_PROJECTS__!;
}

function getDefaultBlocks(): DataBlockType[] {
  return ["products", "offers", "availability"];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function buildDeterministicRefreshChange(project: CompetitorProject): ChangeEvent {
  const templates: Array<Omit<ChangeEvent, "id" | "projectId" | "detectedAt">> = [
    {
      type: "price_changed",
      title: "Apple 1kg price updated in latest scan",
      entity: "Apple 1kg",
      oldValue: 102,
      newValue: 99,
      severity: "medium",
      sourceUrl: project.discoveredUrls[1] ?? project.companyUrl,
      explanation: "Price adjustment detected in high-traffic product listing.",
    },
    {
      type: "offer_added",
      title: "Limited-time grocery discount campaign added",
      entity: "Homepage offer banner",
      oldValue: null,
      newValue: "Flat 20% OFF on essentials",
      severity: "medium",
      sourceUrl: project.discoveredUrls[4] ?? project.companyUrl,
      explanation: "New offer campaign introduced since previous refresh.",
    },
    {
      type: "availability_changed",
      title: "Toned Milk 1L availability shifted",
      entity: "Toned Milk 1L",
      oldValue: "in_stock",
      newValue: "limited_stock",
      severity: "high",
      sourceUrl: project.discoveredUrls[2] ?? project.companyUrl,
      explanation: "Core daily-essential inventory volatility observed.",
    },
  ];

  const template = templates[project.changes.length % templates.length];

  return {
    ...template,
    id: `${project.id}-rf-${project.changes.length + 1}`,
    projectId: project.id,
    detectedAt: isoNow(),
  };
}

function updateInsights(project: CompetitorProject): InsightCard[] {
  return generateProjectInsights(project);
}

function initializeDemoInsights() {
  const projects = store();
  for (let i = 0; i < projects.length; i += 1) {
    projects[i] = ensureProjectAlertDefaults(projects[i]);
    if (!projects[i].insights || projects[i].insights.length === 0) {
      projects[i].insights = updateInsights(projects[i]);
    }
  }
}
initializeDemoInsights();

export function getProjects(): CompetitorProject[] {
  const projects = store();
  for (let i = 0; i < projects.length; i += 1) {
    projects[i] = ensureProjectAlertDefaults(projects[i]);
  }
  return projects;
}

export function getProject(id: string): CompetitorProject | undefined {
  const project = store().find((entry) => entry.id === id);
  if (!project) return undefined;
  return ensureProjectAlertDefaults(project);
}

export function projectExists(id: string): boolean {
  return store().some((project) => project.id === id);
}

export function createProject(input: CreateProjectInput): CompetitorProject {
  const id = input.projectId?.trim() || slugify(input.name);
  const createdAt = isoNow();
  const selectedBlocks = input.selectedBlocks?.length ? input.selectedBlocks : getDefaultBlocks();

  const projects = store();
  const existingIndex = projects.findIndex((project) => project.id === id);

  const project: CompetitorProject = ensureProjectAlertDefaults({
    id,
    name: input.name,
    companyUrl: input.companyUrl,
    useCase: input.useCase,
    country: input.country ?? "India",
    status: "scanning",
    selectedBlocks,
    discoveredUrls: [input.companyUrl],
    endpoint: `/api/v1/projects/${id}/feed`,
    schemaEndpoint: `/api/v1/projects/${id}/schema`,
    changesEndpoint: `/api/v1/projects/${id}/changes`,
    currentSnapshot: {
      id: `snap-${id}-cur`,
      projectId: id,
      capturedAt: createdAt,
      sourceUrls: [input.companyUrl],
      data: {},
    },
    changes: [],
    insights: [],
    lastUpdated: createdAt,
    createdAt,
    trackingMode: "fallback",
    liveSource: "demo-fallback",
    lastLiveCheckAt: createdAt,
    liveUrlsFound: 0,
    selectedLiveUrlsCount: 0,
    extractionQuality: "fallback",
    trackingNotes: ["Project initialized in demo-stable mode."],
  });

  if (existingIndex >= 0) {
    const merged = ensureProjectAlertDefaults({
      ...projects[existingIndex],
      ...project,
      id,
      createdAt: projects[existingIndex].createdAt,
    });
    merged.insights = updateInsights(merged);
    projects[existingIndex] = merged;
    return merged;
  }

  project.insights = updateInsights(project);
  projects.unshift(project);
  return project;
}

export function updateProject(id: string, patch: Partial<CompetitorProject>): CompetitorProject | undefined {
  const projects = store();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) return undefined;

  const merged: CompetitorProject = ensureProjectAlertDefaults({
    ...projects[index],
    ...patch,
    id: projects[index].id,
    createdAt: projects[index].createdAt,
  });

  projects[index] = merged;
  return merged;
}

export function upsertProject(project: CompetitorProject): CompetitorProject {
  const projects = store();
  const index = projects.findIndex((p) => p.id === project.id);
  const normalized = ensureProjectAlertDefaults(project);
  if (index >= 0) {
    projects[index] = ensureProjectAlertDefaults({ ...projects[index], ...normalized });
    return projects[index];
  }
  projects.push(normalized);
  return normalized;
}

export function deleteProject(id: string): boolean {
  const projects = store();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  return true;
}

export function refreshProjectWithSnapshot(id: string, newSnapshot: ProjectSnapshot): CompetitorProject | undefined {
  const project = getProject(id);
  if (!project) return undefined;

  const previousSnapshot = project.currentSnapshot;
  const changes = detectChanges(previousSnapshot, newSnapshot, id);

  const updated = updateProject(id, {
    previousSnapshot,
    currentSnapshot: newSnapshot,
    changes,
    status: "active",
    lastUpdated: isoNow(),
  });

  if (!updated) return undefined;
  const withInsights = updateProject(id, { insights: updateInsights(updated) });
  return withInsights ?? updated;
}

export function setProjectError(id: string, message: string): CompetitorProject | undefined {
  const project = getProject(id);
  if (!project) return undefined;

  const errorInsight: InsightCard = {
    id: `${id}-error-${Date.now()}`,
    title: "Refresh Issue",
    description: message,
    recommendation: "Using latest known data. Retry refresh in a few minutes.",
    severity: "high",
    confidenceScore: 82,
  };

  const updated = updateProject(id, {
    status: "error",
    insights: [errorInsight, ...project.insights.filter((item) => item.title !== "Refresh Issue")].slice(0, 6),
    lastUpdated: isoNow(),
  });

  return updated;
}

export function refreshProject(id: string): CompetitorProject | undefined {
  const project = getProject(id);
  if (!project) return undefined;

  const previousSnapshot = project.currentSnapshot;
  const simulatedChange = buildDeterministicRefreshChange(project);

  const copiedData: ProjectSnapshot["data"] = {};
  for (const [block, items] of Object.entries(previousSnapshot.data) as Array<[DataBlockType, typeof previousSnapshot.data[DataBlockType]]>) {
    copiedData[block] = (items ?? []).map((item) => ({ ...item }));
  }

  const currentSnapshot: ProjectSnapshot = {
    id: `snap-${id}-${Date.now()}`,
    projectId: id,
    capturedAt: isoNow(),
    sourceUrls: previousSnapshot.sourceUrls,
    data: copiedData,
  };

  const updated = updateProject(id, {
    previousSnapshot,
    currentSnapshot,
    changes: [simulatedChange, ...project.changes].slice(0, 50),
    status: "active",
    lastUpdated: isoNow(),
  });

  if (!updated) return undefined;
  return updateProject(id, { insights: updateInsights(updated) }) ?? updated;
}

export function getProjectFeed(id: string): object | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  return buildFeedResponse(project);
}

export function getProjectChanges(id: string): ChangeEvent[] | undefined {
  return getProject(id)?.changes;
}

export function getProjectSchema(id: string) {
  const project = getProject(id);
  if (!project) return undefined;
  return buildApiContract(project);
}

export function getProjectInsights(id: string): object | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  return buildInsightApiResponse(project);
}

export function getExecutiveSummary(id: string): object | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  return generateExecutiveSummary(project);
}

export function addAlertDelivery(projectId: string, delivery: AlertDelivery): AlertDelivery | undefined {
  const project = getProject(projectId);
  if (!project) return undefined;

  const nextDeliveries = [delivery, ...(project.alertDeliveries ?? [])].slice(0, 50);
  const updated = updateProject(projectId, { alertDeliveries: nextDeliveries });
  return updated ? delivery : undefined;
}

export function addAlertDeliveries(projectId: string, deliveries: AlertDelivery[]): AlertDelivery[] {
  if (!deliveries.length) return [];

  const project = getProject(projectId);
  if (!project) return [];

  const nextDeliveries = [...deliveries, ...(project.alertDeliveries ?? [])].slice(0, 50);
  const updated = updateProject(projectId, { alertDeliveries: nextDeliveries });
  return updated ? deliveries : [];
}

export function getProjectAlerts(projectId: string): AlertDelivery[] {
  const project = getProject(projectId);
  return project?.alertDeliveries ?? [];
}

export function enableTelegramAlerts(projectId: string, enabled: boolean): CompetitorProject | undefined {
  return updateProject(projectId, { telegramAlertsEnabled: enabled });
}

export function setProjectAlertRules(projectId: string, rules: AlertRule[]): CompetitorProject | undefined {
  return updateProject(projectId, {
    alertRules: rules.length ? rules : [getDefaultAlertRule(projectId)],
  });
}

export function compareProjects(ids: string[]) {
  const projects = ids
    .map((id) => getProject(id))
    .filter((project): project is CompetitorProject => Boolean(project));

  const comparisonInsights = generateComparisonInsights(projects);

  return {
    comparedProjectIds: ids,
    comparedAt: isoNow(),
    summary: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      strategy: generateExecutiveSummary(project).strategy,
      selectedBlocks: project.selectedBlocks,
      changes: project.changes.length,
      highSeverityChanges: project.changes.filter((item) => item.severity === "high").length,
      topInsight: project.insights[0]?.title ?? "No insight available",
    })),
    comparisonInsights,
  };
}

export function getChangeSummary(id: string) {
  const project = getProject(id);
  if (!project) return undefined;
  return summarizeChangeEvents(project.changes);
}
