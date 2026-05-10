import type { ChangeEvent, ChangeSeverity, ChangeEventType, FeedItem, ProjectSnapshot } from "@/lib/types";

const severityOrder: Record<ChangeSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[₹$€£]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toMap(items: FeedItem[]) {
  const map = new Map<string, FeedItem>();
  for (const item of items) {
    map.set(normalizeEntityKey(item), item);
  }
  return map;
}

function makeChange(input: {
  projectId: string;
  type: ChangeEventType;
  title: string;
  entity: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
  severity: ChangeSeverity;
  sourceUrl: string;
  explanation: string;
}): ChangeEvent {
  return {
    id: `${input.projectId}-${input.type}-${Math.random().toString(36).slice(2, 10)}`,
    projectId: input.projectId,
    type: input.type,
    title: input.title,
    entity: input.entity,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    severity: input.severity,
    sourceUrl: input.sourceUrl,
    detectedAt: new Date().toISOString(),
    explanation: input.explanation,
  };
}

function textChanged(a?: string, b?: string) {
  return normalizeText(a ?? "") !== normalizeText(b ?? "");
}

function hasHighOfferLanguage(text: string) {
  const lower = text.toLowerCase();
  return lower.includes("mega") || lower.includes("flash") || lower.includes("limited") || lower.includes("20%") || lower.includes("25%") || lower.includes("30%");
}

function announcementImpactHigh(text: string) {
  const lower = text.toLowerCase();
  return ["new city", "launch", "price", "delivery", "shutdown", "expansion"].some((token) => lower.includes(token));
}

export function normalizeEntityKey(item: FeedItem): string {
  const raw = item.name || item.title || item.id;
  return `${item.blockType}:${normalizeText(raw)}`;
}

export function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₹$€,\s]/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function calculatePriceChangePercentage(oldPrice: number, newPrice: number): number {
  if (!oldPrice) return oldPrice === newPrice ? 0 : 100;
  return Math.abs(((newPrice - oldPrice) / oldPrice) * 100);
}

export function detectProductChanges(previousItems: FeedItem[], currentItems: FeedItem[], projectId: string): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  const prevMap = toMap(previousItems);
  const currentMap = toMap(currentItems);

  for (const [key, current] of currentMap.entries()) {
    const previous = prevMap.get(key);
    if (!previous) {
      changes.push(
        makeChange({
          projectId,
          type: "item_added",
          title: `${current.name ?? current.title} added`,
          entity: current.name ?? current.title,
          oldValue: null,
          newValue: current.price ?? current.availability ?? current.title,
          severity: "medium",
          sourceUrl: current.sourceUrl,
          explanation: "New product appeared in latest snapshot.",
        }),
      );
      continue;
    }

    const oldPrice = numberValue(previous.price ?? previous.oldPrice);
    const newPrice = numberValue(current.price ?? current.oldPrice);
    if (oldPrice !== null && newPrice !== null && oldPrice !== newPrice) {
      const pct = calculatePriceChangePercentage(oldPrice, newPrice);
      changes.push(
        makeChange({
          projectId,
          type: "price_changed",
          title: `${current.name ?? current.title} price changed`,
          entity: current.name ?? current.title,
          oldValue: oldPrice,
          newValue: newPrice,
          severity: pct >= 10 ? "high" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: `Price moved by ${pct.toFixed(1)}% between snapshots.`,
        }),
      );
    }

    const prevAvailability = normalizeText(previous.availability ?? "");
    const curAvailability = normalizeText(current.availability ?? "");
    if (prevAvailability && curAvailability && prevAvailability !== curAvailability) {
      const turnedUnavailable = ["out_of_stock", "unavailable"].includes(curAvailability);
      const backAvailable = ["out_of_stock", "unavailable"].includes(prevAvailability) && ["in_stock", "available"].includes(curAvailability);
      changes.push(
        makeChange({
          projectId,
          type: "availability_changed",
          title: `${current.name ?? current.title} availability changed`,
          entity: current.name ?? current.title,
          oldValue: previous.availability ?? null,
          newValue: current.availability ?? null,
          severity: turnedUnavailable ? "high" : backAvailable ? "medium" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: "Availability state changed for an existing product.",
        }),
      );
    }
  }

  for (const [key, previous] of prevMap.entries()) {
    if (!currentMap.has(key)) {
      const sev: ChangeSeverity = normalizeText(previous.availability ?? "") === "out_of_stock" ? "low" : "medium";
      changes.push(
        makeChange({
          projectId,
          type: "item_removed",
          title: `${previous.name ?? previous.title} removed`,
          entity: previous.name ?? previous.title,
          oldValue: previous.price ?? previous.availability ?? previous.title,
          newValue: null,
          severity: sev,
          sourceUrl: previous.sourceUrl,
          explanation: "Previously tracked product no longer appears in current snapshot.",
        }),
      );
    }
  }

  return changes;
}

export function detectOfferChanges(previousItems: FeedItem[], currentItems: FeedItem[], projectId: string): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  const prevMap = toMap(previousItems);
  const currentMap = toMap(currentItems);

  for (const [key, current] of currentMap.entries()) {
    const previous = prevMap.get(key);
    if (!previous) {
      const source = `${current.title} ${current.description ?? ""} ${current.discount ?? ""}`;
      changes.push(
        makeChange({
          projectId,
          type: "offer_added",
          title: `${current.title} offer added`,
          entity: current.title,
          oldValue: null,
          newValue: current.discount ?? current.description ?? current.title,
          severity: hasHighOfferLanguage(source) ? "high" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: "New offer detected in current snapshot.",
        }),
      );
      continue;
    }

    const descriptionChanged = textChanged(previous.description, current.description);
    const discountChanged = textChanged(previous.discount, current.discount);
    if (descriptionChanged || discountChanged) {
      changes.push(
        makeChange({
          projectId,
          type: "content_changed",
          title: `${current.title} offer content updated`,
          entity: current.title,
          oldValue: previous.discount ?? previous.description ?? null,
          newValue: current.discount ?? current.description ?? null,
          severity: "low",
          sourceUrl: current.sourceUrl,
          explanation: "Offer text or discount details changed.",
        }),
      );
    }
  }

  for (const [key, previous] of prevMap.entries()) {
    if (!currentMap.has(key)) {
      changes.push(
        makeChange({
          projectId,
          type: "item_removed",
          title: `${previous.title} offer removed`,
          entity: previous.title,
          oldValue: previous.discount ?? previous.description ?? previous.title,
          newValue: null,
          severity: "low",
          sourceUrl: previous.sourceUrl,
          explanation: "Offer from previous snapshot is no longer present.",
        }),
      );
    }
  }

  return changes;
}

export function detectAnnouncementChanges(previousItems: FeedItem[], currentItems: FeedItem[], projectId: string): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  const prevMap = toMap(previousItems);
  const currentMap = toMap(currentItems);

  for (const [key, current] of currentMap.entries()) {
    const previous = prevMap.get(key);
    if (!previous) {
      const signal = `${current.title} ${current.description ?? ""}`;
      changes.push(
        makeChange({
          projectId,
          type: "announcement_added",
          title: `${current.title} announcement added`,
          entity: current.title,
          oldValue: null,
          newValue: current.description ?? current.title,
          severity: announcementImpactHigh(signal) ? "high" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: "New announcement detected in current snapshot.",
        }),
      );
      continue;
    }

    if (textChanged(previous.description, current.description) || textChanged(previous.title, current.title)) {
      const signal = `${current.title} ${current.description ?? ""}`;
      changes.push(
        makeChange({
          projectId,
          type: "content_changed",
          title: `${current.title} announcement updated`,
          entity: current.title,
          oldValue: previous.description ?? previous.title,
          newValue: current.description ?? current.title,
          severity: announcementImpactHigh(signal) ? "high" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: "Announcement content changed between snapshots.",
        }),
      );
    }
  }

  return changes;
}

export function detectAvailabilityChanges(previousItems: FeedItem[], currentItems: FeedItem[], projectId: string): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  const prevMap = toMap(previousItems);
  const currentMap = toMap(currentItems);

  for (const [key, current] of currentMap.entries()) {
    const previous = prevMap.get(key);
    if (!previous) {
      changes.push(
        makeChange({
          projectId,
          type: "item_added",
          title: `${current.title} availability signal added`,
          entity: current.title,
          oldValue: null,
          newValue: current.availability ?? "in_stock",
          severity: "medium",
          sourceUrl: current.sourceUrl,
          explanation: "New availability signal observed in current snapshot.",
        }),
      );
      continue;
    }

    const prevAvailability = normalizeText(previous.availability ?? "");
    const curAvailability = normalizeText(current.availability ?? "");
    if (prevAvailability !== curAvailability) {
      const high = ["out_of_stock", "unavailable"].includes(curAvailability);
      changes.push(
        makeChange({
          projectId,
          type: "availability_changed",
          title: `${current.title} availability changed`,
          entity: current.title,
          oldValue: previous.availability ?? null,
          newValue: current.availability ?? null,
          severity: high ? "high" : "medium",
          sourceUrl: current.sourceUrl,
          explanation: "Availability state changed between snapshots.",
        }),
      );
    }
  }

  return changes;
}

function detectGenericBlockChanges(previousItems: FeedItem[], currentItems: FeedItem[], projectId: string): ChangeEvent[] {
  const changes: ChangeEvent[] = [];
  const prevMap = toMap(previousItems);
  const currentMap = toMap(currentItems);

  for (const [key, item] of currentMap.entries()) {
    if (!prevMap.has(key)) {
      changes.push(
        makeChange({
          projectId,
          type: "item_added",
          title: `${item.title} added`,
          entity: item.title,
          oldValue: null,
          newValue: item.title,
          severity: "low",
          sourceUrl: item.sourceUrl,
          explanation: "New entity detected in current snapshot.",
        }),
      );
    }
  }

  for (const [key, item] of prevMap.entries()) {
    if (!currentMap.has(key)) {
      changes.push(
        makeChange({
          projectId,
          type: "item_removed",
          title: `${item.title} removed`,
          entity: item.title,
          oldValue: item.title,
          newValue: null,
          severity: "low",
          sourceUrl: item.sourceUrl,
          explanation: "Entity missing from current snapshot.",
        }),
      );
    }
  }

  return changes;
}

export function detectChanges(previousSnapshot: ProjectSnapshot | undefined, currentSnapshot: ProjectSnapshot, projectId: string): ChangeEvent[] {
  if (!previousSnapshot) return [];

  const blocks: FeedItem["blockType"][] = [
    "products",
    "prices",
    "offers",
    "availability",
    "announcements",
    "blog",
    "jobs",
    "locations",
  ];

  const changes: ChangeEvent[] = [];

  for (const block of blocks) {
    const previousItems = previousSnapshot.data[block] ?? [];
    const currentItems = currentSnapshot.data[block] ?? [];

    if (!previousItems.length && !currentItems.length) continue;

    if (block === "products" || block === "prices") {
      changes.push(...detectProductChanges(previousItems, currentItems, projectId));
    } else if (block === "offers") {
      changes.push(...detectOfferChanges(previousItems, currentItems, projectId));
    } else if (block === "announcements") {
      changes.push(...detectAnnouncementChanges(previousItems, currentItems, projectId));
    } else if (block === "availability") {
      changes.push(...detectAvailabilityChanges(previousItems, currentItems, projectId));
    } else {
      changes.push(...detectGenericBlockChanges(previousItems, currentItems, projectId));
    }
  }

  return changes
    .sort((a, b) => {
      const sev = severityOrder[a.severity] - severityOrder[b.severity];
      if (sev !== 0) return sev;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    })
    .slice(0, 50);
}

export function summarizeChangeEvents(changes: ChangeEvent[]) {
  const total = changes.length;
  const high = changes.filter((item) => item.severity === "high").length;
  const medium = changes.filter((item) => item.severity === "medium").length;
  const low = changes.filter((item) => item.severity === "low").length;

  const byType = changes.reduce<Record<string, number>>((acc, change) => {
    acc[change.type] = (acc[change.type] ?? 0) + 1;
    return acc;
  }, {});

  let headline = "No major changes detected";
  if (high > 0) {
    headline = `${high} high-priority competitor changes detected`;
  } else if (total > 0) {
    const offerAndPrice = (byType.offer_added ?? 0) + (byType.price_changed ?? 0);
    if (offerAndPrice > 0) {
      headline = `${offerAndPrice} new offers and price changes detected`;
    } else {
      headline = `${total} competitor changes detected`;
    }
  }

  return { total, high, medium, low, byType, headline };
}
