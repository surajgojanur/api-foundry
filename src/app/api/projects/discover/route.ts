import { jsonError, jsonOk } from "@/lib/api-response";
import { discoverUrlsWithAnakin, fallbackDiscoverUrls, isAnakinConfigured, selectUsefulUrls, validateAnakinCredentials } from "@/lib/anakin";

type DiscoverBody = {
  companyUrl?: string;
  limit?: number;
};

function sanitizeUrl(input: string) {
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`;
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: DiscoverBody;
  try {
    body = (await request.json()) as DiscoverBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (!body.companyUrl) return jsonError("companyUrl is required", 400);

  const companyUrl = sanitizeUrl(body.companyUrl);
  if (!companyUrl) return jsonError("companyUrl must be a valid URL", 400);

  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(100, body.limit) : 50;

  let discoveredUrls: string[] = [];
  let mode: "live" | "fallback" = "fallback";
  let fallbackReason = "Fallback demo mode";
  let jobAccepted = false;
  let validationStatus: "not_configured" | "valid" | "invalid" | "unknown" = isAnakinConfigured() ? "unknown" : "not_configured";

  try {
    discoveredUrls = await discoverUrlsWithAnakin({ companyUrl, limit, useBrowser: false });
    jobAccepted = true;
    if (discoveredUrls.length > 0) {
      mode = "live";
      validationStatus = "valid";
    } else {
      fallbackReason = "No useful URLs returned";
    }
  } catch {
    fallbackReason = "Anakin request failed";

    if (isAnakinConfigured()) {
      const validation = await validateAnakinCredentials();
      if (validation.configured && validation.valid === false && validation.statusCode && [401, 403].includes(validation.statusCode)) {
        fallbackReason = "Anakin API key invalid/inactive";
        validationStatus = "invalid";
      } else if (validation.valid) {
        validationStatus = "valid";
      }
    }
  }

  if (!discoveredUrls.length) {
    discoveredUrls = fallbackDiscoverUrls(companyUrl);
    mode = "fallback";
  }

  const selectedUrls = selectUsefulUrls(discoveredUrls);
  const diagnostics = process.env.NODE_ENV === "development"
    ? {
      validationStatus,
      jobAccepted,
      urlsFound: discoveredUrls.length,
      selectedUrlsCount: selectedUrls.length,
    }
    : undefined;

  return jsonOk({
    ok: true,
    mode: isAnakinConfigured() && mode === "live" ? "live" : "fallback",
    fallbackReason: mode === "fallback" ? fallbackReason : undefined,
    companyUrl,
    discoveredUrls,
    selectedUrls,
    diagnostics,
  });
}
