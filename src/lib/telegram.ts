import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function stripWrappingQuotes(input: string): string {
  return input.replace(/^['"]+|['"]+$/g, "");
}

function cleanEnvValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = stripWrappingQuotes(raw.trim()).trim();
  return cleaned.length ? cleaned : null;
}

export function getTelegramBotToken(): string | null {
  return cleanEnvValue(process.env.TELEGRAM_BOT_TOKEN);
}

export function getTelegramChatId(): string | null {
  return cleanEnvValue(process.env.TELEGRAM_CHAT_ID);
}

export function maskTelegramToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length <= 10) return "****";
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramChatId());
}

export function getTelegramHealth(): {
  configured: boolean;
  botTokenConfigured: boolean;
  chatIdConfigured: boolean;
  maskedToken: string | null;
  mode: "telegram-ready" | "not-configured";
  checkedAt: string;
  message: string;
} {
  const token = getTelegramBotToken();
  const chatId = getTelegramChatId();
  const configured = Boolean(token && chatId);

  return {
    configured,
    botTokenConfigured: Boolean(token),
    chatIdConfigured: Boolean(chatId),
    maskedToken: maskTelegramToken(token),
    mode: configured ? "telegram-ready" : "not-configured",
    checkedAt: new Date().toISOString(),
    message: configured
      ? "Telegram bot and chat ID are configured."
      : "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
  };
}

export async function sendTelegramMessage(input: {
  text: string;
  chatId?: string;
  parseMode?: "Markdown" | "HTML";
}): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
  statusCode?: number;
}> {
  const token = getTelegramBotToken();
  const fallbackChatId = getTelegramChatId();
  const chatId = input.chatId?.trim() || fallbackChatId;

  if (!token || !chatId) {
    return {
      ok: false,
      error: "Telegram is not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: input.text,
    };

    if (input.parseMode) {
      payload.parse_mode = input.parseMode;
    }

    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const description =
        typeof body === "object" && body !== null && "description" in body && typeof (body as { description?: unknown }).description === "string"
          ? (body as { description: string }).description
          : "Telegram request failed";

      return {
        ok: false,
        error: description,
        statusCode: response.status,
      };
    }

    const messageId =
      typeof body === "object" &&
      body !== null &&
      "result" in body &&
      typeof (body as { result?: unknown }).result === "object" &&
      (body as { result: { message_id?: unknown } }).result !== null &&
      typeof (body as { result: { message_id?: unknown } }).result.message_id === "number"
        ? (body as { result: { message_id: number } }).result.message_id
        : undefined;

    return {
      ok: true,
      messageId,
      statusCode: response.status,
    };
  } catch (error) {
    const isAbort = (error as Error)?.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? "Telegram request timed out" : "Telegram request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTelegramTestMessage(): Promise<{
  ok: boolean;
  messageId?: number;
  error?: string;
  statusCode?: number;
}> {
  return sendTelegramMessage({
    text: "✅ PricePulse test alert: Telegram alerts are connected.",
  });
}
