import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageCircle, Plus, Tag } from "lucide-react";
import Shell from "@/components/Shell";
import GatheringCard from "@/components/GatheringCard";
import EmptyState, { LoadingCards } from "@/components/EmptyState";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { errText } from "@/lib/errors";
import { usePersona } from "@/lib/persona";
import { initials, prettyTag, whatsappDraft, formatWhen, capLabel } from "@/lib/kinds";
import type { Club, IngestResult, Match, PersonPlans, Profile as ProfileT, Vocab } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function chip(active: boolean, accent: "dark" | "orange" = "dark") {
  return cn(
    "rounded-full border px-3 py-1 font-mono text-xs font-medium transition-colors",
    active
      ? accent === "dark"
        ? "border-foreground bg-foreground text-background"
        : "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background text-muted-foreground hover:text-foreground",
  );
}

export default function Profile() {
  const { persona } = usePersona();
  const qc = useQueryClient();
  const pid = persona?.id ?? "";

  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [ingestText, setIngestText] = useState("");
  // Suggestions live apart from selected chips until the student confirms each one.
  const [suggested, setSuggested] = useState<IngestResult | null>(null);
  const [nudgeMatch, setNudgeMatch] = useState<string | null>(null);
  const [nudgeHang, setNudgeHang] = useState<string | null>(null);

  const vocabQ = useQuery({ queryKey: ["vocab"], queryFn: () => apiGet<Vocab>("/vocab") });
  const clubsQ = useQuery({ queryKey: ["clubs"], queryFn: () => apiGet<Club[]>("/clubs") });
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
  const matchesQ = useQuery({
    queryKey: ["matches", pid],
    queryFn: () => apiGet<Match[]>(`/people/${pid}/matches`),
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
      void qc.invalidateQueries({ queryKey: ["matches", pid] });
      toast.success("Profile saved");
    },
    onError: (e) => toast.error("Save failed", { description: errText(e, "Try again.") }),
  });

  const ingest = useMutation({
    mutationFn: () => apiPost<IngestResult>(`/profiles/${pid}/ingest`, { text: ingestText }),
    onSuccess: (r) => {
      setSuggested(r);
      void qc.invalidateQueries({ queryKey: ["profile", pid] });
      if (r.matched === 0) {
        toast.error("No tags found in that", {
          description: "Your selected chips are unchanged. Try mentioning padel, techno, lunch, or a house party.",
        });
      } else {
        toast.success(`${r.matched} suggestion${r.matched === 1 ? "" : "s"} — tap to add`);
      }
    },
    onError: (e) => toast.error("Couldn't read that", { description: errText(e, "Paste some text first.") }),
  });

  const vocab = vocabQ.data ?? { interests: [], lookingFor: [] };
  const clubs = clubsQ.isError ? [] : (clubsQ.data ?? []);
  const myClubs = clubs.filter((c) => (persona?.clubIds ?? []).includes(c.id));
  const hosting = (plansQ.data?.hosting ?? []).filter((g) => g.status !== "cancelled");
  const matches = matchesQ.isError ? [] : (matchesQ.data ?? []);

  function toggle(list: string[], set: (v: string[]) => void, tag: string) {
    set(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag].sort());
  }
  function addSuggestion(kind: "interests" | "lookingFor", tag: string) {
    if (kind === "interests") setInterests((l) => (l.includes(tag) ? l : [...l, tag].sort()));
    else setLookingFor((l) => (l.includes(tag) ? l : [...l, tag].sort()));
  }
  function addAll() {
    if (!suggested) return;
    setInterests((l) => Array.from(new Set([...l, ...suggested.interests])).sort());
    setLookingFor((l) => Array.from(new Set([...l, ...suggested.lookingFor])).sort());
    toast("Added — hit Save to keep them.");
  }

  const pendingSuggestions = suggested
    ? [
        ...suggested.interests.filter((t) => !interests.includes(t)).map((t) => ({ kind: "interests" as const, tag: t })),
        ...suggested.lookingFor.filter((t) => !lookingFor.includes(t)).map((t) => ({ kind: "lookingFor" as const, tag: t })),
      ]
    : [];

  const chosenMatch = matches.find((m) => m.person.id === nudgeMatch) ?? null;
  const chosenHang = hosting.find((g) => g.id === nudgeHang) ?? null;
  const nudgeHref =
    chosenMatch && chosenHang && persona
      ? whatsappDraft(
          `Hey ${chosenMatch.person.name.split(" ")[0]}! ${persona.name.split(" ")[0]} here — we both like ${chosenMatch.shared
            .map((t) => "#" + prettyTag(t))
            .join(" ")}. I'm hosting "${chosenHang.title}" ${
            chosenHang.kind === "lunch" ? "at today's lunch slot (TBD from campus)" : formatWhen(chosenHang.startsAt)
          } at ${chosenHang.place}. ${capLabel(chosenHang)} so far. Come through?`,
        )
      : null;

  if (!persona) {
    return (
      <Shell>
        <div data-testid="profile-needs-persona" className="rounded-3xl border-2 border-dashed border-foreground/20 bg-card px-6 py-16 text-center">
          <h1 className="font-heading text-3xl font-black tracking-tight">No classmate picked</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your hub lives on a demo persona. Pick one to get started.</p>
          <Link to="/sign-in" data-testid="profile-signin-link" className={cn(buttonVariants({ size: "lg" }), "mt-6 rounded-full font-semibold")}>
            Pick a classmate
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl border-2 border-foreground bg-secondary font-mono text-base font-semibold">
          {initials(persona.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 data-testid="profile-name" className="font-heading text-3xl font-black tracking-tight">
            {persona.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px] font-semibold">
            <span className="rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[#581C87]" data-testid="profile-batch">
              {persona.programme ?? (persona.batch.startsWith("PG") ? "PG" : "UG")} · {persona.batch}
            </span>
            {persona.cohort && (
              <span className="rounded-full bg-[#DBEEFB] px-2 py-0.5 text-[#0369A1]" data-testid="profile-cohort">
                {persona.cohort} cohort
              </span>
            )}
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{persona.housing}</span>
            {myClubs.map((c) => (
              <span key={c.id} data-testid={`profile-club-${c.id}`} className="rounded-full border border-foreground/20 bg-background px-2 py-0.5">
                <Tag className="mr-1 inline size-3" />
                {c.label} · {c.kind}
              </span>
            ))}
            {myClubs.length === 0 && !clubsQ.isLoading && (
              <span className="rounded-full border border-dashed border-foreground/20 px-2 py-0.5 text-muted-foreground" data-testid="profile-no-club">
                clubs: TBD from campus
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="hub" className="mt-8">
        <TabsList variant="line" data-testid="profile-tabs">
          <TabsTrigger value="hub" data-testid="tab-hub" className="font-semibold">My hub</TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans" className="font-semibold">
            My plans
            {plansQ.data && (
              <span className="ml-1.5 rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background">
                {plansQ.data.hosting.length + plansQ.data.joined.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="nudge" data-testid="tab-nudge" className="font-semibold">Nudge a classmate</TabsTrigger>
        </TabsList>

        {/* ---------- HUB ---------- */}
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
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interests</p>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="interest-options">
                {vocab.interests.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-testid={`interest-${t}`}
                    aria-pressed={interests.includes(t)}
                    onClick={() => toggle(interests, setInterests, t)}
                    className={chip(interests.includes(t))}
                  >
                    #{prettyTag(t)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Looking for <span className="normal-case tracking-normal">· hang types</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2" data-testid="lookingfor-options">
                {vocab.lookingFor.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-testid={`lookingfor-${t}`}
                    aria-pressed={lookingFor.includes(t)}
                    onClick={() => toggle(lookingFor, setLookingFor, t)}
                    className={chip(lookingFor.includes(t), "orange")}
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
            <h2 className="font-heading text-xl font-black tracking-tight text-[#431407]">Paste-to-tag</h2>
            <p className="text-sm text-[#7C2D12]">
              Paste your WhatsApp intro or LinkedIn blurb. We&rsquo;ll <strong>suggest</strong> chips — nothing is added
              until you tap them.
            </p>
            <Textarea
              data-testid="ingest-textarea"
              value={ingestText}
              onChange={(e) => setIngestText(e.target.value)}
              placeholder="Hey! I'm into padel and techno, always up for a house party or a group lunch."
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

            {suggested && (
              <div data-testid="ingest-suggestions" className="rounded-2xl border-2 border-dashed border-foreground/30 bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested · {pendingSuggestions.length}
                  </p>
                  {pendingSuggestions.length > 0 && (
                    <button type="button" data-testid="ingest-add-all" onClick={addAll} className="text-xs font-semibold text-primary hover:underline">
                      Add all
                    </button>
                  )}
                </div>
                {suggested.matched === 0 ? (
                  <p data-testid="ingest-none" className="mt-2 text-sm text-muted-foreground">
                    Zero suggestions from that paste. Your selected chips are untouched.
                  </p>
                ) : pendingSuggestions.length === 0 ? (
                  <p data-testid="ingest-all-added" className="mt-2 text-sm text-muted-foreground">
                    All suggestions are in your selection. Save to keep them.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingSuggestions.map((s) => (
                      <button
                        key={`${s.kind}-${s.tag}`}
                        type="button"
                        data-testid={`suggest-${s.kind}-${s.tag}`}
                        onClick={() => addSuggestion(s.kind, s.tag)}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-primary/60 bg-primary/5 px-3 py-1 font-mono text-xs font-medium text-[#7C2D12] transition-colors hover:bg-primary/15"
                      >
                        <Plus className="size-3" />
                        {s.kind === "interests" ? "#" : ""}
                        {prettyTag(s.tag)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {profileQ.data?.lastIngestText && (
              <p data-testid="last-ingest-text" className="rounded-2xl bg-background/70 p-3 font-mono text-[11px] text-[#7C2D12]">
                Last paste: {profileQ.data.lastIngestText.slice(0, 120)}
              </p>
            )}
          </aside>
        </TabsContent>

        {/* ---------- PLANS ---------- */}
        <TabsContent value="plans" className="mt-6" data-testid="plans-panel">
          {plansQ.isLoading ? (
            <LoadingCards count={2} />
          ) : plansQ.isError ? (
            <p data-testid="plans-error" className="text-sm text-destructive">Couldn&rsquo;t load your plans right now.</p>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="font-heading text-2xl font-black tracking-tight">
                  Hosting <span className="text-muted-foreground" data-testid="hosting-count">({plansQ.data?.hosting.length ?? 0})</span>
                </h2>
                {(plansQ.data?.hosting.length ?? 0) === 0 ? (
                  <div className="mt-3">
                    <EmptyState testid="hosting-empty" title="You haven't thrown anything yet" body="Post a hang and it'll show up here with everyone who joins." ctaLabel="Throw a gathering" ctaTo="/create" />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2" data-testid="hosting-list">
                    {plansQ.data?.hosting.map((g) => <GatheringCard key={g.id} gathering={g} youAreGoing={false} />)}
                  </div>
                )}
              </section>
              <section>
                <h2 className="font-heading text-2xl font-black tracking-tight">
                  Joined <span className="text-muted-foreground" data-testid="joined-count">({plansQ.data?.joined.length ?? 0})</span>
                </h2>
                {(plansQ.data?.joined.length ?? 0) === 0 ? (
                  <div className="mt-3">
                    <EmptyState testid="joined-empty" title="Nothing joined yet" body="Find a hang on the board and tap Going." ctaLabel="Browse the board" ctaTo="/" />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-5 sm:grid-cols-2" data-testid="joined-list">
                    {plansQ.data?.joined.map((g) => <GatheringCard key={g.id} gathering={g} youAreGoing />)}
                  </div>
                )}
              </section>
            </div>
          )}
        </TabsContent>

        {/* ---------- NUDGE ---------- */}
        <TabsContent value="nudge" className="mt-6" data-testid="nudge-panel">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-3xl border-2 border-border bg-card p-6">
              <h2 className="font-heading text-xl font-black tracking-tight">1 · Who shares your interests</h2>
              <p className="mt-1 text-sm text-muted-foreground">Based on the interests saved on your hub.</p>
              {matchesQ.isLoading ? (
                <div className="mt-4 h-24 animate-pulse rounded-2xl bg-muted" />
              ) : matches.length === 0 ? (
                <p data-testid="matches-empty" className="mt-4 text-sm text-muted-foreground">
                  No overlaps yet — pick a few interests on My hub and save.
                </p>
              ) : (
                <ul className="mt-4 grid gap-2" data-testid="matches-list">
                  {matches.map((m) => (
                    <li key={m.person.id}>
                      <button
                        type="button"
                        data-testid={`match-${m.person.id}`}
                        aria-pressed={nudgeMatch === m.person.id}
                        onClick={() => setNudgeMatch(m.person.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors",
                          nudgeMatch === m.person.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40",
                        )}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-foreground bg-secondary font-mono text-[11px] font-semibold">
                          {initials(m.person.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-heading font-bold">{m.person.name}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {m.person.batch} · {m.shared.map((t) => "#" + prettyTag(t)).join(" ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border-2 border-border bg-card p-6">
              <h2 className="font-heading text-xl font-black tracking-tight">2 · Which hang of yours</h2>
              <p className="mt-1 text-sm text-muted-foreground">Only hangs you&rsquo;re hosting and haven&rsquo;t taken down.</p>
              {hosting.length === 0 ? (
                <div className="mt-4">
                  <EmptyState testid="nudge-no-hangs" title="Nothing to invite them to" body="Throw a hang first, then come back and nudge." ctaLabel="Throw a gathering" ctaTo="/create" />
                </div>
              ) : (
                <ul className="mt-4 grid gap-2" data-testid="nudge-hangs-list">
                  {hosting.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        data-testid={`nudge-hang-${g.id}`}
                        aria-pressed={nudgeHang === g.id}
                        onClick={() => setNudgeHang(g.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-2xl border-2 p-3 text-left transition-colors",
                          nudgeHang === g.id ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-heading font-bold">{g.title}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {g.kind === "lunch" ? "today's lunch slot" : formatWhen(g.startsAt)} · {capLabel(g)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 rounded-2xl border-2 border-dashed border-foreground/20 bg-muted/60 p-4">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">3 · Send</p>
                {nudgeHref ? (
                  <a
                    href={nudgeHref}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="nudge-send-button"
                    className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full rounded-full font-semibold")}
                  >
                    <MessageCircle className="size-4" /> Open WhatsApp draft
                  </a>
                ) : (
                  <p data-testid="nudge-incomplete" className="mt-2 text-sm text-muted-foreground">
                    Pick a classmate and a hang to draft the message.
                  </p>
                )}
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Drafts to a placeholder number (91XXXXXXXXXX) — not an in-app chat.
                </p>
              </div>
            </section>
          </div>
        </TabsContent>
      </Tabs>
    </Shell>
  );
}
