import type { Kind } from "@/lib/types";

export const KIND_META: Record<Kind, { label: string; emoji: string; card: string; chip: string }> = {
  party: {
    label: "Party",
    emoji: "🎉",
    card: "bg-[#FFF4EC] text-[#431407] border-[#431407]/15",
    chip: "bg-[#FFE0CC] text-[#7C2D12] border-[#7C2D12]/25",
  },
  event: {
    label: "Event",
    emoji: "🎟️",
    card: "bg-[#F0F9FF] text-[#0C4A6E] border-[#0C4A6E]/15",
    chip: "bg-[#DBEEFB] text-[#0369A1] border-[#0369A1]/25",
  },
  "get-together": {
    label: "Get-Together",
    emoji: "☕",
    card: "bg-[#F0FDF4] text-[#14532D] border-[#14532D]/15",
    chip: "bg-[#DCFCE7] text-[#15803D] border-[#15803D]/25",
  },
};

export const KINDS: Kind[] = ["party", "event", "get-together"];

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Date TBC";
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function prettyTag(tag: string): string {
  return tag.replace(/-/g, " ");
}

/** A hang counts as "last minute" when it kicks off within the next three hours. */
export const SOON_WINDOW_MS = 3 * 60 * 60 * 1000;

export function isStartingSoon(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const delta = t - Date.now();
  return delta >= -15 * 60 * 1000 && delta <= SOON_WINDOW_MS;
}

export function countdown(iso: string): string {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins <= 0) return "happening now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `in ${h} hr` : `in ${h} hr ${rem} min`;
}
