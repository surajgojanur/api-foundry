export type DataBlockType =
  | "products"
  | "prices"
  | "offers"
  | "availability"
  | "announcements"
  | "jobs"
  | "blog"
  | "locations";

export type ProjectStatus = "active" | "scanning" | "paused" | "error";

export type ChangeSeverity = "low" | "medium" | "high";

export type ChangeEventType =
  | "price_changed"
  | "offer_added"
  | "availability_changed"
  | "item_added"
  | "item_removed"
  | "announcement_added"
  | "content_changed";

export type AlertSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AlertChannel = "telegram";

export type AlertRule = {
  id: string;
  projectId: string;
  name: string;
  enabled: boolean;
  channel: AlertChannel;
  minSeverity: AlertSeverity;
  eventTypes: ChangeEventType[];
  createdAt: string;
};

export type AlertDelivery = {
  id: string;
  projectId: string;
  channel: AlertChannel;
  severity: AlertSeverity;
  title: string;
  message: string;
  sentAt: string;
  ok: boolean;
  error?: string;
};

export type FeedItem = {
  id: string;
  blockType: DataBlockType;
  title: string;
  description?: string;
  name?: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
  oldPrice?: number;
  discount?: string;
  availability?: string;
  rating?: number;
  location?: string;
  sourceUrl: string;
  extractedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ProjectSnapshot = {
  id: string;
  projectId: string;
  capturedAt: string;
  sourceUrls: string[];
  data: Partial<Record<DataBlockType, FeedItem[]>>;
};

export type ChangeEvent = {
  id: string;
  projectId: string;
  type: ChangeEventType;
  title: string;
  entity: string;
  oldValue?: string | number | boolean | null;
  newValue?: string | number | boolean | null;
  severity: ChangeSeverity;
  sourceUrl: string;
  detectedAt: string;
  explanation: string;
};

export type ApiFieldDefinition = {
  type: "string" | "number" | "boolean" | "datetime" | "array" | "object";
  description: string;
  example?: string | number | boolean | null;
};

export type ApiContract = {
  endpoint: string;
  method: "GET";
  description: string;
  schema: Record<string, ApiFieldDefinition | Record<string, ApiFieldDefinition>>;
  exampleResponse: unknown;
};

export type InsightCard = {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  severity: ChangeSeverity;
  confidenceScore: number;
};

export type CompetitorProject = {
  id: string;
  name: string;
  companyUrl: string;
  useCase: string;
  country: string;
  status: ProjectStatus;
  selectedBlocks: DataBlockType[];
  discoveredUrls: string[];
  endpoint: string;
  schemaEndpoint: string;
  changesEndpoint: string;
  currentSnapshot: ProjectSnapshot;
  previousSnapshot?: ProjectSnapshot;
  changes: ChangeEvent[];
  insights: InsightCard[];
  lastUpdated: string;
  createdAt: string;
  trackingMode?: "live" | "fallback" | "mixed";
  liveSource?: "anakin" | "demo-fallback";
  lastLiveCheckAt?: string;
  liveUrlsFound?: number;
  selectedLiveUrlsCount?: number;
  extractionQuality?: "strong" | "medium" | "weak" | "fallback";
  trackingNotes?: string[];
  alertRules?: AlertRule[];
  alertDeliveries?: AlertDelivery[];
  telegramAlertsEnabled?: boolean;
};

export type CreateProjectInput = {
  projectId?: string;
  name: string;
  companyUrl: string;
  useCase: string;
  country?: string;
  selectedBlocks?: DataBlockType[];
};
