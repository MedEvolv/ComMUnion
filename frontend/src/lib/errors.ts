import { ApiError } from "@/lib/api";

/** Pull FastAPI's `{detail: "..."}` out of an ApiError, else the fallback. */
export function errText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
  }
  return fallback;
}

export function errStatus(e: unknown): number | null {
  return e instanceof ApiError ? e.status : null;
}
