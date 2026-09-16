import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import Shell from "@/components/Shell";
import GatheringCard from "@/components/GatheringCard";
import EmptyState, { LoadingCards } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { KINDS, KIND_META } from "@/lib/kinds";
import type { Gathering, Kind } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function Home() {
  const { persona } = usePersona();
  const [kind, setKind] = useState<Kind | "all">("all");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["gatherings", kind, upcomingOnly],
    queryFn: () => apiGet<Gathering[]>(`/gatherings?kind=${kind}&upcoming=${upcomingOnly}`),
  });

  const gatherings = useMemo(() => (isError ? [] : (data ?? [])), [data, isError]);

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
          Throw a party, post an event, or just say you&rsquo;re getting chai. Say if you&rsquo;re
          rolling straight from college — someone will come with you.
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

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="filter-all"
          onClick={() => setKind("all")}
          className={cn(
            "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors",
            kind === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Everything
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            data-testid={`filter-${k}`}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors",
              kind === k
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {KIND_META[k].emoji} {KIND_META[k].label}
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

      <div className="mt-6">
        {isLoading ? (
          <LoadingCards />
        ) : isError ? (
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
              onClick={() => void refetch()}
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
          <div className="grid gap-5 sm:grid-cols-2" data-testid="gathering-list">
            {gatherings.map((g) => (
              <GatheringCard
                key={g.id}
                gathering={g}
                youAreGoing={!!persona && g.going.some((a) => a.personId === persona.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
