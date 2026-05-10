import { jsonOk } from "@/lib/api-response";
import { getOpenAIHealth } from "@/lib/openai-insights";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validate = searchParams.get("validate") === "true";
  const health = await getOpenAIHealth({ validate });
  return jsonOk({ ok: true, health });
}
