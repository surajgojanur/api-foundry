import "server-only";

import { detectChanges } from "@/lib/change-detection";
import { generateProjectInsights } from "@/lib/insights";
import { createProject, getProject, refreshProjectWithSnapshot, setProjectError, updateProject, upsertProject } from "@/lib/project-store";
import type { CompetitorProject, CreateProjectInput, DataBlockType, FeedItem, ProjectSnapshot } from "@/lib/types";

export const ANAKIN_BASE_URL = "https://api.anakin.io/v1";

export type AnakinJobStatus = "pending" | "processing" | "completed" | "failed" | string;
export type AnakinDiscoveredUrl = { url: string; score?: number; source?: string };

export type AnakinMapResult = {
  status?: AnakinJobStatus;
  urls?: unknown;
  links?: unknown;
  results?: unknown;
  data?: { urls?: unknown; links?: unknown };
  result?: { urls?: unknown; links?: unknown };
  [key: string]: unknown;
};

export type AnakinScrapeResult = {
  status?: AnakinJobStatus;
  results?: unknown;
  pages?: unknown;
  data?: unknown;
  scraped?: unknown;
  output?: unknown;
  result?: unknown;
  [key: string]: unknown;
};

export type NormalizedScrapedPage = {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  text?: string;
  generatedJson?: unknown;
  raw: unknown;
};

let lastLiveCallSucceeded = false;
export function didLastAnakinCallSucceed() { return lastLiveCallSucceeded; }

export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function getAnakinApiKey(): string | null {
  const raw = process.env.ANAKIN_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
  return trimmed.length ? trimmed : null;
}

export function isAnakinConfigured(): boolean { return Boolean(getAnakinApiKey()); }

export async function validateAnakinCredentials(): Promise<{
  configured: boolean;
  valid: boolean;
  mode: "live" | "fallback";
  baseUrl: string;
  maskedKey: string | null;
  checkedAt: string;
  statusCode?: number;
  message: string;
  details?: unknown;
}> {
  const key = getAnakinApiKey();
  const checkedAt = new Date().toISOString();

  if (!key) {
    return {
      configured: false,
      valid: false,
      mode: "fallback",
      baseUrl: ANAKIN_BASE_URL,
      maskedKey: null,
      checkedAt,
      message: "ANAKIN_API_KEY is missing",
    };
  }

  const controller = new AbortController();
  const timeoutMs = 15_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ANAKIN_BASE_URL}/map`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com",
        includeSubdomains: false,
        limit: 1,
        useBrowser: false,
      }),
      cache: "no-store",
    });

    if (response.ok) {
      return {
        configured: true,
        valid: true,
        mode: "live",
        baseUrl: ANAKIN_BASE_URL,
        maskedKey: maskApiKey(key),
        checkedAt,
        statusCode: response.status,
        message: "Anakin API key is valid",
      };
    }

    if (response.status === 401 || response.status === 403) {
      const payload = await response.json().catch(() => null);
      return {
        configured: true,
        valid: false,
        mode: "fallback",
        baseUrl: ANAKIN_BASE_URL,
        maskedKey: maskApiKey(key),
        checkedAt,
        statusCode: response.status,
        message: "Invalid or inactive Anakin API key",
        details: process.env.NODE_ENV === "development" ? payload : undefined,
      };
    }

    const payload = await response.json().catch(() => null);
    return {
      configured: true,
      valid: false,
      mode: "fallback",
      baseUrl: ANAKIN_BASE_URL,
      maskedKey: maskApiKey(key),
      checkedAt,
      statusCode: response.status,
      message: "Anakin validation failed",
      details: process.env.NODE_ENV === "development" ? payload : undefined,
    };
  } catch (error) {
    const isTimeout = (error as Error).name === "AbortError";
    return {
      configured: true,
      valid: false,
      mode: "fallback",
      baseUrl: ANAKIN_BASE_URL,
      maskedKey: maskApiKey(key),
      checkedAt,
      message: isTimeout ? "Anakin validation timed out" : "Anakin validation failed",
      details: process.env.NODE_ENV === "development" ? { reason: (error as Error).message } : undefined,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAnakinHealth(options?: { validate?: boolean }): Promise<object> {
  if (options?.validate) {
    return validateAnakinCredentials();
  }
  const key = getAnakinApiKey();
  const configured = Boolean(key);
  return {
    configured,
    baseUrl: ANAKIN_BASE_URL,
    mode: configured ? "live" : "fallback",
    maskedKey: maskApiKey(key),
    checkedAt: new Date().toISOString(),
    message: configured
      ? "ANAKIN_API_KEY is configured. Use ?validate=true to verify key acceptance."
      : "ANAKIN_API_KEY is missing",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function looksLikeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toUrlList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((entry) => {
    if (typeof entry === "string") return entry;
    if (typeof entry === "object" && entry !== null) {
      const record = entry as Record<string, unknown>;
      if (typeof record.url === "string") return record.url;
      if (typeof record.link === "string") return record.link;
      if (typeof record.href === "string") return record.href;
    }
    return null;
  }).filter((value): value is string => Boolean(value));
}

function detectStatus(payload: unknown): AnakinJobStatus {
  const record = asRecord(payload);
  const status = record.status ?? record.state ?? asRecord(record.data).status;
  return typeof status === "string" ? status : "processing";
}

function findArrayDeep(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of ["results", "pages", "data", "scraped", "output", "result"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (typeof value === "object" && value !== null) {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of ["results", "pages", "items", "data"]) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
      }
    }
  }
  return [];
}

export async function anakinFetch(path: string, options?: RequestInit & { timeoutMs?: number }): Promise<unknown> {
  const key = getAnakinApiKey();
  if (!key) throw new Error("Missing ANAKIN_API_KEY. Configure it in .env.local for live mode.");

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ANAKIN_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
        ...(options?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Anakin request failed (${response.status}) for ${path}${text ? `: ${text.slice(0, 200)}` : ""}`);
    }

    try {
      return await response.json();
    } catch {
      throw new Error(`Anakin returned invalid JSON for ${path}`);
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") throw new Error(`Anakin request timed out after ${timeoutMs}ms for ${path}`);
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function sleep(ms: number): Promise<void> { await new Promise((resolve) => setTimeout(resolve, ms)); }

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => T | Promise<T>,
): Promise<T> {
  let timedOut = false;
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(async () => {
      timedOut = true;
      resolve(await fallback());
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timedOut && process.env.NODE_ENV === "development") {
    console.warn(`[anakin] withTimeout fallback after ${timeoutMs}ms`);
  }
  return result;
}

export function extractJobId(response: unknown): string | null {
  const record = asRecord(response);
  const candidates = [record.jobId, record.job_id, record.id, asRecord(record.data).jobId, asRecord(record.data).id];
  for (const candidate of candidates) if (typeof candidate === "string" && candidate.trim()) return candidate;
  return null;
}

export async function pollAnakinJob(
  pathPrefix: "/map" | "/url-scraper",
  jobId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<unknown> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 2500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await anakinFetch(`${pathPrefix}/${jobId}`);
    const status = detectStatus(job).toLowerCase();

    if (status === "completed") {
      lastLiveCallSucceeded = true;
      return job;
    }
    if (status === "failed") throw new Error(`Anakin job ${jobId} failed for ${pathPrefix}`);
    await sleep(intervalMs);
  }

  throw new Error(`Anakin job ${jobId} timed out for ${pathPrefix}`);
}

export async function discoverUrlsWithAnakin(input: { companyUrl: string; limit?: number; useBrowser?: boolean }): Promise<string[]> {
  const limit = input.limit ?? 100;
  const started = await anakinFetch("/map", {
    method: "POST",
    body: JSON.stringify({ url: input.companyUrl, includeSubdomains: false, limit, search: "", useBrowser: Boolean(input.useBrowser) }),
  });

  const jobId = extractJobId(started);
  if (!jobId) throw new Error("Anakin map response did not include a job id");

  const mapResult = (await pollAnakinJob("/map", jobId)) as AnakinMapResult;
  const record = asRecord(mapResult);
  const candidates = [record.urls, record.links, record.results, asRecord(record.data).urls, asRecord(record.data).links, asRecord(record.result).urls];
  const allUrls = candidates.flatMap((candidate) => toUrlList(candidate));

  return Array.from(new Set(allUrls.filter(looksLikeUrl))).slice(0, limit);
}

export async function discoverUrlsWithAnakinFast(input: {
  companyUrl: string;
  limit?: number;
  timeoutMs?: number;
}): Promise<{ ok: boolean; urls: string[]; reason?: string }> {
  const timeoutMs = input.timeoutMs ?? 8_000;
  const limit = input.limit ?? 20;
  const pollMaxAttempts = 3;
  const pollIntervalMs = 1_000;

  try {
    const started = await anakinFetch("/map", {
      method: "POST",
      timeoutMs: Math.min(4_000, timeoutMs),
      body: JSON.stringify({
        url: input.companyUrl,
        includeSubdomains: false,
        limit,
        search: "",
        useBrowser: false,
      }),
    });

    const jobId = extractJobId(started);
    if (!jobId) return { ok: false, urls: [], reason: "Fast discovery did not return a job id" };

    let remainingBudget = Math.max(1_500, timeoutMs - 4_000);
    for (let attempt = 0; attempt < pollMaxAttempts; attempt += 1) {
      const pollTimeout = Math.max(1_000, Math.min(1_500, remainingBudget));
      const job = await anakinFetch(`/map/${jobId}`, { timeoutMs: pollTimeout });
      const status = detectStatus(job).toLowerCase();

      if (status === "completed") {
        lastLiveCallSucceeded = true;
        const record = asRecord(job as AnakinMapResult);
        const candidates = [
          record.urls,
          record.links,
          record.results,
          asRecord(record.data).urls,
          asRecord(record.data).links,
          asRecord(record.result).urls,
        ];
        const urls = Array.from(new Set(candidates.flatMap((candidate) => toUrlList(candidate)).filter(looksLikeUrl))).slice(0, limit);
        return urls.length
          ? { ok: true, urls }
          : { ok: false, urls: [], reason: "Fast discovery completed but no URLs found" };
      }

      if (status === "failed") return { ok: false, urls: [], reason: "Fast discovery job failed" };
      remainingBudget -= pollTimeout;
      if (remainingBudget <= 0) return { ok: false, urls: [], reason: "Fast discovery timed out" };
      await sleep(pollIntervalMs);
      remainingBudget -= pollIntervalMs;
      if (remainingBudget <= 0) return { ok: false, urls: [], reason: "Fast discovery timed out" };
    }

    return { ok: false, urls: [], reason: "Fast discovery timed out" };
  } catch (error) {
    return {
      ok: false,
      urls: [],
      reason: `Fast discovery failed: ${(error as Error).message}`,
    };
  }
}

export function fallbackDiscoverUrls(companyUrl: string): string[] {
  const paths = ["", "/products", "/collections", "/categories", "/offers", "/deals", "/pricing", "/blog", "/news", "/careers", "/locations", "/stores", "/about", "/faq"];
  let base: URL;
  try { base = new URL(companyUrl); } catch { base = new URL(`https://${companyUrl}`); }
  return paths.map((path) => new URL(path, `${base.origin}/`).toString()).filter(looksLikeUrl);
}

export function scoreCompetitorUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  const boosts = ["product", "products", "collection", "collections", "category", "categories", "offer", "offers", "deal", "deals", "price", "pricing", "store", "stores", "location", "locations", "blog", "news", "announcement", "careers", "jobs", "faq"];
  const penalties = ["login", "signup", "cart", "checkout", "account", "privacy", "terms", "facebook", "instagram", "twitter", "linkedin"];
  for (const token of boosts) if (lower.includes(token)) score += 8;
  for (const token of penalties) if (lower.includes(token)) score -= 12;
  if (lower.split("/").filter(Boolean).length <= 2) score += 4;
  return score;
}

export function selectUsefulUrls(urls: string[], maxUrls = 8): string[] {
  const unique = Array.from(new Set(urls.filter(looksLikeUrl)));
  if (!unique.length) return [];

  const root = unique.find((url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === "/" || parsed.pathname === "";
    } catch {
      return false;
    }
  });

  const sorted = unique.sort((a, b) => scoreCompetitorUrl(b) - scoreCompetitorUrl(a));
  return Array.from(new Set(root ? [root, ...sorted.filter((url) => url !== root)] : sorted)).slice(0, maxUrls);
}

function normalizeScrapeEntry(entry: unknown): NormalizedScrapedPage | null {
  const record = asRecord(entry);
  const url = [record.url, record.sourceUrl, record.link, record.href].find((value) => typeof value === "string") as string | undefined;
  if (!url || !looksLikeUrl(url)) return null;

  return {
    url,
    title: typeof record.title === "string" ? record.title : typeof asRecord(record.data).title === "string" ? (asRecord(record.data).title as string) : undefined,
    markdown: typeof record.markdown === "string" ? record.markdown : typeof asRecord(record.data).markdown === "string" ? (asRecord(record.data).markdown as string) : undefined,
    html: typeof record.html === "string" ? record.html : typeof asRecord(record.data).html === "string" ? (asRecord(record.data).html as string) : undefined,
    text: typeof record.text === "string" ? record.text : typeof asRecord(record.data).text === "string" ? (asRecord(record.data).text as string) : undefined,
    generatedJson: record.generatedJson ?? record.json ?? asRecord(record.output).json ?? asRecord(record.data).json,
    raw: entry,
  };
}

function isWeakPage(page: NormalizedScrapedPage) {
  const content = [page.title, page.markdown, page.text, page.html].filter(Boolean).join(" ").trim();
  return content.length < 60;
}

async function scrapeSingleUrl(url: string, country: string, useBrowser: boolean, generateJson: boolean): Promise<NormalizedScrapedPage | null> {
  const started = await anakinFetch("/url-scraper", { method: "POST", body: JSON.stringify({ url, country, useBrowser, generateJson }) });
  const jobId = extractJobId(started);
  if (!jobId) return null;
  const done = await pollAnakinJob("/url-scraper", jobId);
  const array = findArrayDeep(done);
  return normalizeScrapeEntry(array.length ? array[0] : done);
}

export async function scrapeUrlsWithAnakin(input: { urls: string[]; country?: string; useBrowser?: boolean; generateJson?: boolean }): Promise<NormalizedScrapedPage[]> {
  const urls = input.urls.slice(0, 10).filter(looksLikeUrl);
  if (!urls.length) return [];

  const country = input.country ?? "in";
  const useBrowser = Boolean(input.useBrowser);
  const generateJson = input.generateJson ?? true;

  try {
    const started = await anakinFetch("/url-scraper/batch", {
      method: "POST",
      body: JSON.stringify({ urls, country, useBrowser, generateJson }),
    });
    const jobId = extractJobId(started);
    if (!jobId) throw new Error("Anakin batch scraper response did not include a job id");

    const done = (await pollAnakinJob("/url-scraper", jobId)) as AnakinScrapeResult;
    const pages = findArrayDeep(done).map(normalizeScrapeEntry).filter((page): page is NormalizedScrapedPage => Boolean(page));
    if (pages.length) return pages;
    throw new Error("Anakin batch scraping returned no normalized pages");
  } catch {
    const fallbackPages: NormalizedScrapedPage[] = [];
    for (const url of urls.slice(0, 3)) {
      try {
        const page = await scrapeSingleUrl(url, country, useBrowser, generateJson);
        if (page) fallbackPages.push(page);
      } catch {
        // ignore per-url failures
      }
    }
    return fallbackPages;
  }
}

export function fallbackScrape(companyUrl: string, projectName?: string): NormalizedScrapedPage[] {
  const name = projectName || "Competitor";
  const pages = fallbackDiscoverUrls(companyUrl).slice(0, 5);

  return pages.map((url, index) => ({
    url,
    title: `${name} ${index === 0 ? "Homepage" : "Category"}`,
    markdown:
      `Products: Apple 1kg Rs99, Banana 1kg Rs52, Toned Milk 1L Rs65, Whole Wheat Bread Rs39, Basmati Rice 5kg Rs529, Cooking Oil 1L Rs149. ` +
      `Offers: Weekend sale 25% off, grocery discount, free delivery above Rs149. ` +
      `Availability: Milk out_of_stock in selected zones, bread in_stock, oil limited_stock. ` +
      `Announcements: new delivery location rollout and campaign launch.`,
    text: "Product updates and promotional activity detected across grocery categories with availability movements.",
    generatedJson: {
      products: [
        { name: "Apple 1kg", price: 99, currency: "INR", availability: "in_stock", category: "fruits" },
        { name: "Toned Milk 1L", price: 65, currency: "INR", availability: "out_of_stock", category: "dairy" },
      ],
      offers: [{ title: "Weekend Sale", description: "Flat 25% off on selected groceries", discount: "25%" }],
      availability: [{ title: "Cooking Oil 1L", availability: "limited_stock" }],
      announcements: [{ title: "New Delivery Zone", description: "Expanded service in a high-demand location" }],
    },
    raw: { fallback: true },
  }));
}

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

function extractPrice(text: string): number | undefined {
  const match = text.match(/(?:rs\.?|₹)\s*(\d{2,5})/i);
  return match ? Number(match[1]) : undefined;
}

function extractDiscount(text: string): string | undefined {
  const match = text.match(/(\d{1,2}%)/);
  return match ? match[1] : undefined;
}

function makeFeedItem(partial: Partial<FeedItem>, blockType: DataBlockType, sourceUrl: string): FeedItem {
  return {
    id: partial.id ?? `${blockType}-${Math.random().toString(36).slice(2, 10)}`,
    blockType,
    title: partial.title ?? partial.name ?? `${blockType} item`,
    sourceUrl,
    extractedAt: new Date().toISOString(),
    ...partial,
  };
}

function pullText(page: NormalizedScrapedPage) {
  return [page.title, page.markdown, page.text].filter((v): v is string => Boolean(v)).join("\n").toLowerCase();
}

function inferItemsFromPage(page: NormalizedScrapedPage, selectedBlocks: DataBlockType[]): Partial<Record<DataBlockType, FeedItem[]>> {
  const result: Partial<Record<DataBlockType, FeedItem[]>> = {};
  const text = pullText(page);
  const sourceUrl = page.url;
  const generated = asRecord(page.generatedJson);

  if (selectedBlocks.includes("products")) {
    const products = Array.isArray(generated.products) ? generated.products : [];
    const mapped = products.map((item, idx) => {
      const data = asRecord(item);
      return makeFeedItem({
        id: `prod-${idx}-${slugify(String(data.name ?? data.title ?? "product"))}`,
        title: String(data.title ?? data.name ?? "Product"),
        name: typeof data.name === "string" ? data.name : undefined,
        price: typeof data.price === "number" ? data.price : extractPrice(text),
        currency: typeof data.currency === "string" ? data.currency : "INR",
        availability: typeof data.availability === "string" ? data.availability : text.includes("out_of_stock") ? "out_of_stock" : "in_stock",
        category: typeof data.category === "string" ? data.category : undefined,
      }, "products", sourceUrl);
    });
    if (mapped.length) result.products = mapped;
  }

  if (selectedBlocks.includes("offers")) {
    const offers = Array.isArray(generated.offers) ? generated.offers : [];
    const mapped = offers.map((item, idx) => {
      const data = asRecord(item);
      return makeFeedItem({
        id: `off-${idx}-${slugify(String(data.title ?? "offer"))}`,
        title: String(data.title ?? page.title ?? "Offer detected"),
        description: typeof data.description === "string" ? data.description : undefined,
        discount: typeof data.discount === "string" ? data.discount : extractDiscount(text),
      }, "offers", sourceUrl);
    });
    if (mapped.length) result.offers = mapped;
  }

  if (selectedBlocks.includes("availability")) {
    const availability = Array.isArray(generated.availability) ? generated.availability : [];
    const mapped = availability.map((item, idx) => {
      const data = asRecord(item);
      return makeFeedItem({
        id: `av-${idx}-${slugify(String(data.title ?? data.name ?? "availability"))}`,
        title: String(data.title ?? data.name ?? page.title ?? "Availability item"),
        availability: typeof data.availability === "string" ? data.availability : text.includes("out_of_stock") ? "out_of_stock" : text.includes("limited_stock") ? "limited_stock" : "in_stock",
        location: typeof data.location === "string" ? data.location : undefined,
      }, "availability", sourceUrl);
    });
    if (mapped.length) result.availability = mapped;
  }

  if (selectedBlocks.includes("announcements")) {
    const announcements = Array.isArray(generated.announcements) ? generated.announcements : [];
    const mapped = announcements.map((item, idx) => {
      const data = asRecord(item);
      return makeFeedItem({
        id: `ann-${idx}-${slugify(String(data.title ?? "announcement"))}`,
        title: String(data.title ?? page.title ?? "Announcement detected"),
        description: typeof data.description === "string" ? data.description : undefined,
      }, "announcements", sourceUrl);
    });
    if (mapped.length) result.announcements = mapped;
  }

  return result;
}

function addFallbackItems(data: Partial<Record<DataBlockType, FeedItem[]>>, pages: NormalizedScrapedPage[], selectedBlocks: DataBlockType[]) {
  const sourceUrl = pages[0]?.url ?? "https://example.com";
  if (selectedBlocks.includes("products") && (!data.products || !data.products.length)) {
    data.products = [
      makeFeedItem({ title: "Apple 1kg", name: "Apple 1kg", price: 99, currency: "INR", availability: "in_stock", category: "fruits" }, "products", sourceUrl),
      makeFeedItem({ title: "Toned Milk 1L", name: "Toned Milk 1L", price: 65, currency: "INR", availability: "out_of_stock", category: "dairy" }, "products", sourceUrl),
    ];
  }
  if (selectedBlocks.includes("offers") && (!data.offers || !data.offers.length)) {
    data.offers = [makeFeedItem({ title: "Weekend Grocery Discount", description: "Flat 20% off on essentials", discount: "20%" }, "offers", sourceUrl)];
  }
  if (selectedBlocks.includes("availability") && (!data.availability || !data.availability.length)) {
    data.availability = [makeFeedItem({ title: "Core SKU availability", availability: "limited_stock", location: sourceUrl }, "availability", sourceUrl)];
  }
  if (selectedBlocks.includes("announcements") && (!data.announcements || !data.announcements.length)) {
    data.announcements = [makeFeedItem({ title: "New campaign detected", description: "New promotional messaging found during extraction." }, "announcements", sourceUrl)];
  }
}

export function normalizeScrapedPagesToSnapshot(input: { projectId: string; pages: NormalizedScrapedPage[]; selectedBlocks: DataBlockType[] }): ProjectSnapshot {
  const aggregated: Partial<Record<DataBlockType, FeedItem[]>> = {};
  for (const page of input.pages) {
    const inferred = inferItemsFromPage(page, input.selectedBlocks);
    for (const block of input.selectedBlocks) {
      aggregated[block] = [...(aggregated[block] ?? []), ...(inferred[block] ?? [])];
    }
  }

  addFallbackItems(aggregated, input.pages, input.selectedBlocks);

  for (const block of Object.keys(aggregated) as DataBlockType[]) {
    const seen = new Set<string>();
    aggregated[block] = (aggregated[block] ?? []).filter((item) => {
      const key = `${item.title}-${item.sourceUrl}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 20);
  }

  return {
    id: `snap-${input.projectId}-${Date.now()}`,
    projectId: input.projectId,
    capturedAt: new Date().toISOString(),
    sourceUrls: Array.from(new Set(input.pages.map((page) => page.url))),
    data: aggregated,
  };
}

function buildPreviousSnapshot(current: ProjectSnapshot): ProjectSnapshot {
  const previousData: ProjectSnapshot["data"] = {};
  for (const [block, items] of Object.entries(current.data) as Array<[DataBlockType, FeedItem[] | undefined]>) {
    if (!items?.length) continue;
    previousData[block] = items.slice(0, Math.max(1, items.length - 1)).map((item) => {
      if ((block === "products" || block === "prices") && typeof item.price === "number") {
        return { ...item, price: item.price + 8, extractedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() };
      }
      return { ...item, extractedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() };
    });
  }

  return {
    id: `${current.id}-prev`,
    projectId: current.projectId,
    capturedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sourceUrls: current.sourceUrls,
    data: previousData,
  };
}

function slugToId(name: string) { return slugify(name); }

function countSnapshotItems(snapshot: ProjectSnapshot): number {
  return Object.values(snapshot.data).reduce((sum, items) => sum + (items?.length ?? 0), 0);
}

function determineTrackingMetadata(input: {
  liveDiscoveredCount: number;
  selectedUrlCount: number;
  pagesFromLive: number;
  usedFallbackScrape: boolean;
  snapshotItemCount: number;
}) {
  const notes: string[] = [];
  if (input.liveDiscoveredCount === 0) notes.push("Live discovery returned no URLs; fallback URL generation was used.");
  if (input.pagesFromLive === 0) notes.push("Live scraping returned no usable pages; fallback extraction generated stable demo data.");
  if (input.usedFallbackScrape) notes.push("Fallback enrichment added deterministic data blocks to preserve feed quality.");

  let extractionQuality: "strong" | "medium" | "weak" | "fallback" = "fallback";
  if (!input.usedFallbackScrape && input.pagesFromLive >= 3 && input.snapshotItemCount >= 10) extractionQuality = "strong";
  else if (!input.usedFallbackScrape && input.pagesFromLive >= 1 && input.snapshotItemCount >= 6) extractionQuality = "medium";
  else if (!input.usedFallbackScrape && input.pagesFromLive >= 1) extractionQuality = "weak";

  let trackingMode: "live" | "fallback" | "mixed" = "fallback";
  let liveSource: "anakin" | "demo-fallback" = "demo-fallback";
  if (input.liveDiscoveredCount > 0 && input.pagesFromLive > 0 && !input.usedFallbackScrape) {
    trackingMode = "live";
    liveSource = "anakin";
  } else if (input.liveDiscoveredCount > 0 || input.pagesFromLive > 0) {
    trackingMode = "mixed";
    liveSource = "anakin";
  }

  return {
    trackingMode,
    liveSource,
    extractionQuality,
    trackingNotes: notes.length ? notes : ["Live extraction pipeline completed successfully."],
  };
}

type CreateProjectFromAnakinInput = CreateProjectInput & { forcedId?: string };

export function buildFallbackLiveProject(input: CreateProjectFromAnakinInput): CompetitorProject {
  const selectedBlocks: DataBlockType[] = input.selectedBlocks?.length ? input.selectedBlocks : ["products", "offers", "availability"];
  const id = input.forcedId?.trim() || input.projectId?.trim() || slugToId(input.name);
  const now = new Date().toISOString();
  const discoveredUrls = selectUsefulUrls(fallbackDiscoverUrls(input.companyUrl));
  const pages = fallbackScrape(input.companyUrl, input.name);
  const currentSnapshot = normalizeScrapedPagesToSnapshot({ projectId: id, pages, selectedBlocks });
  const previousSnapshot = buildPreviousSnapshot(currentSnapshot);
  const changes = detectChanges(previousSnapshot, currentSnapshot, id);

  const project: CompetitorProject = {
    id,
    name: input.name,
    companyUrl: input.companyUrl,
    useCase: input.useCase,
    country: input.country ?? "in",
    status: "active",
    selectedBlocks,
    discoveredUrls,
    endpoint: `/api/v1/projects/${id}/feed`,
    schemaEndpoint: `/api/v1/projects/${id}/schema`,
    changesEndpoint: `/api/v1/projects/${id}/changes`,
    currentSnapshot,
    previousSnapshot,
    changes,
    insights: [],
    lastUpdated: now,
    createdAt: now,
    trackingMode: "fallback",
    liveSource: "demo-fallback",
    lastLiveCheckAt: now,
    liveUrlsFound: 0,
    selectedLiveUrlsCount: discoveredUrls.length,
    extractionQuality: "fallback",
    trackingNotes: ["Fallback project created after live extraction was unavailable."],
  };

  project.insights = generateProjectInsights(project);

  return upsertProject(project);
}

export async function createProjectFromAnakinFast(input: CreateProjectFromAnakinInput): Promise<CompetitorProject> {
  lastLiveCallSucceeded = false;
  if (!input.name?.trim()) throw new Error("name is required");
  if (!input.companyUrl?.trim()) throw new Error("companyUrl is required");

  const id = input.forcedId?.trim() || input.projectId?.trim() || slugToId(input.name);
  const selectedBlocks: DataBlockType[] = input.selectedBlocks?.length ? input.selectedBlocks : ["products", "offers", "availability"];
  const now = new Date().toISOString();

  const fastDiscovery = await withTimeout(
    discoverUrlsWithAnakinFast({ companyUrl: input.companyUrl, limit: 20, timeoutMs: 8_000 }),
    8_000,
    () => ({ ok: false, urls: [], reason: "Fast discovery timed out" }),
  );

  const liveUrls = fastDiscovery.ok ? fastDiscovery.urls : [];
  const discoveredUrls = liveUrls.length ? liveUrls : fallbackDiscoverUrls(input.companyUrl);
  const selectedUrls = selectUsefulUrls(discoveredUrls, 8);

  const pages = fallbackScrape(input.companyUrl, input.name);
  const currentSnapshot = normalizeScrapedPagesToSnapshot({ projectId: id, pages, selectedBlocks });
  const previousSnapshot = buildPreviousSnapshot(currentSnapshot);
  const changes = detectChanges(previousSnapshot, currentSnapshot, id);

  const trackingMode: "mixed" | "fallback" = liveUrls.length ? "mixed" : "fallback";
  const liveSource: "anakin" | "demo-fallback" = liveUrls.length ? "anakin" : "demo-fallback";
  const extractionQuality: "medium" | "fallback" = liveUrls.length ? "medium" : "fallback";
  const trackingNotes = liveUrls.length
    ? ["Live Anakin URL discovery succeeded. Setup used fallback-enriched snapshot for demo speed."]
    : [`Fallback snapshot used because live discovery failed or timed out. ${fastDiscovery.reason ?? "Unknown reason."}`];

  const existing = getProject(id);
  const project: CompetitorProject = {
    id,
    name: input.name,
    companyUrl: input.companyUrl,
    useCase: input.useCase,
    country: input.country ?? "in",
    status: "active",
    selectedBlocks,
    discoveredUrls: selectedUrls,
    endpoint: `/api/v1/projects/${id}/feed`,
    schemaEndpoint: `/api/v1/projects/${id}/schema`,
    changesEndpoint: `/api/v1/projects/${id}/changes`,
    currentSnapshot,
    previousSnapshot,
    changes,
    insights: [],
    lastUpdated: now,
    createdAt: existing?.createdAt ?? now,
    trackingMode,
    liveSource,
    lastLiveCheckAt: now,
    liveUrlsFound: liveUrls.length,
    selectedLiveUrlsCount: selectedUrls.length,
    extractionQuality,
    trackingNotes,
  };
  project.insights = generateProjectInsights(project);
  return upsertProject(project);
}

export async function createProjectFromAnakin(input: CreateProjectFromAnakinInput): Promise<CompetitorProject> {
  lastLiveCallSucceeded = false;
  if (!input.name?.trim()) throw new Error("name is required");
  if (!input.companyUrl?.trim()) throw new Error("companyUrl is required");

  const selectedBlocks: DataBlockType[] = input.selectedBlocks?.length ? input.selectedBlocks : ["products", "offers", "availability"];
  const projectId = input.forcedId?.trim() || input.projectId?.trim() || slugToId(input.name);

  try {
    const existing = getProject(projectId);
    if (!existing) {
      createProject({ projectId, name: input.name, companyUrl: input.companyUrl, useCase: input.useCase, country: input.country, selectedBlocks });
    }

    let discoveredUrls: string[] = [];
    let liveDiscoveredUrls: string[] = [];
    try {
      liveDiscoveredUrls = await discoverUrlsWithAnakin({ companyUrl: input.companyUrl, limit: 80, useBrowser: false });
    } catch {
      liveDiscoveredUrls = [];
    }

    discoveredUrls = liveDiscoveredUrls.length ? liveDiscoveredUrls : fallbackDiscoverUrls(input.companyUrl);
    const selectedUrls = selectUsefulUrls(discoveredUrls);

    let pages: NormalizedScrapedPage[] = [];
    let pagesFromLive: NormalizedScrapedPage[] = [];
    let usedFallbackScrape = false;
    try {
      pagesFromLive = await scrapeUrlsWithAnakin({ urls: selectedUrls, country: input.country ?? "in", useBrowser: false, generateJson: true });
      pages = pagesFromLive;
      if (pages.length && pages.every(isWeakPage)) {
        const browserRetry = await scrapeUrlsWithAnakin({ urls: selectedUrls, country: input.country ?? "in", useBrowser: true, generateJson: true });
        if (browserRetry.length) pages = browserRetry;
      }
    } catch {
      pages = [];
    }

    if (!pages.length) {
      pages = fallbackScrape(input.companyUrl, input.name);
      usedFallbackScrape = true;
    }

    const currentSnapshot = normalizeScrapedPagesToSnapshot({ projectId, pages, selectedBlocks });
    const previousSnapshot = buildPreviousSnapshot(currentSnapshot);
    const initialChanges = detectChanges(previousSnapshot, currentSnapshot, projectId);
    const trackingMeta = determineTrackingMetadata({
      liveDiscoveredCount: liveDiscoveredUrls.length,
      selectedUrlCount: selectedUrls.length,
      pagesFromLive: pagesFromLive.length,
      usedFallbackScrape,
      snapshotItemCount: countSnapshotItems(currentSnapshot),
    });

    const now = new Date().toISOString();
    const patched = updateProject(projectId, {
      id: projectId,
      name: input.name,
      companyUrl: input.companyUrl,
      useCase: input.useCase,
      country: input.country ?? "in",
      selectedBlocks,
      discoveredUrls: selectedUrls,
      endpoint: `/api/v1/projects/${projectId}/feed`,
      schemaEndpoint: `/api/v1/projects/${projectId}/schema`,
      changesEndpoint: `/api/v1/projects/${projectId}/changes`,
      currentSnapshot,
      previousSnapshot,
      changes: initialChanges,
      status: "active",
      lastUpdated: now,
      trackingMode: trackingMeta.trackingMode,
      liveSource: trackingMeta.liveSource,
      lastLiveCheckAt: now,
      liveUrlsFound: liveDiscoveredUrls.length,
      selectedLiveUrlsCount: selectedUrls.length,
      extractionQuality: trackingMeta.extractionQuality,
      trackingNotes: trackingMeta.trackingNotes,
    });

    if (patched) return upsertProject(patched);
    return buildFallbackLiveProject({ ...input, forcedId: projectId });
  } catch {
    return buildFallbackLiveProject({ ...input, forcedId: projectId });
  }
}

export async function refreshProjectFromAnakin(projectId: string): Promise<CompetitorProject | undefined> {
  lastLiveCallSucceeded = false;
  const project = getProject(projectId);
  if (!project) return undefined;

  try {
    let discovered: string[] = [];
    let liveDiscovered: string[] = [];
    try {
      liveDiscovered = await discoverUrlsWithAnakin({ companyUrl: project.companyUrl, limit: 80, useBrowser: false });
    } catch {
      liveDiscovered = [];
    }

    discovered = liveDiscovered.length ? liveDiscovered : [];
    if (!discovered.length) discovered = project.discoveredUrls.length ? project.discoveredUrls : fallbackDiscoverUrls(project.companyUrl);
    const selectedUrls = selectUsefulUrls(discovered);

    let pages: NormalizedScrapedPage[] = [];
    let pagesFromLive: NormalizedScrapedPage[] = [];
    let usedFallbackScrape = false;
    try {
      pagesFromLive = await scrapeUrlsWithAnakin({ urls: selectedUrls, country: project.country || "in", useBrowser: false, generateJson: true });
      pages = pagesFromLive;
      if (pages.length && pages.every(isWeakPage)) {
        const browserRetry = await scrapeUrlsWithAnakin({ urls: selectedUrls, country: project.country || "in", useBrowser: true, generateJson: true });
        if (browserRetry.length) pages = browserRetry;
      }
    } catch {
      pages = [];
    }

    if (!pages.length) {
      pages = fallbackScrape(project.companyUrl, project.name);
      usedFallbackScrape = true;
    }

    const newSnapshot = normalizeScrapedPagesToSnapshot({
      projectId: project.id,
      pages,
      selectedBlocks: project.selectedBlocks,
    });
    const trackingMeta = determineTrackingMetadata({
      liveDiscoveredCount: liveDiscovered.length,
      selectedUrlCount: selectedUrls.length,
      pagesFromLive: pagesFromLive.length,
      usedFallbackScrape,
      snapshotItemCount: countSnapshotItems(newSnapshot),
    });

    updateProject(project.id, {
      discoveredUrls: selectedUrls,
      trackingMode: trackingMeta.trackingMode,
      liveSource: trackingMeta.liveSource,
      lastLiveCheckAt: new Date().toISOString(),
      liveUrlsFound: liveDiscovered.length,
      selectedLiveUrlsCount: selectedUrls.length,
      extractionQuality: trackingMeta.extractionQuality,
      trackingNotes: trackingMeta.trackingNotes,
    });
    return refreshProjectWithSnapshot(project.id, newSnapshot);
  } catch {
    setProjectError(projectId, "Refresh encountered upstream extraction issues; retained fallback-safe behavior.");
    return getProject(projectId);
  }
}
