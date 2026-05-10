#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const checks = [
  { method: "GET", path: "/api/anakin/health?validate=true", required: false, name: "Anakin validate", timeoutMs: 30_000 },
  { method: "GET", path: "/api/openai/health?validate=true", required: false, name: "OpenAI validate", timeoutMs: 30_000 },
  { method: "POST", path: "/api/live/setup", required: true, name: "Live setup", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-zepto/tracking-status", required: true, name: "Zepto tracking status", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-blinkit/tracking-status", required: true, name: "Blinkit tracking status", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-zepto/feed", required: true, name: "Zepto feed", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-blinkit/feed", required: true, name: "Blinkit feed", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-zepto/ai-analysis", required: true, name: "Zepto AI analysis", timeoutMs: 30_000 },
  { method: "GET", path: "/api/v1/projects/live-blinkit/ai-analysis", required: true, name: "Blinkit AI analysis", timeoutMs: 30_000 },
  { method: "GET", path: "/api/live/compare", required: true, name: "Live compare", timeoutMs: 30_000 },
  { method: "POST", path: "/api/live/refresh-all", required: true, name: "Live refresh all", timeoutMs: 90_000 },
];

async function callEndpoint(method, path, timeoutMs) {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      cache: "no-store",
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json, raw: text, url, durationMs: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : "Unknown error", url, durationMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function out(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name.padEnd(24)} | ${detail}`);
}

function printTracking(label, payload) {
  if (!payload) return;
  const mode = payload.trackingMode ?? payload.project?.trackingMode ?? "n/a";
  const quality = payload.extractionQuality ?? payload.project?.extractionQuality ?? "n/a";
  const urlsFound = payload.liveUrlsFound ?? payload.project?.liveUrlsFound ?? 0;
  const changesDetected = payload.changeSummary?.total ?? payload.changesDetected ?? payload.project?.changesDetected ?? 0;
  console.log(`INFO | ${label.padEnd(24)} | mode=${mode} quality=${quality} urls=${urlsFound} changes=${changesDetected}`);
}

(async () => {
  let failedRequired = false;
  console.log(`Running live smoke test against ${BASE_URL}`);
  console.log("-".repeat(88));

  for (const check of checks) {
    console.log(`RUN | ${check.name}`);
    const result = await callEndpoint(check.method, check.path, check.timeoutMs);

    if (!result.ok) {
      const detail = result.status
        ? `HTTP ${result.status} ${check.required ? "(required)" : "(warn)"} duration=${result.durationMs}ms`
        : `Network error: ${result.error ?? "unknown"} duration=${result.durationMs}ms`;
      out(check.name, false, detail);
      if (check.path === "/api/live/setup" && result.raw) {
        console.log(`INFO | live setup body       | ${result.raw.slice(0, 1000)}`);
      }
      if (check.required) failedRequired = true;
      continue;
    }

    if (check.path.includes("validate=true")) {
      const valid = result.json?.health?.valid;
      const mode = result.json?.health?.mode;
      const configured = result.json?.health?.configured;
      const warn = valid === false;
      out(check.name, !warn, `HTTP ${result.status} configured=${configured} valid=${String(valid)} mode=${mode}${warn ? " (warn)" : ""}`);
      continue;
    }

    out(check.name, true, `HTTP ${result.status} duration=${result.durationMs}ms`);

    if (check.path.includes("tracking-status")) {
      printTracking(check.name, result.json);
    }

    if (check.path === "/api/live/setup") {
      if (result.durationMs > 30_000) {
        out(check.name, false, `duration ${result.durationMs}ms exceeded 30000ms limit`);
        failedRequired = true;
      }
      console.log(`INFO | live setup duration   | ${result.durationMs}ms`);
      console.log(`INFO | setupDurationMs api  | ${result.json?.setupDurationMs ?? "n/a"}`);
      const targets = Array.isArray(result.json?.targets) ? result.json.targets : [];
      for (const target of targets) {
        printTracking(String(target?.name ?? target?.id ?? "target"), target);
        console.log(`INFO | ${String(target?.name ?? target?.id ?? "target").padEnd(24)} | urls=${target?.liveUrlsFound ?? 0} selected=${target?.selectedLiveUrlsCount ?? 0} quality=${target?.extractionQuality ?? "n/a"}`);
      }
      if (!result.json?.ok) {
        console.log(`INFO | live setup body       | ${result.raw?.slice(0, 1000) ?? ""}`);
      }
    }

    if (check.path === "/api/live/refresh-all") {
      const rows = Array.isArray(result.json?.results) ? result.json.results : [];
      for (const row of rows) {
        printTracking(String(row?.name ?? row?.id ?? "target"), row);
      }
    }
  }

  console.log("-".repeat(88));
  if (failedRequired) {
    console.error("Live smoke test failed: one or more required endpoints failed.");
    process.exit(1);
  }

  console.log("Live smoke test passed for required endpoints.");
})();
