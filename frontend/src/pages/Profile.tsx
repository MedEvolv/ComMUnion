import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Shell from "@/components/Shell";
import GatheringCard from "@/components/GatheringCard";
import EmptyState, { LoadingCards } from "@/components/EmptyState";
import { apiGet, apiPost, apiPut, ApiError } from "@/lib/api";
import { usePersona } from "@/lib/persona";
import { initials, prettyTag } from "@/lib/kinds";
import type { IngestResult, PersonPlans, Profile as ProfileT, Vocab } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function errText(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
  }
  return fallback;
}

export default function Profile() {
  const { persona } = usePersona();
  const qc = useQueryClient();
  const pid = persona?.id ?? "";

  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [ingestText, setIngestText] = useState("");

  const vocabQ = useQuery({ queryKey: ["vocab"], queryFn: () => apiGet<Vocab>("/vocab") });
  const profileQ = useQuery({
    queryKey: ["profile", pid],
    queryFn: () => apiGet<ProfileT>(`/profiles/${pid}`),
    enabled: !!pid,
  });
  const plansQ = useQuery({
    queryKey: ["plans", pid],
    queryFn: () => apiGet<PersonPlans>(`/people/${pid}/gatherings`),
    enabled: !!pid,
  });

  useEffect(() => {
    if (profileQ.data) {
      setBio(profileQ.data.bio);
      setInterests(profileQ.data.interests);
      setLookingFor(profileQ.data.lookingFor);
    }
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: () => apiPut<ProfileT>(`/profiles/${pid}`, { bio, interests, lookingFor }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", pid] });
      toast.success("Profile saved");
    },
    onError: (e) => toast.error("Save failed", { description: errText(e, "Try again.") }),
  });

  const ingest = useMutation({
    mutationFn: () => apiPost<IngestResult>(`/profiles/${pid}/ingest`, { text: ingestText }),
    onSuccess: (r) => {
      setInterests(r.interests);
      setLookingFor(r.lookingFor);
      void qc.invalidateQueries({ queryKey: ["profile", pid] });
      toast.success(`Found ${r.matched} tag${r.matched === 1 ? "" : "s"} in that`);
    },
    onError: (e) =>
      toast.error("No tags found", {
        description: errText(e, "Try mentioning padel, techno, startups, or a gym buddy."),
      }),
  });

  const vocab = vocabQ.data ?? { interests: [], lookingFor: [] };

  function toggle(list: string[], set: (v: string[]) => void, tag: string) {
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag].sort());
  }

  if (!persona) {
    return (
      <Shell>
        <div
          data-testid="profile-needs-persona"
          className="rounded-3xl border-2 border-dashed border-foreground/20 bg-card px-6 py-16 text-center"
        >
          <h1 className="font-heading text-3xl font-black tracking-tight">No classmate picked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your hub lives on a demo persona. Pick one to get started.
          </p>
          <Link
            to="/sign-in"
            data-testid="profile-signin-link"
            className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full font-semibold")}
          >
            Pick a classmate
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl border-2 border-foreground bg-secondary font-mono text-base font-semibold">
          {initials(persona.name)}
        </span>
        <div>
          <h1 data-testid="profile-name" className="font-heading text-3xl font-black tracking-tight">
            {persona.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {persona.batch} · {persona.housing}
          </p>
        </div>
      </div>

      <Tabs defaultValue="hub" className="mt-8">
        <TabsList variant="line" data-testid="profile-tabs">
          <TabsTrigger value="hub" data-testid="tab-hub" className="font-semibold">
            My hub
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans" className="font-semibold">
            My plans
            {plansQ.data && (
              <span className="ml-1.5 rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background">
                {plansQ.data.hosting.length + plansQ.data.joined.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-6" data-testid="plans-panel">
          {plansQ.isLoading ? (
            <LoadingCards count={2} />
          ) : plansQ.isError ? (
            <p data-testid="plans-error" className="text-sm text-destructive">
              Couldn&rsquo;t load your plans right now.
            </p>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black tracking-tight">
                  Hosting{" "}
                  <span className="text-muted-foreground" data-testid="hosting-count">
                    ({plansQ.data?.hosting.length ?? 0})
                  </span>
                </h2>
                {(plansQ.data?.hosting.length ?? 0) === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      testid="hosting-empty"
                      title="You haven't thrown anything yet"
                      body="Post a hang and it'll show up here with everyone who joins."
                      ctaLabel="Throw a gathering"
                      ctaTo="/create"
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2" data-testid="hosting-list">
                    {plansQ.data?.hosting.map((g) => (
                      <GatheringCard key={g.id} gathering={g} youAreGoing={false} />
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h2 className="font-heading text-2xl font-black tracking-tight">
                  Joined{" "}
                  <span className="text-muted-foreground" data-testid="joined-count">
                    ({plansQ.data?.joined.length ?? 0})
                  </span>
                </h2>
                {(plansQ.data?.joined.length ?? 0) === 0 ? (
                  <div className="mt-3">
                    <EmptyState
                      testid="joined-empty"
                      title="Nothing joined yet"
                      body="Find a hang on the board and tap 'I'm in'."
                      ctaLabel="Browse the board"
                      ctaTo="/"
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2" data-testid="joined-list">
                    {plansQ.data?.joined.map((g) => (
                      <GatheringCard key={g.id} gathering={g} youAreGoing />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hub" className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-6 rounded-3xl border-2 border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              data-testid="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Two lines about you and what you're usually up to."
              className="min-h-24 rounded-2xl border-2"
            />
          </div>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Interests
            </p>
            <div className="mt-3 flex flex-wrap gap-2" data-testid="interest-options">
              {vocab.interests.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-testid={`interest-${t}`}
                  aria-pressed={interests.includes(t)}
                  onClick={() => toggle(interests, setInterests, t)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors",
                    interests.includes(t)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  #{prettyTag(t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Looking for
            </p>
            <div className="mt-3 flex flex-wrap gap-2" data-testid="lookingfor-options">
              {vocab.lookingFor.map((t) => (
                <button
                  key={t}
                  type="button"
                  data-testid={`lookingfor-${t}`}
                  aria-pressed={lookingFor.includes(t)}
                  onClick={() => toggle(lookingFor, setLookingFor, t)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors",
                    lookingFor.includes(t)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {prettyTag(t)}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            data-testid="profile-save-button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="w-full rounded-full font-semibold active:scale-95"
          >
            {save.isPending ? "Saving…" : "Save my hub"}
          </Button>
        </section>

        <aside className="space-y-4 rounded-3xl border-2 border-foreground bg-secondary p-6">
          <h2 className="font-heading text-xl font-black tracking-tight text-[#431407]">
            Paste-to-tag
          </h2>
          <p className="text-sm text-[#7C2D12]">
            Paste your WhatsApp intro, LinkedIn blurb or a note to yourself. We&rsquo;ll pull the
            tags out.
          </p>
          <Textarea
            data-testid="ingest-textarea"
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            placeholder="Hey! I'm into padel and techno, building a fintech side project, looking for a gym buddy."
            className="min-h-28 rounded-2xl border-2 bg-background"
          />
          <Button
            data-testid="ingest-extract-button"
            disabled={ingest.isPending}
            onClick={() => ingest.mutate()}
            className="w-full rounded-full font-semibold active:scale-95"
          >
            {ingest.isPending ? "Reading…" : "Extract tags"}
          </Button>

          {profileQ.data?.lastIngestText && (
            <p
              data-testid="last-ingest-text"
              className="rounded-2xl bg-background/70 p-3 font-mono text-[11px] text-[#7C2D12]"
            >
              Last ingest: {profileQ.data.lastIngestText.slice(0, 120)}
            </p>
          )}
        </aside>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
