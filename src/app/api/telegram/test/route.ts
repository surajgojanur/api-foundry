import { NextResponse } from "next/server";
import { sendTelegramTestMessage, isTelegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
        },
      },
      { status: 400 },
    );
  }

  const result = await sendTelegramTestMessage();

  return NextResponse.json({
    ok: true,
    sent: result.ok,
    result,
  });
}
