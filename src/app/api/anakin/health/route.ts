import { jsonOk } from "@/lib/api-response";
import { getAnakinHealth } from "@/lib/anakin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validate = searchParams.get("validate") === "true";
  const health = await getAnakinHealth({ validate });
  return jsonOk({ ok: true, health });
}
