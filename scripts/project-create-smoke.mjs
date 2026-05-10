#!/usr/bin/env node
// @ts-check

/**
 * project-create-smoke.mjs
 *
 * Smoke test: creates a project via POST /api/projects/create-from-url
 * then verifies it appears in GET /api/v1/projects, GET /api/debug/projects,
 * and that per-project endpoints respond 200.
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  return { res, body };
}

async function main() {
  console.log(`\n🔬 Project Create Smoke Test — ${BASE}\n`);

  // 1. Create a project
  let projectId;
  await test("POST /api/projects/create-from-url creates a project", async () => {
    const { res, body } = await fetchJson(`${BASE}/api/projects/create-from-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Smoke Test Competitor",
        companyUrl: "https://example.com",
        useCase: "competitor intelligence",
        country: "in",
        selectedBlocks: ["products", "offers", "availability", "announcements"],
      }),
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(body.ok === true, "Expected ok:true");
    assert(body.project?.id, "Expected project.id");
    assert(body.next?.projectUrl, "Expected next.projectUrl");
    projectId = body.project.id;
    console.log(`    → project.id = ${projectId}`);
    console.log(`    → mode = ${body.mode}`);
  });

  if (!projectId) {
    console.error("\n⛔ Cannot continue: project creation failed.\n");
    process.exit(1);
  }

  // 2. GET /api/v1/projects includes it
  await test("GET /api/v1/projects includes newly created project", async () => {
    const { body } = await fetchJson(`${BASE}/api/v1/projects`);
    assert(body.ok === true, "Expected ok:true");
    const ids = body.projects.map((p) => p.id);
    assert(ids.includes(projectId), `Project ${projectId} not found in /api/v1/projects`);
  });

  // 3. GET /api/debug/projects includes it
  await test("GET /api/debug/projects includes newly created project", async () => {
    const { body } = await fetchJson(`${BASE}/api/debug/projects`);
    assert(body.ok === true, "Expected ok:true");
    assert(body.ids.includes(projectId), `Project ${projectId} not found in /api/debug/projects`);
  });

  // 4. GET /api/v1/projects/{id}/feed returns 200
  await test(`GET /api/v1/projects/${projectId}/feed returns 200`, async () => {
    const { res } = await fetchJson(`${BASE}/api/v1/projects/${projectId}/feed`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 5. GET /api/v1/projects/{id}/changes returns 200
  await test(`GET /api/v1/projects/${projectId}/changes returns 200`, async () => {
    const { res } = await fetchJson(`${BASE}/api/v1/projects/${projectId}/changes`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 6. GET /api/v1/projects/{id}/schema returns 200
  await test(`GET /api/v1/projects/${projectId}/schema returns 200`, async () => {
    const { res } = await fetchJson(`${BASE}/api/v1/projects/${projectId}/schema`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 7. GET /api/v1/projects/{id}/insights returns 200
  await test(`GET /api/v1/projects/${projectId}/insights returns 200`, async () => {
    const { res } = await fetchJson(`${BASE}/api/v1/projects/${projectId}/insights`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 8. GET /projects/{id} HTML page returns 200
  await test(`GET /projects/${projectId} returns 200`, async () => {
    const res = await fetch(`${BASE}/projects/${projectId}`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 9. GET /compare returns 200
  await test("GET /compare returns 200", async () => {
    const res = await fetch(`${BASE}/compare`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  // 10. GET / (dashboard) returns 200
  await test("GET / (dashboard) returns 200", async () => {
    const res = await fetch(`${BASE}/`);
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
