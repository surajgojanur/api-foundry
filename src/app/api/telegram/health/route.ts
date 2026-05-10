import { jsonOk } from "@/lib/api-response";
import { getTelegramHealth } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({
    ok: true,
    health: getTelegramHealth(),
  });
}
