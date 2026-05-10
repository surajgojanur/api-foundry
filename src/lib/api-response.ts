import { NextResponse } from "next/server";

export function jsonOk(data: object, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        status,
        details,
      },
    },
    { status },
  );
}
