import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bus, CalendarDays, MapPin } from "lucide-react";
import Shell from "@/components/Shell";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { KIND_META, formatWhen, initials, prettyTag } from "@/lib/kinds";
import type { DeleteResult, Gathering, Profile } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState } from "react";

function errText(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
  }
  return fallback;
}

export default function GatheringDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { persona } = usePersona();
  const [fromCollege, setFromCollege] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gathering", id],
    queryFn: () => apiGet<Gathering>(`/gatherings/${id}`),
    enabled: !!id,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["gathering", id] });
    void qc.invalidateQueries({ queryKey: ["gatherings"] });
    void qc.invalidateQueries({ queryKey: ["plans"] });
  };

  const myProfile = useQuery({
    queryKey: ["profile", persona?.id ?? ""],
    queryFn: () => apiGet<Profile>(`/profiles/${persona?.id ?? ""}`),
    enabled: !!persona,
  });
  const myInterests = new Set(myProfile.data?.interests ?? []);
  const shared = (interests: string[]) => interests.filter((t) => myInterests.has(t));

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
    onError: (e) => toast.error("Join failed", { description: errText(e, "Try again in a sec.") }),
  });

  const leave = useMutation({
    mutationFn: () => apiDelete<DeleteResult>(`/gatherings/${id}/rsvp/${persona?.id ?? ""}`),
    onSuccess: () => {
      invalidate();
      toast("Taken off the list.");
    },
    onError: (e) => toast.error("Couldn't leave", { description: errText(e, "Try again.") }),
  });

  const g = isError ? undefined : data;
  const mine = !!persona && !!g && g.going.some((a) => a.personId === persona.id);
  const isHost = !!persona && g?.hostId === persona.id;
  const meta = g ? KIND_META[g.kind] : KIND_META.party;

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
        <div
          data-testid="detail-loading"
          className="mt-5 h-64 animate-pulse rounded-3xl border-2 border-border bg-muted"
        />
      )}

      {isError && (
        <div
          data-testid="detail-error"
          className="mt-5 rounded-3xl border-2 border-destructive/30 bg-card p-8 text-center"
        >
          <h2 className="font-heading text-xl font-black">We couldn&rsquo;t open this one</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have been taken down, or the board is offline.
          </p>
          <Link to="/" className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}>
            Back to the board
          </Link>
        </div>
      )}

      {g && (
        <>
          <section
            data-testid="gathering-detail"
            className={cn(
              "animate-pop-in mt-5 rounded-[2rem] border-2 p-6 shadow-[5px_6px_0_0_rgba(30,32,34,0.14)] sm:p-8",
              meta.card,
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
                  meta.chip,
                )}
              >
                {meta.emoji} {meta.label}
              </span>
              {g.comingFromCollege && (
                <span className="rounded-full border border-[#92400E]/25 bg-[#FEF3C7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#78350F]">
                  <Bus className="mr-1 inline size-3" /> Host comes from college
                </span>
              )}
            </div>

            <h1
              data-testid="detail-title"
              className="mt-3 font-heading text-4xl font-black leading-[1.05] tracking-tight"
            >
              {g.title}
            </h1>
            <p className="mt-2 max-w-2xl text-base opacity-90">{g.hook}</p>

            <div className="mt-5 grid gap-2 text-sm font-medium sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 opacity-70" />
                <span data-testid="detail-when">{formatWhen(g.startsAt)}</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-4 opacity-70" />
                <span data-testid="detail-place">{g.place}</span>
              </p>
            </div>

            <p className="mt-5 text-sm font-semibold" data-testid="detail-host">
              Hosted by {g.hostName}
            </p>
          </section>

          <section className="mt-6 rounded-3xl border-2 border-border bg-card p-6">
            {!persona ? (
              <div data-testid="detail-needs-persona">
                <p className="font-semibold">Pick a classmate to RSVP.</p>
                <Link
                  to="/sign-in"
                  className={cn(buttonVariants({ size: "sm" }), "mt-3 rounded-full")}
                >
                  Pick a classmate
                </Link>
              </div>
            ) : isHost ? (
              <p data-testid="detail-host-note" className="text-sm font-semibold">
                You&rsquo;re hosting this one — you&rsquo;re always on the list.
              </p>
            ) : mine ? (
              <div className="flex flex-wrap items-center gap-3">
                <span
                  data-testid="detail-going-badge"
                  className="rounded-full bg-foreground px-3 py-1.5 font-mono text-xs font-semibold text-background"
                >
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
                  {join.isPending ? "Joining…" : "I'm in"}
                </Button>
              </div>
            )}
          </section>

          <section className="mt-6">
            <h2 className="font-heading text-2xl font-black tracking-tight">
              Who&rsquo;s going{" "}
              <span data-testid="attendee-count" className="text-muted-foreground">
                ({g.going.length})
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
                          <span className="ml-2 font-mono text-[10px] font-semibold uppercase text-primary">
                            host
                          </span>
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
                        <span
                          data-testid={`shared-interests-${a.personId}`}
                          className="mt-2 flex flex-wrap items-center gap-1"
                        >
                          <span className="font-mono text-[10px] font-semibold uppercase text-primary">
                            you both like
                          </span>
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
        </>
      )}
    </Shell>
  );
}
