const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function fetchJson(path, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  } finally {
    clearTimeout(timer);
  }
}

function log(kind, message) {
  console.log(`${kind}: ${message}`);
}

async function main() {
  log("INFO", `Running Telegram smoke against ${BASE_URL}`);

  const health = await fetchJson("/api/telegram/health");
  if (!health.ok || !health.body?.ok) {
    log("FAIL", "GET /api/telegram/health failed");
    process.exit(1);
  }

  const telegramConfigured = Boolean(health.body?.health?.configured);
  log("INFO", `Telegram configured: ${telegramConfigured}`);

  const test = await fetchJson("/api/telegram/test", { method: "POST" });
  const send = await fetchJson("/api/v1/projects/zepto/alerts/send", { method: "POST" });
  const refreshAndAlert = await fetchJson("/api/v1/projects/zepto/refresh-and-alert", { method: "POST" });
  const alerts = await fetchJson("/api/v1/projects/zepto/alerts");

  if (!send.ok || !refreshAndAlert.ok || !alerts.ok) {
    log("FAIL", "One or more alert endpoints failed");
    process.exit(1);
  }

  if (!telegramConfigured) {
    log("WARN", "Telegram not configured. Delivery failures are expected.");
    log("PASS", "Smoke completed with warning (non-fatal)." );
    return;
  }

  const testSent = Boolean(test.body?.sent);
  const sendSent = Number(send.body?.alertsSent ?? 0) > 0;
  const refreshSent = Number(refreshAndAlert.body?.alertsSent ?? 0) > 0;

  if (!testSent || !sendSent || !refreshSent) {
    log("FAIL", "Telegram configured but one or more sends failed.");
    process.exit(1);
  }

  log("PASS", "Telegram smoke test passed.");
}

main().catch((error) => {
  log("FAIL", error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
