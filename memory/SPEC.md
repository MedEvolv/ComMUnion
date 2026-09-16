# Not Your Flat Group — spec

Get-together finder for Masters' Union UG/PG students: post and join parties, events and
get-togethers, flag "coming from college", and keep a tagged personal hub.

## Auth
No real auth. Demo personas: user picks one of 30 seeded classmates on `/sign-in`; the
chosen `Person` is stored in `localStorage` under `mu-hangs-persona` and read via
`src/lib/persona.ts`. `personId` is passed explicitly in request bodies/paths.

## Data model (backend/models/core.py — camelCase, mirrored in frontend/src/lib/types.ts)
- `Person` — id, name, batch (`UG '24|'25|'26`, `PG '24|'25|'26`), housing
- `Profile` — personId, bio, interests[], lookingFor[], lastIngestText
- `Gathering` — id, title, hook, kind (party|event|get-together), startsAt, place, hostId,
  hostName, comingFromCollege, createdAt, going[] (hydrated from rsvps)
- `RSVP` — id, gatheringId, personId, comingFromCollege, createdAt (unique per pair)

## API (all on api_router, prefix /api)
- GET `/people`, GET `/people/{id}`, GET `/vocab`
- GET `/profiles/{person_id}`, PUT `/profiles/{person_id}`
- POST `/profiles/{person_id}/ingest` — keyword tag extraction; 422 when no tags match
- GET `/gatherings?kind=all|party|event|get-together&upcoming=true|false`
- POST `/gatherings` (201), GET `/gatherings/{id}`
- POST `/gatherings/{id}/rsvp`, DELETE `/gatherings/{id}/rsvp/{person_id}` (400 for host)
- GET `/people/{person_id}/gatherings` → `PersonPlans {hosting[], joined[]}` (joined excludes hosted)
- `Attendee.interests[]` is hydrated from profiles so the detail page can show shared interests

## Feature notes
- **Interest matching**: detail page fetches the active persona's profile and, per attendee,
  shows "you both like #tag" chips; attendees with overlap sort first and get an orange border.
- **My plans**: `/profile` has tabs "My hub" / "My plans" (Hosting + Joined lists).
- **Last-minute board**: feed splits gatherings starting within 3h (`isStartingSoon`) into a
  dark highlighted strip at the top with a countdown badge; seed adds two such hangs
  (re-run `python seed.py` to refresh their times).

## Screens
`/` feed + kind filters + upcoming-only · `/sign-in` roster · `/create` form + live preview ·
`/gatherings/:id` detail + join/leave · `/profile` bio, multi-select tags, paste-to-tag

## Seed (backend/seed.py, idempotent)
30 people across 6 batches, 6 gatherings (all in the future), 5 RSVPs each.
