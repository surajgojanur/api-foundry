import type { ChangeEvent, ChangeSeverity, CompetitorProject, InsightCard } from "@/lib/types";

export function countChangesByType(changes: ChangeEvent[]): Record<string, number> {
  return changes.reduce<Record<string, number>>((acc, change) => {
    acc[change.type] = (acc[change.type] ?? 0) + 1;
    return acc;
  }, {});
}

export function countChangesBySeverity(changes: ChangeEvent[]): Record<ChangeSeverity, number> {
  return changes.reduce<Record<ChangeSeverity, number>>(
    (acc, change) => {
      acc[change.severity] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

export function getLatestHighSeverityChange(project: CompetitorProject): ChangeEvent | undefined {
  return project.changes.find((change) => change.severity === "high");
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreProjectAggressiveness(project: CompetitorProject): number {
  const byType = countChangesByType(project.changes);
  const bySeverity = countChangesBySeverity(project.changes);

  const raw =
    bySeverity.high * 10 +
    bySeverity.medium * 5 +
    bySeverity.low * 2 +
    (byType.price_changed ?? 0) * 8 +
    (byType.offer_added ?? 0) * 7 +
    (byType.availability_changed ?? 0) * 6 +
    (byType.announcement_added ?? 0) * 4 +
    project.selectedBlocks.length;

  return normalizeScore(raw * 0.9);
}

export function scoreProjectStability(project: CompetitorProject): number {
  const bySeverity = countChangesBySeverity(project.changes);
  const penalty = bySeverity.high * 12 + bySeverity.medium * 6 + bySeverity.low * 2;
  return normalizeScore(100 - penalty);
}

export function detectCompetitorStrategy(project: CompetitorProject): string {
  const byType = countChangesByType(project.changes);
  const total = project.changes.length;
  const offerSignals = (byType.offer_added ?? 0) + project.changes.filter((c) => (c.newValue ? String(c.newValue).toLowerCase() : "").includes("%")).length;
  const availabilitySignals = byType.availability_changed ?? 0;
  const catalogSignals = byType.item_added ?? 0;
  const deliveryAnnouncements = project.changes.filter((c) => c.type === "announcement_added" && /delivery|express|minutes|speed/i.test(`${c.title} ${c.explanation}`)).length;
  const brandSignals = (byType.announcement_added ?? 0) + (byType.content_changed ?? 0);

  if (offerSignals >= 3) return "Discount-led growth";
  if (availabilitySignals >= 3) return "Availability-led retention";
  if (catalogSignals >= 4) return "Catalog expansion";
  if (deliveryAnnouncements >= 1) return "Delivery-speed positioning";
  if (brandSignals >= 4) return "Brand/content push";
  if (total <= 2) return "Stable baseline";
  return "Mixed strategy";
}

function insightSeverity(project: CompetitorProject): ChangeSeverity {
  const sev = countChangesBySeverity(project.changes);
  if (sev.high > 0) return "high";
  if (sev.medium > 0) return "medium";
  return "low";
}

export function generateProjectInsights(project: CompetitorProject): InsightCard[] {
  const byType = countChangesByType(project.changes);
  const bySeverity = countChangesBySeverity(project.changes);
  const strategy = detectCompetitorStrategy(project);
  const aggressiveness = scoreProjectAggressiveness(project);
  const stability = scoreProjectStability(project);
  const latestHigh = getLatestHighSeverityChange(project);

  const insights: InsightCard[] = [
    {
      id: `${project.id}-ins-1`,
      title: "Competitive Movement",
      description: `${project.name} is showing ${strategy.toLowerCase()} behavior with ${project.changes.length} tracked changes.`,
      recommendation: "Use the changes endpoint to monitor shifts after each refresh cycle.",
      severity: insightSeverity(project),
      confidenceScore: Math.max(82, Math.min(97, aggressiveness)),
    },
    {
      id: `${project.id}-ins-2`,
      title: "Pricing / Offer Pressure",
      description: `${project.name} has ${(byType.offer_added ?? 0)} new offer signals and ${(byType.price_changed ?? 0)} pricing changes.`,
      recommendation: "Monitor price and offer feeds daily using the generated changes endpoint.",
      severity: (byType.offer_added ?? 0) + (byType.price_changed ?? 0) >= 3 ? "high" : "medium",
      confidenceScore: 90,
    },
    {
      id: `${project.id}-ins-3`,
      title: "Availability Risk",
      description: `${byType.availability_changed ?? 0} availability shifts were detected, including ${bySeverity.high} high-priority events.`,
      recommendation: "Track inventory-sensitive SKUs through feed and changes endpoints for retention risk.",
      severity: (byType.availability_changed ?? 0) >= 2 ? "high" : "medium",
      confidenceScore: 88,
    },
    {
      id: `${project.id}-ins-4`,
      title: "API Usefulness",
      description: `Selected blocks (${project.selectedBlocks.join(", ")}) provide reusable competitor intelligence for downstream teams.`,
      recommendation: `Integrate ${project.endpoint} and ${project.changesEndpoint} into BI or alert workflows.`,
      severity: "low",
      confidenceScore: 93,
    },
    {
      id: `${project.id}-ins-5`,
      title: "Monitoring Priority",
      description: `${project.name} aggressiveness score is ${aggressiveness}/100 with stability score ${stability}/100.`,
      recommendation: aggressiveness >= 70
        ? "Set high-priority monitoring with frequent refresh and change review."
        : "Maintain steady monitoring cadence and investigate new high-severity events.",
      severity: aggressiveness >= 70 ? "high" : aggressiveness >= 45 ? "medium" : "low",
      confidenceScore: 89,
    },
  ];

  if (latestHigh) {
    insights.push({
      id: `${project.id}-ins-6`,
      title: "Why This Matters Now",
      description: `Latest high-severity signal: ${latestHigh.title}.`,
      recommendation: "Prioritize this signal in planning and validate impact against your pricing/availability strategy.",
      severity: "high",
      confidenceScore: 91,
    });
  }

  return insights.slice(0, 6);
}

export function generateExecutiveSummary(project: CompetitorProject) {
  const strategy = detectCompetitorStrategy(project);
  const aggressivenessScore = scoreProjectAggressiveness(project);
  const stabilityScore = scoreProjectStability(project);
  const latestHigh = getLatestHighSeverityChange(project);

  const headline = latestHigh
    ? `${project.name}: ${latestHigh.title}`
    : `${project.name}: No major high-severity movement detected`;

  return {
    headline,
    summary: `${project.name} shows ${strategy.toLowerCase()} with ${project.changes.length} total changes and ${project.changes.filter((c) => c.severity === "high").length} high-severity signals.`,
    strategy,
    aggressivenessScore,
    stabilityScore,
    recommendedAction: aggressivenessScore >= 70
      ? "Prioritize daily refresh and immediate response to offer/price shifts."
      : "Continue regular monitoring and review any new high-severity events.",
    watchEndpoints: [project.endpoint, project.changesEndpoint, project.schemaEndpoint, `/api/v1/projects/${project.id}/refresh`],
  };
}

export function generateComparisonInsights(projects: CompetitorProject[]) {
  if (!projects.length) {
    return {
      mostAggressive: { projectId: "n/a", name: "n/a", score: 0, reason: "No projects available" },
      mostStable: { projectId: "n/a", name: "n/a", score: 0, reason: "No projects available" },
      monitoringPriority: [],
      marketNarrative: "No projects available for comparison.",
      recommendedActions: ["Create competitor projects to begin comparison."],
    };
  }

  const scored = projects.map((project) => ({
    project,
    aggressiveness: scoreProjectAggressiveness(project),
    stability: scoreProjectStability(project),
    strategy: detectCompetitorStrategy(project),
    highChanges: project.changes.filter((c) => c.severity === "high").length,
    topSignal: project.changes[0]?.title ?? "No recent signal",
  }));

  const mostAggressiveItem = [...scored].sort((a, b) => b.aggressiveness - a.aggressiveness)[0];
  const mostStableItem = [...scored].sort((a, b) => b.stability - a.stability)[0];
  const monitoringPriority = [...scored]
    .sort((a, b) => b.aggressiveness - a.aggressiveness)
    .map((item, idx) => ({
      projectId: item.project.id,
      name: item.project.name,
      priority: (idx === 0 ? "high" : idx === 1 ? "medium" : "low") as "high" | "medium" | "low",
      reason: `${item.project.name} shows ${item.highChanges} high-severity signals and ${item.strategy.toLowerCase()} behavior.`,
    }));

  const marketNarrative = `${mostAggressiveItem.project.name} is currently the most aggressive competitor based on recent offer and price-change activity, while ${mostStableItem.project.name} appears more stable. The recommended monitoring priority is ${monitoringPriority.map((m) => m.name).join(" then ")}.`;

  return {
    mostAggressive: {
      projectId: mostAggressiveItem.project.id,
      name: mostAggressiveItem.project.name,
      score: mostAggressiveItem.aggressiveness,
      reason: `Highest aggressiveness score with top signal: ${mostAggressiveItem.topSignal}`,
    },
    mostStable: {
      projectId: mostStableItem.project.id,
      name: mostStableItem.project.name,
      score: mostStableItem.stability,
      reason: `Highest stability score with fewer severe disruptions.`,
    },
    monitoringPriority,
    marketNarrative,
    recommendedActions: [
      `Track ${mostAggressiveItem.project.name} changes endpoint at highest frequency.`,
      `Use ${mostStableItem.project.name} as baseline comparator for signal drift.`,
      "Integrate feed + changes + insights endpoints into BI dashboards.",
    ],
  };
}

export function buildInsightApiResponse(project: CompetitorProject) {
  const executiveSummary = generateExecutiveSummary(project);
  const insights = generateProjectInsights(project);
  const severity = countChangesBySeverity(project.changes);

  return {
    projectId: project.id,
    projectName: project.name,
    generatedAt: new Date().toISOString(),
    executiveSummary,
    insights,
    sourceSignals: {
      changesAnalyzed: project.changes.length,
      highSeverityChanges: severity.high,
      selectedBlocks: project.selectedBlocks,
      latestChangeTitle: project.changes[0]?.title ?? "No recent change",
    },
    recommendedEndpoints: {
      feed: project.endpoint,
      changes: project.changesEndpoint,
      schema: project.schemaEndpoint,
      insights: `/api/v1/projects/${project.id}/insights`,
      refresh: `/api/v1/projects/${project.id}/refresh`,
    },
  };
}
