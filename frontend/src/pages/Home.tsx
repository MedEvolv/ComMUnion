import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Utensils } from "lucide-react";
import Shell from "@/components/Shell";
import GatheringCard from "@/components/GatheringCard";
import EmptyState, { LoadingCards } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { FEED_CHIPS, isStartingSoon } from "@/lib/kinds";
import type { Gathering } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type BatchScope = "mine" | "PG" | "UG" | "all";

function chipClass(active: boolean) {
  return cn(
    "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-card text-muted-foreground hover:text-foreground",
  );
}

export default function Home() {
  const { persona } = usePersona();
  const [kind, setKind] = useState("all");
  const [scope, setScope] = useState<BatchScope>("all");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const params = new URLSearchParams({ kind, upcoming: String(upcomingOnly) });
  if (scope === "mine" && persona) params.set("batch", persona.batch);
  if (scope === "PG" || scope === "UG") params.set("programme", scope);

  const feed = useQuery({
    queryKey: ["gatherings", params.toString()],
    queryFn: () => apiGet<Gathering[]>(`/gatherings?${params.toString()}`),
  });
  const lunch = useQuery({
    queryKey: ["lunch-today"],
    queryFn: () => apiGet<Gathering[]>("/gatherings/lunch-today"),
  });

  const gatherings = useMemo(() => (feed.isError ? [] : (feed.data ?? [])), [feed.data, feed.isError]);
  const soon = useMemo(() => gatherings.filter((g) => isStartingSoon(g.startsAt) && g.kind !== "lunch"), [gatherings]);
  const later = useMemo(() => gatherings.filter((g) => !soon.includes(g)), [gatherings, soon]);
  const lunches = lunch.isError ? [] : (lunch.data ?? []);
  const going = (g: Gathering) => !!persona && g.going.some((a) => a.personId === persona.id);

  const scopes: { value: BatchScope; label: string; disabled?: boolean }[] = [
    { value: "mine", label: persona ? `My batch · ${persona.batch}` : "My batch", disabled: !persona },
    { value: "PG", label: "Just PG" },
    { value: "UG", label: "Just UG" },
    { value: "all", label: "All" },
  ];

  return (
    <Shell>
      <section className="animate-pop-in rounded-[2rem] border-2 border-foreground bg-secondary p-6 shadow-[5px_6px_0_0_rgba(30,32,34,0.18)] sm:p-9">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-background px-3 py-1 font-mono text-[11px] font-semibold">
          <Sparkles className="size-3" /> Masters&rsquo; Union · UG + PG
        </span>
        <h1 className="mt-4 max-w-2xl font-heading text-4xl font-black leading-[1.05] tracking-tight text-[#431407] sm:text-5xl">
          Plans that aren&rsquo;t the three people in your flat WhatsApp.
        </h1>
        <p className="mt-3 max-w-xl text-[#7C2D12]">
          Throw a party, book a cowork room, or grab the lunch slot. Say if you&rsquo;re rolling
          straight from college — someone will come with you.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/create"
            data-testid="hero-create-button"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full font-semibold active:scale-95")}
          >
            Throw a gathering
          </Link>
          <Link
            to="/sign-in"
            data-testid="hero-signin-button"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "rounded-full border-2 border-foreground bg-background font-semibold",
            )}
          >
            {persona ? `Switch from ${persona.name.split(" ")[0]}` : "Pick your classmate"}
          </Link>
        </div>
      </section>

      {/* Today's lunch board — the campus daily slot */}
      <section className="mt-8" data-testid="lunch-board">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-heading text-2xl font-black tracking-tight">
            <Utensils className="mr-2 inline size-5 text-primary" />
            Today&rsquo;s lunch board
          </h2>
          <p className="font-mono text-xs text-muted-foreground">lunch slot TBD from campus</p>
          <Link
            to="/create?kind=lunch"
            data-testid="lunch-post-link"
            className="ml-auto text-sm font-semibold text-primary hover:underline"
          >
            Post today&rsquo;s lunch →
          </Link>
        </div>
        <div className="mt-4">
          {lunch.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2" data-testid="lunch-loading">
              <div className="h-40 animate-pulse rounded-3xl border-2 border-border bg-muted" />
              <div className="h-40 animate-pulse rounded-3xl border-2 border-border bg-muted" />
            </div>
          ) : lunches.length === 0 ? (
            <div
              data-testid="lunch-empty"
              className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-dashed border-foreground/20 bg-[#FEFCE8] px-6 py-6"
            >
              <span className="text-3xl">🍽️</span>
              <div className="flex-1">
                <p className="font-heading text-lg font-black">No lunches today — quiet table.</p>
                <p className="text-sm text-muted-foreground">
                  Nobody&rsquo;s claimed the slot yet. Post one and let the canteen crowd find you.
                </p>
              </div>
              <Link
                to="/create?kind=lunch"
                data-testid="lunch-empty-cta"
                className={cn(buttonVariants({ size: "sm" }), "rounded-full font-semibold")}
              >
                Post today&rsquo;s lunch
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2" data-testid="lunch-list">
              {lunches.map((g) => (
                <GatheringCard key={g.id} gathering={g} youAreGoing={going(g)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="mt-10 space-y-3">
        <div className="flex flex-wrap items-center gap-2" data-testid="batch-filter">
          <span className="mr-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Whose hangs
          </span>
          {scopes.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={s.disabled}
              data-testid={`batch-scope-${s.value}`}
              onClick={() => setScope(s.value)}
              className={cn(chipClass(scope === s.value), "disabled:opacity-40")}
              title={s.disabled ? "Pick a classmate to use My batch" : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FEED_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              data-testid={`filter-${c.value}`}
              onClick={() => setKind(c.value)}
              className={chipClass(kind === c.value)}
            >
              {c.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-1.5">
            <Checkbox
              id="upcoming-only"
              data-testid="filter-upcoming-only"
              checked={upcomingOnly}
              onCheckedChange={(v) => setUpcomingOnly(v === true)}
            />
            <Label htmlFor="upcoming-only" className="text-sm font-semibold">
              Upcoming only
            </Label>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {feed.isLoading ? (
          <LoadingCards />
        ) : feed.isError ? (
          <div
            data-testid="feed-error"
            className="rounded-3xl border-2 border-destructive/30 bg-card p-8 text-center"
          >
            <h3 className="font-heading text-xl font-black">Feed didn&rsquo;t load</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The board is offline right now. Everything else still works.
            </p>
            <button
              type="button"
              data-testid="feed-retry-button"
              onClick={() => void feed.refetch()}
              className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-full")}
            >
              Try again
            </button>
          </div>
        ) : gatherings.length === 0 ? (
          <EmptyState
            testid="feed-empty"
            title="Nothing on the board yet"
            body="No get-togethers match this filter. Be the person who posts first — it's how every good night starts."
            ctaLabel="Throw a gathering"
            ctaTo="/create"
          />
        ) : (
          <div className="space-y-8">
            {soon.length > 0 && (
              <section
                data-testid="last-minute-board"
                className="animate-pop-in rounded-[2rem] border-2 border-foreground bg-foreground p-5 text-background shadow-[5px_6px_0_0_rgba(240,90,40,0.6)] sm:p-6"
              >
                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-heading text-2xl font-black tracking-tight">⚡ Last-minute board</h2>
                  <p className="text-sm text-background/70">Kicking off in the next three hours.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {soon.map((g) => (
                    <GatheringCard key={g.id} gathering={g} youAreGoing={going(g)} />
                  ))}
                </div>
              </section>
            )}
            {later.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2" data-testid="gathering-list">
                {later.map((g) => (
                  <GatheringCard key={g.id} gathering={g} youAreGoing={going(g)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
