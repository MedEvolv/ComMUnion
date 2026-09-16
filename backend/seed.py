"""Idempotent seed: 30 Masters' Union classmates + live gatherings (incl. today's lunch slot).

Run: cd /app/backend && python seed.py
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes

BATCHES = ["UG '24", "UG '25", "UG '26", "PG '24", "PG '25", "PG '26"]
HOUSING = [
    "Cyber City Highs",
    "DLF Phase 2",
    "Golf Course Rd",
    "Campus Residences",
    "Nirvana Country",
    "Sushant Lok",
]

NAMES = [
    "Aarav Mehta", "Ishita Rao", "Kabir Sethi", "Naina Chopra", "Rohan Iyer",
    "Sara Bhatia", "Dhruv Khanna", "Meera Nair", "Arjun Malhotra", "Tara Sinha",
    "Vivaan Joshi", "Ananya Reddy", "Karan Ahuja", "Riya Deshpande", "Nikhil Verma",
    "Saanvi Kulkarni", "Aditya Ghosh", "Diya Fernandes", "Yash Bansal", "Pooja Menon",
    "Raghav Chandra", "Anika Pillai", "Siddharth Bose", "Kritika Jain", "Manav Dutta",
    "Sneha Kapoor", "Aryan Grover", "Tanvi Shetty", "Devansh Rathi", "Isha Sridhar",
]

# Cheap mapped subset — everyone else has no cohort yet.
COHORTS = {
    "Aarav Mehta": "AI",
    "Ananya Reddy": "Sustainability",
    "Rohan Iyer": "AI",
    "Tara Sinha": "Sustainability",
    "Nikhil Verma": "AI",
    "Pooja Menon": "Sustainability",
}

CLUB_IDS = ["club-1", "club-2", "club-3", "frat-1", "frat-2"]

BIOS = [
    "Runs on filter coffee and half-finished pitch decks.",
    "Will absolutely start a board game at 1am.",
    "Padel on weekends, markets on weekdays.",
    "Techno and terrible puns. Mostly the puns.",
    "Trying to make the campus food crawl an official course.",
]

INTERESTS_POOL = [
    ["startups", "coffee", "ai"], ["techno", "poker", "food-crawl"],
    ["padel", "gym", "fintech"], ["board-games", "anime", "cinema"],
    ["music-jam", "photography", "travel"], ["cricket", "football", "standup"],
]
LOOKING_POOL = [
    ["house-party", "coffee"], ["quiet-dinner", "group-lunch"],
    ["study-adjacent-hang", "coffee"], ["sports", "group-lunch"],
    ["club-night", "house-party"], ["quiet-dinner", "sports"],
]


def _pid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mu-person:{name}"))


def _gid(title: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mu-gathering:{title}"))


async def main() -> None:
    people = []
    for i, name in enumerate(NAMES):
        batch = BATCHES[i % 6]
        people.append(
            {
                "id": _pid(name),
                "name": name,
                "batch": batch,
                "housing": HOUSING[(i * 5) % 6],
                "programme": "PG" if batch.startswith("PG") else "UG",
                "cohort": COHORTS.get(name),
                "clubIds": [CLUB_IDS[i % 5]] if i % 3 == 0 else [],
            }
        )

    for p in people:
        await db.people.update_one({"id": p["id"]}, {"$set": p}, upsert=True)
        await db.profiles.update_one(
            {"personId": p["id"]},
            {
                "$setOnInsert": {
                    "personId": p["id"],
                    "bio": BIOS[hash(p["name"]) % len(BIOS)],
                    "interests": INTERESTS_POOL[hash(p["id"]) % len(INTERESTS_POOL)],
                    "lastIngestText": "",
                },
                # looking-for vocab changed to hang types: always refresh to a valid set
                "$set": {"lookingFor": LOOKING_POOL[hash(p["name"]) % len(LOOKING_POOL)]},
            },
            upsert=True,
        )

    now = datetime.now(timezone.utc)

    # (title, hook, kind, delta, place, cfc, host_i, cap, roomId, clubId, rsvp_count)
    seeds = [
        ("Terrace Techno, Tower B", "Bring speakers, we have the roof till 2am.", "party", timedelta(days=2, hours=3), "Cyber City Highs, Tower B roof", True, 0, 12, None, None, 5),
        ("Sunday Padel Doubles", "Two courts booked, need four more racquets.", "event", timedelta(days=3, hours=3), "Golf Course Rd Sports Club", False, 4, 8, None, None, 5),
        ("Chai + Case Prep", "Consulting cases, snacks, zero judgement.", "get-together", timedelta(days=1, hours=3), "Campus, room TBD", True, 8, 6, "room-3", None, 5),
        ("Biryani Crawl: Sector 29", "Four places, one evening, elastic waistbands advised.", "get-together", timedelta(days=5, hours=3), "Sector 29, Gurugram", False, 12, 5, None, None, 5),
        ("Founders' Open Mic", "Five minutes, one idea, brutal-but-kind feedback.", "event", timedelta(days=7, hours=3), "Masters' Union Atrium", True, 16, 20, None, "club-1", 5),
        ("Poker Night, Low Stakes", "Chips are snacks and also chips.", "party", timedelta(days=4, hours=3), "DLF Phase 2, Flat 402", False, 20, 8, None, "frat-1", 5),
        ("Chai Run, 20 Minutes", "Walking out now. Shout if you want one.", "get-together", timedelta(hours=1.5), "Campus Gate 2", True, 6, 8, None, None, 5),
        ("Impromptu FIFA Tournament", "Four controllers, zero planning.", "party", timedelta(hours=2.5), "Sushant Lok, Flat 12B", False, 14, 8, None, None, 5),
        ("Quiet Cowork, Laptops Only", "Headphones on, doors close at 7.", "cowork", timedelta(days=1, hours=5), "Campus, room TBD", True, 9, 6, "room-7", None, 3),
        ("Lunch: Dal Makhani Faction", "Lunch slot TBD from campus. Save me a seat.", "lunch", timedelta(hours=1), "Campus canteen", True, 11, 6, None, None, 3),
        ("Lunch: Sustainability Table", "Lunch slot TBD from campus. Cohort talk optional.", "lunch", timedelta(hours=1, minutes=10), "Campus, room TBD", True, 19, 8, "room-1", "club-2", 2),
    ]

    for title, hook, kind, delta, place, cfc, host_i, cap, room_id, club_id, rsvp_count in seeds:
        gid = _gid(title)
        host = people[host_i]
        starts = now + delta
        doc = {
            "id": gid,
            "title": title,
            "hook": hook,
            "kind": kind,
            "startsAt": starts,
            "slotDate": starts.date().isoformat(),
            "place": place,
            "hostId": host["id"],
            "hostName": host["name"],
            "hostBatch": host["batch"],
            "hostProgramme": host["programme"],
            "comingFromCollege": cfc,
            "cap": cap,
            "roomId": room_id,
            "hostClubId": club_id,
            "createdAt": now,
        }
        await db.gatherings.update_one(
            {"id": gid}, {"$set": doc, "$setOnInsert": {"status": "open"}}, upsert=True
        )
        for offset in range(rsvp_count):
            attendee = people[(host_i + offset * 3) % len(people)]
            await db.rsvps.update_one(
                {"gatheringId": gid, "personId": attendee["id"]},
                {
                    "$setOnInsert": {
                        "id": str(uuid.uuid4()),
                        "gatheringId": gid,
                        "personId": attendee["id"],
                        "comingFromCollege": offset % 2 == 0,
                        "createdAt": now,
                    }
                },
                upsert=True,
            )
        count = await db.rsvps.count_documents({"gatheringId": gid})
        current = await db.gatherings.find_one({"id": gid})
        if current.get("status") != "cancelled":
            await db.gatherings.update_one(
                {"id": gid}, {"$set": {"status": "full" if count >= cap else "open"}}
            )

    # Backfill any user-created gatherings from before this schema.
    async for g in db.gatherings.find({"hostBatch": {"$exists": False}}):
        host = await db.people.find_one({"id": g["hostId"]}) or {}
        starts = g["startsAt"]
        await db.gatherings.update_one(
            {"id": g["id"]},
            {
                "$set": {
                    "hostBatch": host.get("batch", "UG '24"),
                    "hostProgramme": host.get("programme", "UG"),
                    "slotDate": starts.date().isoformat(),
                    "cap": g.get("cap", 8),
                    "status": g.get("status", "open"),
                    "roomId": g.get("roomId"),
                    "hostClubId": g.get("hostClubId"),
                }
            },
        )

    await ensure_indexes()
    print(f"seeded {len(people)} people, {len(seeds)} gatherings")


if __name__ == "__main__":
    asyncio.run(main())
