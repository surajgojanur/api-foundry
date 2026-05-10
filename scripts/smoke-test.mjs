#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const checks = [
  { path: "/api/anakin/health", required: true, name: "Anakin health (fast)" },
  { path: "/api/anakin/health?validate=true", required: false, name: "Anakin health (validate)" },
  { path: "/api/openai/health", required: true, name: "OpenAI health (fast)" },
  { path: "/api/openai/health?validate=true", required: false, name: "OpenAI health (validate)" },
  { path: "/api/v1/projects", required: true, name: "Projects list" },
  { path: "/api/v1/projects/zepto/feed", required: true, name: "Zepto feed" },
  { path: "/api/v1/projects/zepto/changes", required: true, name: "Zepto changes" },
  { path: "/api/v1/projects/zepto/schema", required: true, name: "Zepto schema" },
  { path: "/api/v1/projects/zepto/insights", required: true, name: "Zepto insights" },
  { path: "/api/v1/projects/zepto/ai-analysis", required: true, name: "Zepto AI analysis" },
  { path: "/api/v1/compare?projects=blinkit,zepto,bigbasket", required: true, name: "Compare" },
  { path: "/api/v1/compare/ai-analysis?projects=blinkit,zepto,bigbasket", required: true, name: "Compare AI analysis" },
];

async function hit(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json, url };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : "Unknown error", url };
  }
}

function line(name, pass, detail) {
  const flag = pass ? "PASS" : "FAIL";
  return `${flag.padEnd(4)} | ${name.padEnd(26)} | ${detail}`;
}

(async () => {
  let failedRequired = false;

  console.log(`Running smoke tests against ${BASE_URL}`);
  console.log("-".repeat(88));

  for (const check of checks) {
    const result = await hit(check.path);

    if (!result.ok) {
      const detail = result.status
        ? `HTTP ${result.status} ${check.required ? "(required)" : "(warning)"}`
        : `Network error: ${result.error ?? "unknown"}`;
      console.log(line(check.name, false, detail));
      if (check.required) failedRequired = true;
      continue;
    }

    if (check.path.includes("validate=true")) {
      const configured = Boolean(result.json?.health?.configured);
      const valid = result.json?.health?.valid;
      const mode = result.json?.health?.mode;
      const info = `HTTP ${result.status} | configured=${configured} valid=${String(valid)} mode=${mode}`;
      const isWarn = valid === false;
      console.log(line(check.name, !isWarn, isWarn ? `${info} (warning: fallback)` : info));
      continue;
    }

    console.log(line(check.name, true, `HTTP ${result.status}`));
  }

  console.log("-".repeat(88));
  if (failedRequired) {
    console.error("Smoke test failed: one or more required endpoints did not pass.");
    process.exit(1);
  }

  console.log("Smoke test passed for all required endpoints.");
})();
