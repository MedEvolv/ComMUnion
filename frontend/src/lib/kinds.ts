import type { Gathering, Kind } from "@/lib/types";

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
  lunch: {
    label: "Lunch",
    emoji: "🍛",
    card: "bg-[#FEFCE8] text-[#713F12] border-[#713F12]/15",
    chip: "bg-[#FEF08A] text-[#854D0E] border-[#854D0E]/25",
  },
  cowork: {
    label: "Cowork-room",
    emoji: "💻",
    card: "bg-[#F5F3FF] text-[#3B0764] border-[#3B0764]/15",
    chip: "bg-[#EDE9FE] text-[#6B21A8] border-[#6B21A8]/25",
  },
};

export const KINDS: Kind[] = ["party", "event", "get-together", "lunch", "cowork"];

/** Feed chips. Room / club / other are cross-cuts, not kinds. */
export const FEED_CHIPS: { value: string; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "lunch", label: "🍛 Lunch" },
  { value: "room", label: "🚪 Room hangs" },
  { value: "club", label: "🏷️ Club hangs" },
  { value: "party", label: "🎉 Party" },
  { value: "event", label: "🎟️ Event" },
  { value: "get-together", label: "☕ Get-Together" },
  { value: "other", label: "Other" },
];

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

export function capLabel(g: Gathering): string {
  return `${g.going.length}/${g.cap}`;
}

/** Nudge = a WhatsApp draft, never an in-app chat row. Number is a placeholder until campus supplies one. */
export const WHATSAPP_PLACEHOLDER = "91XXXXXXXXXX";

export function whatsappDraft(text: string): string {
  return `https://wa.me/${WHATSAPP_PLACEHOLDER}?text=${encodeURIComponent(text)}`;
}
