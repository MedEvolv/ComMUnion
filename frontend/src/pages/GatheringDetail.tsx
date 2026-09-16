import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bus, CalendarDays, MapPin, DoorOpen, Tag, MessageCircle, Pencil, Ban } from "lucide-react";
import Shell from "@/components/Shell";
import { StatusPill } from "@/components/GatheringCard";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { errStatus, errText } from "@/lib/errors";
import { usePersona } from "@/lib/persona";
import { KIND_META, formatWhen, initials, prettyTag, whatsappDraft, capLabel } from "@/lib/kinds";
import type { Club, DeleteResult, Gathering, GatheringUpdate, HostAction, Profile, Room } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NONE = "none";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GatheringDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { persona } = usePersona();
  const [fromCollege, setFromCollege] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gathering", id],
    queryFn: () => apiGet<Gathering>(`/gatherings/${id}`),
    enabled: !!id,
  });
  const g = isError ? undefined : data;

  const myProfile = useQuery({
    queryKey: ["profile", persona?.id ?? ""],
    queryFn: () => apiGet<Profile>(`/profiles/${persona?.id ?? ""}`),
    enabled: !!persona,
  });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => apiGet<Room[]>("/rooms") });
  const clubs = useQuery({ queryKey: ["clubs"], queryFn: () => apiGet<Club[]>("/clubs") });

  const myInterests = new Set(myProfile.data?.interests ?? []);
  const shared = (interests: string[]) => interests.filter((t) => myInterests.has(t));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["gathering", id] });
    void qc.invalidateQueries({ queryKey: ["gatherings"] });
    void qc.invalidateQueries({ queryKey: ["lunch-today"] });
    void qc.invalidateQueries({ queryKey: ["plans"] });
  };

  const join = useMutation({
    mutationFn: () =>
      apiPost<Gathering>(`/gatherings/${id}/rsvp`, {
        personId: persona?.id ?? "",
        comingFromCollege: fromCollege,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("You're on the list 🎉");
    },
    onError: (e) => {
      invalidate();
      if (errStatus(e) === 409) {
        setJustFilled(true);
        toast.error("Full — this one just filled up", {
          description: "You weren't added. Nudge the host on WhatsApp instead.",
        });
      } else {
        toast.error("Join failed", { description: errText(e, "Try again in a sec.") });
      }
    },
  });

  const leave = useMutation({
    mutationFn: () => apiDelete<DeleteResult>(`/gatherings/${id}/rsvp/${persona?.id ?? ""}`),
    onSuccess: () => {
      invalidate();
      toast("Taken off the list.");
    },
    onError: (e) => toast.error("Couldn't leave", { description: errText(e, "Try again.") }),
  });

  const cancel = useMutation({
    mutationFn: () => apiPost<Gathering>(`/gatherings/${id}/cancel`, { hostId: persona?.id ?? "" } satisfies HostAction),
    onSuccess: () => {
      invalidate();
      setCancelOpen(false);
      toast("Taken down.", { description: "It's off the board. Nothing was deleted." });
    },
    onError: (e) => toast.error("Couldn't take it down", { description: errText(e, "Try again.") }),
  });

  const edit = useMutation({
    mutationFn: (body: GatheringUpdate) => apiPatch<Gathering>(`/gatherings/${id}`, body),
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      toast.success("Updated");
    },
    onError: (e) => toast.error("Couldn't save", { description: errText(e, "Check the fields.") }),
  });

  const mine = !!persona && !!g && g.going.some((a) => a.personId === persona.id);
  const isHost = !!persona && g?.hostId === persona.id;
  const meta = g ? KIND_META[g.kind] : KIND_META.party;
  const full = g?.status === "full";
  const cancelled = g?.status === "cancelled";

  const nudgeHostHref = g
    ? whatsappDraft(
        `Hey ${g.hostName.split(" ")[0]}! ${persona?.name ?? "A classmate"} here — "${g.title}" is full but I'd love to come if a spot opens. Room for one more?`,
      )
    : "#";
  const nudgeFromHostHref = g
    ? whatsappDraft(
        `Hey! I'm hosting "${g.title}" — ${g.hook} ${g.kind === "lunch" ? "Today's lunch slot (TBD from campus)" : formatWhen(g.startsAt)} at ${g.place}. ${capLabel(g)} so far. Come through?`,
      )
    : "#";

  return (
    <Shell>
      <Link
        to="/"
        data-testid="back-to-feed"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to the board
      </Link>

      {isLoading && (
        <div data-testid="detail-loading" className="mt-5 h-64 animate-pulse rounded-3xl border-2 border-border bg-muted" />
      )}

      {isError && (
        <div data-testid="detail-error" className="mt-5 rounded-3xl border-2 border-destructive/30 bg-card p-8 text-center">
          <h2 className="font-heading text-xl font-black">We couldn&rsquo;t open this one</h2>
          <p className="mt-2 text-sm text-muted-foreground">It may have been taken down, or the board is offline.</p>
          <Link to="/" className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}>
            Back to the board
          </Link>
        </div>
      )}

      {g && (
        <>
          {cancelled && (
            <div
              data-testid="detail-cancelled-banner"
              className="mt-5 rounded-2xl border-2 border-foreground/30 bg-muted px-5 py-3 font-semibold"
            >
              <Ban className="mr-2 inline size-4" /> Taken down by the host. It stays here for the record — nobody can join.
            </div>
          )}

          <section
            data-testid="gathering-detail"
            className={cn(
              "animate-pop-in mt-5 rounded-[2rem] border-2 p-6 shadow-[5px_6px_0_0_rgba(30,32,34,0.14)] sm:p-8",
              meta.card,
              cancelled && "opacity-70 saturate-50",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold", meta.chip)}>
                {meta.emoji} {meta.label}
              </span>
              <StatusPill g={g} testid="detail-status" />
              {g.comingFromCollege && (
                <span className="rounded-full border border-[#92400E]/25 bg-[#FEF3C7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#78350F]">
                  <Bus className="mr-1 inline size-3" /> Host comes from college
                </span>
              )}
              {g.roomLabel && (
                <span data-testid="detail-room" className="rounded-full border border-current/20 bg-white/70 px-2.5 py-1 font-mono text-[11px] font-semibold">
                  <DoorOpen className="mr-1 inline size-3" /> {g.roomLabel}
                </span>
              )}
              {g.hostClubLabel && (
                <span data-testid="detail-club" className="rounded-full border border-current/20 bg-white/70 px-2.5 py-1 font-mono text-[11px] font-semibold">
                  <Tag className="mr-1 inline size-3" /> {g.hostClubLabel}
                </span>
              )}
            </div>

            <h1 data-testid="detail-title" className="mt-3 font-heading text-4xl font-black leading-[1.05] tracking-tight">
              {g.title}
            </h1>
            <p className="mt-2 max-w-2xl text-base opacity-90">{g.hook}</p>

            <div className="mt-5 grid gap-2 text-sm font-medium sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 opacity-70" />
                <span data-testid="detail-when">
                  {g.kind === "lunch" ? "Today's lunch slot · TBD from campus" : formatWhen(g.startsAt)}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 opacity-70" />
                <span data-testid="detail-place">{g.place}</span>
              </p>
            </div>

            <p className="mt-5 text-sm font-semibold" data-testid="detail-host">
              Hosted by {g.hostName} · {g.hostBatch}
              <span className="ml-2 font-mono text-xs opacity-80" data-testid="detail-cap">
                {capLabel(g)} spots
              </span>
            </p>
          </section>

          {/* RSVP / host controls */}
          <section className="mt-6 rounded-3xl border-2 border-border bg-card p-6">
            {!persona ? (
              <div data-testid="detail-needs-persona">
                <p className="font-semibold">Pick a classmate to RSVP.</p>
                <Link to="/sign-in" className={cn(buttonVariants({ size: "sm" }), "mt-3 rounded-full")}>
                  Pick a classmate
                </Link>
              </div>
            ) : isHost ? (
              <div className="flex flex-wrap items-center gap-3" data-testid="host-controls">
                <p data-testid="detail-host-note" className="mr-auto text-sm font-semibold">
                  You&rsquo;re hosting this one.
                </p>
                {!cancelled && (
                  <>
                    <a
                      href={nudgeFromHostHref}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="nudge-from-host-button"
                      className={cn(buttonVariants({ variant: "outline" }), "rounded-full border-2 font-semibold")}
                    >
                      <MessageCircle className="size-4" /> Nudge a classmate
                    </a>
                    <Button
                      variant="outline"
                      data-testid="host-edit-button"
                      onClick={() => setEditOpen(true)}
                      className="rounded-full border-2 font-semibold"
                    >
                      <Pencil className="size-4" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      data-testid="host-cancel-button"
                      onClick={() => setCancelOpen(true)}
                      className="rounded-full font-semibold"
                    >
                      <Ban className="size-4" /> Cancel
                    </Button>
                  </>
                )}
              </div>
            ) : cancelled ? (
              <p data-testid="detail-cancelled-note" className="text-sm font-semibold text-muted-foreground">
                This one&rsquo;s been taken down — no RSVPs.
              </p>
            ) : mine ? (
              <div className="flex flex-wrap items-center gap-3">
                <span data-testid="detail-going-badge" className="rounded-full bg-foreground px-3 py-1.5 font-mono text-xs font-semibold text-background">
                  You&rsquo;re going
                </span>
                <Button
                  variant="outline"
                  data-testid="rsvp-leave-button"
                  disabled={leave.isPending}
                  onClick={() => leave.mutate()}
                  className="rounded-full border-2 font-semibold active:scale-95"
                >
                  {leave.isPending ? "Leaving…" : "Leave"}
                </Button>
              </div>
            ) : full || justFilled ? (
              <div className="flex flex-wrap items-center gap-3" data-testid="detail-full-block">
                <span className="rounded-full border-2 border-foreground bg-foreground px-3 py-1.5 font-mono text-xs font-bold text-background">
                  Full · {capLabel(g)}
                </span>
                <p className="text-sm text-muted-foreground">
                  {justFilled ? "It filled up just now — you weren't added." : "No spots left."}
                </p>
                <a
                  href={nudgeHostHref}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="nudge-host-button"
                  className={cn(buttonVariants(), "ml-auto rounded-full font-semibold")}
                >
                  <MessageCircle className="size-4" /> Nudge host via WhatsApp
                </a>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-2xl border-2 border-[#92400E]/20 bg-[#FEF3C7] px-4 py-2">
                  <Checkbox
                    id="cfc"
                    data-testid="rsvp-from-college-toggle"
                    checked={fromCollege}
                    onCheckedChange={(v) => setFromCollege(v === true)}
                  />
                  <Label htmlFor="cfc" className="text-sm font-semibold text-[#78350F]">
                    🚌 Coming from college
                  </Label>
                </div>
                <Button
                  size="lg"
                  data-testid="rsvp-join-button"
                  disabled={join.isPending}
                  onClick={() => join.mutate()}
                  className="rounded-full font-semibold active:scale-95"
                >
                  {join.isPending ? "Joining…" : "Going"}
                </Button>
                <span className="font-mono text-xs text-muted-foreground">{g.cap - g.going.length} spots left</span>
              </div>
            )}
          </section>

          {/* Attendees */}
          <section className="mt-6">
            <h2 className="font-heading text-2xl font-black tracking-tight">
              Who&rsquo;s going{" "}
              <span data-testid="attendee-count" className="text-muted-foreground">
                ({capLabel(g)})
              </span>
            </h2>
            {g.going.length === 0 ? (
              <p data-testid="attendees-empty" className="mt-3 text-sm text-muted-foreground">
                Nobody yet. Be the first name on this list.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="attendee-list">
                {[...g.going]
                  .sort((a, b) => {
                    const diff = shared(b.interests).length - shared(a.interests).length;
                    return diff !== 0 ? diff : a.name.localeCompare(b.name);
                  })
                  .map((a) => {
                    const common = persona && a.personId !== persona.id ? shared(a.interests) : [];
                    return (
                      <li
                        key={a.personId}
                        data-testid={`attendee-${a.personId}`}
                        className={cn(
                          "flex items-start gap-3 rounded-2xl border-2 bg-card p-3",
                          common.length > 0 ? "border-primary/60" : "border-border",
                        )}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-foreground bg-secondary font-mono text-xs font-semibold">
                          {initials(a.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-heading font-bold">
                            {a.name}
                            {a.personId === g.hostId && (
                              <span className="ml-2 font-mono text-[10px] font-semibold uppercase text-primary">host</span>
                            )}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            <span className="rounded-full bg-[#F3E8FF] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#581C87]">
                              {a.batch}
                            </span>
                            {a.comingFromCollege && (
                              <span
                                data-testid={`attendee-from-college-${a.personId}`}
                                className="rounded-full bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#78350F]"
                              >
                                🚌 from college
                              </span>
                            )}
                          </span>
                          {common.length > 0 && (
                            <span data-testid={`shared-interests-${a.personId}`} className="mt-2 flex flex-wrap items-center gap-1">
                              <span className="font-mono text-[10px] font-semibold uppercase text-primary">you both like</span>
                              {common.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#7C2D12]"
                                >
                                  #{prettyTag(t)}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </section>

          {isHost && (
            <EditDialog
              key={`${g.id}-${editOpen ? "open" : "closed"}`}
              g={g}
              open={editOpen}
              onOpenChange={setEditOpen}
              rooms={rooms.isError ? [] : (rooms.data ?? [])}
              clubs={(clubs.isError ? [] : (clubs.data ?? [])).filter((c) => (persona?.clubIds ?? []).includes(c.id))}
              pending={edit.isPending}
              onSave={(body) => edit.mutate({ ...body, hostId: persona?.id ?? "" })}
            />
          )}

          <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
            <DialogContent data-testid="cancel-dialog">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl font-black">Take this down?</DialogTitle>
                <DialogDescription>
                  It leaves the board and nobody new can join. It isn&rsquo;t deleted — it stays in your plans marked &ldquo;Taken down&rdquo;.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="rounded-full" onClick={() => setCancelOpen(false)} data-testid="cancel-dialog-keep">
                  Keep it up
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                  data-testid="cancel-dialog-confirm"
                >
                  {cancel.isPending ? "Taking down…" : "Take it down"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Shell>
  );
}

function EditDialog({
  g,
  open,
  onOpenChange,
  rooms,
  clubs,
  pending,
  onSave,
}: {
  g: Gathering;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rooms: Room[];
  clubs: Club[];
  pending: boolean;
  onSave: (body: Omit<GatheringUpdate, "hostId">) => void;
}) {
  const [title, setTitle] = useState(g.title);
  const [hook, setHook] = useState(g.hook);
  const [place, setPlace] = useState(g.place);
  const [startsAt, setStartsAt] = useState(toLocalInput(g.startsAt));
  const [cap, setCap] = useState(String(g.cap));
  const [roomId, setRoomId] = useState(g.roomId ?? NONE);
  const [clubId, setClubId] = useState(g.hostClubId ?? NONE);

  function save() {
    const capNum = Number(cap);
    if (!Number.isInteger(capNum) || capNum < 2) {
      toast.error("Cap needs to be a whole number, at least 2.");
      return;
    }
    onSave({
      title: title.trim(),
      hook: hook.trim(),
      place: place.trim(),
      cap: capNum,
      roomId: roomId === NONE ? null : roomId,
      hostClubId: clubId === NONE ? null : clubId,
      ...(g.kind !== "lunch" && startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="edit-dialog" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black">Edit gathering</DialogTitle>
          <DialogDescription>Only you (the host) can change these.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" data-testid="edit-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-2xl border-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-hook">Hook</Label>
            <Textarea id="e-hook" data-testid="edit-hook-input" value={hook} onChange={(e) => setHook(e.target.value)} className="rounded-2xl border-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-place">Where</Label>
              <Input id="e-place" data-testid="edit-place-input" value={place} onChange={(e) => setPlace(e.target.value)} className="rounded-2xl border-2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-cap">Cap</Label>
              <Input id="e-cap" type="number" min={2} step={1} data-testid="edit-cap-input" value={cap} onChange={(e) => setCap(e.target.value)} className="rounded-2xl border-2" />
            </div>
          </div>
          {g.kind !== "lunch" && (
            <div className="space-y-1.5">
              <Label htmlFor="e-when">When</Label>
              <Input id="e-when" type="datetime-local" data-testid="edit-datetime-input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-2xl border-2" />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={(v: string) => setRoomId(v)}>
                <SelectTrigger data-testid="edit-room-select" className="w-full rounded-2xl border-2">
                  <SelectValue>{(v) => (v === NONE ? "No room" : rooms.find((r) => r.id === v)?.label ?? "Room")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No room</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Post as</Label>
              <Select value={clubId} onValueChange={(v: string) => setClubId(v)}>
                <SelectTrigger data-testid="edit-club-select" className="w-full rounded-2xl border-2">
                  <SelectValue>{(v) => (v === NONE ? "Just me" : clubs.find((c) => c.id === v)?.label ?? "Club")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Just me</SelectItem>
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} data-testid="edit-dialog-cancel">
            Never mind
          </Button>
          <Button className="rounded-full" disabled={pending} onClick={save} data-testid="edit-dialog-save">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
