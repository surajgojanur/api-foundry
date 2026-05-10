import { jsonError, jsonOk } from "@/lib/api-response";
import { fallbackScrape, isAnakinConfigured, scrapeUrlsWithAnakin, selectUsefulUrls } from "@/lib/anakin";
import type { NormalizedScrapedPage } from "@/lib/anakin";

type ScrapeBody = {
  urls?: string[];
  country?: string;
  useBrowser?: boolean;
};

function isValidUrl(input: string) {
  try {
    const parsed = new URL(input);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: ScrapeBody;
  try {
    body = (await request.json()) as ScrapeBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return jsonError("urls is required and must be a non-empty array", 400);
  }

  const urls = body.urls.filter((url) => typeof url === "string" && isValidUrl(url));
  if (!urls.length) {
    return jsonError("No valid urls were provided", 400);
  }

  const selected = selectUsefulUrls(urls, 8);
  const country = body.country ?? "in";
  const useBrowser = Boolean(body.useBrowser);

  let pages: NormalizedScrapedPage[] = [];
  let mode: "live" | "fallback" = "fallback";

  try {
    pages = await scrapeUrlsWithAnakin({ urls: selected, country, useBrowser, generateJson: true });
    if (pages.length > 0) mode = "live";
  } catch {
    pages = [];
  }

  if (!pages.length) {
    pages = fallbackScrape(selected[0] ?? urls[0], "Competitor Project");
    mode = "fallback";
  }

  return jsonOk({
    ok: true,
    mode: isAnakinConfigured() && mode === "live" ? "live" : "fallback",
    count: pages.length,
    pages,
  });
}
