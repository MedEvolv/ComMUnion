# Not Your Flat Group — spec

Get-together finder for Masters' Union UG/PG students: post and join parties, events,
get-togethers, lunches and cowork-room hangs; flag "coming from college"; keep a tagged hub.

## Auth
No real auth. Demo personas: pick one of 30 seeded classmates on `/sign-in`; the `Person`
is stored in `localStorage` (`mu-hangs-persona`) via `src/lib/persona.ts`. `personId`/`hostId`
travel explicitly in request bodies/paths. Re-pick a classmate if the stored persona predates
the programme/clubIds fields.

## Data model (backend/models/core.py ↔ frontend/src/lib/types.ts, camelCase)
- `Person` — id, name, batch (`UG '24..'26`, `PG '24..'26`), housing, programme UG|PG,
  cohort AI|Sustainability|null (mapped subset: Aarav→AI, Ananya→Sustainability, +4), clubIds[]
- `Room` — 10 static rooms (`lib/campus.py`), label "TBD from campus N", capacity 3–10, layout TBD
- `Club` — 5 static records, label "TBD from campus (...)", kind club|fraternity
- `Profile` — personId, bio, interests[], lookingFor[] (hang types only: house-party,
  quiet-dinner, study-adjacent-hang, club-night, sports, coffee, group-lunch), lastIngestText
- `Gathering` — id, title, hook, kind party|event|get-together|lunch|cowork, startsAt, slotDate,
  place, hostId/hostName/hostBatch/hostProgramme, comingFromCollege, cap (≥2), status
  open|full|cancelled, roomId/roomLabel?, hostClubId/hostClubLabel?, going[] (Attendee incl. interests)
- `RSVP` — unique (gatheringId, personId), comingFromCollege

## API (api_router, prefix /api)
- GET `/people`, `/people/{id}`, `/people/{id}/matches` (shared-interest classmates),
  `/people/{id}/gatherings` → `{hosting, joined}`
- GET `/rooms`, `/clubs`, `/vocab`
- GET/PUT `/profiles/{id}`; POST `/profiles/{id}/ingest` → **suggestions only** (never
  commits; garbage → matched 0, 200)
- GET `/gatherings?kind=all|party|event|get-together|lunch|cowork|room|club|other&upcoming=&batch=&programme=UG|PG`
  (cancelled excluded), GET `/gatherings/lunch-today` (kind lunch, slotDate == server today)
- POST `/gatherings` (201; 409 if room already on another open hang that slotDate)
- PATCH `/gatherings/{id}` (host only via body.hostId; 403 otherwise; cap can't drop below goers)
- POST `/gatherings/{id}/cancel` → status cancelled ("Taken down", not deleted)
- POST `/gatherings/{id}/rsvp` → 409 "Full" when at cap (not added); DELETE `/gatherings/{id}/rsvp/{pid}`

## Screens
- `/` hero → **Today's lunch board** (empty: "No lunches today — quiet table" + Post today's lunch;
  copy "lunch slot TBD from campus") → batch filter (My batch / Just PG / Just UG / All) → kind
  chips (Everything, Lunch, Room hangs, Club hangs, Party, Event, Get-Together, Other) →
  ⚡ last-minute board (<3h) → feed. Cards show `n/cap`, Full badge, room + club chips.
- `/create` kinds ×5, cap, optional room picker, optional "post as" club (only user's clubs),
  lunch hides the time and posts to today's slot. `?kind=lunch` preselects.
- `/gatherings/:id` status pill, cap "6/8", Going (blocked when Full → "Nudge host via WhatsApp"
  wa.me placeholder), host-only Edit dialog + Cancel ("Taken down"), host "Nudge a classmate",
  shared-interest chips on attendees.
- `/profile` header shows programme/cohort/club chips; tabs My hub (bio, interests, looking-for hang
  types, paste-to-tag with separate **Suggested** chips → tap/Add all → Save) · My plans · Nudge a
  classmate (pick a shared-interest match + a hang you host → WhatsApp draft link).

## Nudge
Always a WhatsApp draft: `https://wa.me/91XXXXXXXXXX?text=...`. No chat rows.

## Seed (backend/seed.py, idempotent)
30 people; 11 gatherings incl. 2 lunches today, "Biryani Crawl" Full at 5/5, room hangs
(room-1/3/7), club hangs (club-1, club-2, frat-1), 2 last-minute hangs. Re-run to refresh times.
