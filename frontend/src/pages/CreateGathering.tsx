import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Shell from "@/components/Shell";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { KINDS, KIND_META } from "@/lib/kinds";
import type { Club, Gathering, GatheringCreate, Kind, Room } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NONE = "none";

function errText(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
  }
  return fallback;
}

export default function CreateGathering() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const qc = useQueryClient();
  const { persona } = usePersona();

  const initialKind = (KINDS as string[]).includes(search.get("kind") ?? "")
    ? (search.get("kind") as Kind)
    : "party";

  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [kind, setKind] = useState<Kind>(initialKind);
  const [startsAt, setStartsAt] = useState("");
  const [place, setPlace] = useState("");
  const [cap, setCap] = useState("8");
  const [roomId, setRoomId] = useState(NONE);
  const [clubId, setClubId] = useState(NONE);
  const [fromCollege, setFromCollege] = useState(false);

  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => apiGet<Room[]>("/rooms") });
  const clubs = useQuery({ queryKey: ["clubs"], queryFn: () => apiGet<Club[]>("/clubs") });
  const roomList = rooms.isError ? [] : (rooms.data ?? []);
  const myClubs = (clubs.isError ? [] : (clubs.data ?? [])).filter((c) =>
    (persona?.clubIds ?? []).includes(c.id),
  );
  const roomLabel = (id: string) => roomList.find((r) => r.id === id)?.label ?? "No room";
  const clubLabel = (id: string) => myClubs.find((c) => c.id === id)?.label ?? "Just me";

  const isLunch = kind === "lunch";

  const create = useMutation({
    mutationFn: (body: GatheringCreate) => apiPost<Gathering>("/gatherings", body),
    onSuccess: (g) => {
      void qc.invalidateQueries({ queryKey: ["gatherings"] });
      void qc.invalidateQueries({ queryKey: ["lunch-today"] });
      void qc.invalidateQueries({ queryKey: ["plans"] });
      toast.success(isLunch ? "Posted to today's lunch board 🍛" : "Posted to the board 🎉");
      navigate(`/gatherings/${g.id}`);
    },
    onError: (e) =>
      toast.error("Couldn't post that gathering", {
        description: errText(e, "Check the fields and try again."),
      }),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!persona) {
      toast.error("Pick a classmate first");
      navigate("/sign-in");
      return;
    }
    const capNum = Number(cap);
    if (!title.trim() || !hook.trim() || !place.trim() || (!isLunch && !startsAt)) {
      toast.error(isLunch ? "Fill in the title, hook and place." : "Fill in the title, hook, place and time.");
      return;
    }
    if (!Number.isInteger(capNum) || capNum < 2) {
      toast.error("Cap needs to be a whole number, at least 2.");
      return;
    }
    create.mutate({
      title: title.trim(),
      hook: hook.trim(),
      kind,
      // Lunch posts to today's slot; the actual clock is TBD from campus, so we anchor on "now".
      startsAt: isLunch ? new Date().toISOString() : new Date(startsAt).toISOString(),
      place: place.trim(),
      hostId: persona.id,
      comingFromCollege: fromCollege,
      cap: capNum,
      roomId: roomId === NONE ? null : roomId,
      hostClubId: clubId === NONE ? null : clubId,
    });
  }

  return (
    <Shell>
      <h1 className="font-heading text-4xl font-black tracking-tight">Throw something</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Anything from a terrace party to &ldquo;chai in 20 minutes&rdquo;. A good hook does most of
        the work.
      </p>

      {!persona && (
        <div
          data-testid="create-needs-persona"
          className="mt-6 rounded-3xl border-2 border-primary/40 bg-secondary p-5"
        >
          <p className="font-semibold text-[#7C2D12]">
            Pick a classmate first so we know who&rsquo;s hosting.
          </p>
          <Link
            to="/sign-in"
            className={cn(buttonVariants({ size: "sm" }), "mt-3 rounded-full")}
            data-testid="create-signin-link"
          >
            Pick a classmate
          </Link>
        </div>
      )}

      <form
        onSubmit={submit}
        data-testid="create-gathering-form"
        className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]"
      >
        <div className="space-y-5 rounded-3xl border-2 border-border bg-card p-6">
          <div className="space-y-2">
            <Label>Kind</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  data-testid={`create-kind-${k}`}
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors",
                    kind === k
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {KIND_META[k].emoji} {KIND_META[k].label}
                </button>
              ))}
            </div>
            {isLunch && (
              <p
                data-testid="lunch-slot-note"
                className="rounded-2xl bg-[#FEFCE8] px-3 py-2 font-mono text-[11px] font-semibold text-[#713F12]"
              >
                🍛 Posts to today&rsquo;s lunch board · lunch slot TBD from campus
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              data-testid="create-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isLunch ? "Lunch: Dal Makhani Faction" : "Terrace Techno, Tower B"}
              className="rounded-2xl border-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hook">The hook</Label>
            <Textarea
              id="hook"
              data-testid="create-hook-input"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Bring speakers, we have the roof till 2am."
              className="min-h-20 rounded-2xl border-2"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {!isLunch && (
              <div className="space-y-2">
                <Label htmlFor="startsAt">When</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  data-testid="create-datetime-input"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="rounded-2xl border-2"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="place">Where</Label>
              <Input
                id="place"
                data-testid="create-place-input"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder={isLunch ? "Campus canteen" : "Cyber City Highs, Tower B roof"}
                className="rounded-2xl border-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cap">Cap (people)</Label>
              <Input
                id="cap"
                type="number"
                min={2}
                step={1}
                data-testid="create-cap-input"
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                className="rounded-2xl border-2"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Select value={roomId} onValueChange={(v: string) => setRoomId(v)}>
                <SelectTrigger data-testid="create-room-select" className="w-full rounded-2xl border-2">
                  <SelectValue>{(v) => (v === NONE ? "No room" : roomLabel(v as string))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No room</SelectItem>
                  {roomList.map((r) => (
                    <SelectItem key={r.id} value={r.id} data-testid={`room-option-${r.id}`}>
                      {r.label} · {r.capacityMin}–{r.capacityMax}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roomList.length === 0 && !rooms.isLoading && (
                <p className="font-mono text-[11px] text-muted-foreground">Room roster TBD from campus.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Post as (optional)</Label>
              <Select value={clubId} onValueChange={(v: string) => setClubId(v)}>
                <SelectTrigger data-testid="create-club-select" className="w-full rounded-2xl border-2">
                  <SelectValue>{(v) => (v === NONE ? "Just me" : clubLabel(v as string))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Just me</SelectItem>
                  {myClubs.map((c) => (
                    <SelectItem key={c.id} value={c.id} data-testid={`club-option-${c.id}`}>
                      {c.label} · {c.kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {myClubs.length === 0 && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  You&rsquo;re not on a club roster yet (TBD from campus).
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border-2 border-[#92400E]/20 bg-[#FEF3C7] p-4">
            <Checkbox
              id="fromCollege"
              data-testid="create-from-college-toggle"
              checked={fromCollege}
              onCheckedChange={(v) => setFromCollege(v === true)}
            />
            <Label htmlFor="fromCollege" className="text-sm font-semibold text-[#78350F]">
              🚌 I&rsquo;m coming straight from college
            </Label>
          </div>

          <Button
            type="submit"
            size="lg"
            data-testid="create-gathering-submit"
            disabled={create.isPending}
            className="w-full rounded-full font-semibold active:scale-95"
          >
            {create.isPending ? "Posting…" : isLunch ? "Post today's lunch" : "Post it to the board"}
          </Button>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview
          </p>
          <div
            data-testid="create-preview-card"
            className={cn(
              "rounded-3xl border-2 p-5 shadow-[3px_4px_0_0_rgba(30,32,34,0.12)]",
              KIND_META[kind].card,
            )}
          >
            <div className="flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
                  KIND_META[kind].chip,
                )}
              >
                {KIND_META[kind].emoji} {KIND_META[kind].label}
              </span>
              <span className="rounded-full border border-current/25 bg-white/60 px-2.5 py-1 font-mono text-[11px] font-semibold">
                1/{cap || "?"} going
              </span>
            </div>
            <h3 className="mt-3 font-heading text-2xl font-black leading-tight">
              {title || "Your title here"}
            </h3>
            <p className="mt-1 text-sm opacity-90">{hook || "And the hook that sells it."}</p>
            <p className="mt-4 text-sm font-medium">{place || "Somewhere in Gurugram"}</p>
            {(roomId !== NONE || clubId !== NONE) && (
              <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] font-semibold">
                {roomId !== NONE && (
                  <span className="rounded-full border border-current/20 bg-white/70 px-2 py-0.5">🚪 {roomLabel(roomId)}</span>
                )}
                {clubId !== NONE && (
                  <span className="rounded-full border border-current/20 bg-white/70 px-2 py-0.5">🏷️ {clubLabel(clubId)}</span>
                )}
              </div>
            )}
            <p className="mt-3 text-xs font-semibold">
              hosted by {persona?.name ?? "a classmate"}
              {fromCollege ? " · 🚌 from college" : ""}
            </p>
          </div>
        </aside>
      </form>
    </Shell>
  );
}
