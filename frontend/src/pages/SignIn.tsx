import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Shell from "@/components/Shell";
import { LoadingCards } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { initials } from "@/lib/kinds";
import type { Person } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SignIn() {
  const navigate = useNavigate();
  const { persona, setPersona } = usePersona();
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["people"],
    queryFn: () => apiGet<Person[]>("/people"),
  });

  const people = isError ? [] : (data ?? []);
  const batches = useMemo(
    () => Array.from(new Set(people.map((p) => p.batch))).sort(),
    [people],
  );
  const filtered = people.filter(
    (p) =>
      (batch === "all" || p.batch === batch) &&
      p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  function pick(p: Person) {
    setPersona(p);
    toast.success(`You're browsing as ${p.name}`);
    navigate("/");
  }

  return (
    <Shell>
      <h1 className="font-heading text-4xl font-black tracking-tight">Who are you today?</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Demo sign-in — no campus mail, no OTP. Pick a classmate and the whole board switches to
        their point of view.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Input
          data-testid="person-search-input"
          placeholder="Search a name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-10 w-full max-w-xs rounded-full border-2"
        />
        <button
          type="button"
          data-testid="batch-filter-all"
          onClick={() => setBatch("all")}
          className={cn(
            "rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-colors",
            batch === "all"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          All batches
        </button>
        {batches.map((b) => (
          <button
            key={b}
            type="button"
            data-testid={`batch-filter-${b.replace(/[^a-zA-Z0-9]/g, "")}`}
            onClick={() => setBatch(b)}
            className={cn(
              "rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold transition-colors",
              batch === b
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <LoadingCards count={6} />
        ) : isError ? (
          <p data-testid="people-error" className="text-sm text-destructive">
            Couldn&rsquo;t load the roster right now.
          </p>
        ) : filtered.length === 0 ? (
          <p data-testid="people-empty" className="text-sm text-muted-foreground">
            No classmate matches that.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="people-list">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`demo-user-card-${p.id}`}
                onClick={() => pick(p)}
                className={cn(
                  "animate-pop-in flex items-center gap-3 rounded-3xl border-2 bg-card p-4 text-left transition-transform duration-200 hover:-translate-y-1 active:scale-95",
                  persona?.id === p.id ? "border-primary" : "border-border",
                )}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-foreground bg-secondary font-mono text-sm font-semibold">
                  {initials(p.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-heading text-base font-bold">{p.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-[#F3E8FF] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#581C87]">
                      {p.programme} · {p.batch}
                    </span>
                    {p.cohort && (
                      <span className="rounded-full bg-[#DBEEFB] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#0369A1]">
                        {p.cohort}
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {p.housing}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
