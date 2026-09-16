"""Idempotent seed: 30 Masters' Union classmates + a few live gatherings.

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
    ["cofounder", "new-friends"], ["gym-buddy", "party-crew"],
    ["study-group", "internship-leads"], ["sports-squad", "new-friends"],
    ["jam-partners", "mentor"], ["startup-team", "party-crew"],
]


def _pid(name: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mu-person:{name}"))


def _gid(title: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mu-gathering:{title}"))


async def main() -> None:
    people = []
    for i, name in enumerate(NAMES):
        people.append(
            {
                "id": _pid(name),
                "name": name,
                "batch": BATCHES[i % 6],
                "housing": HOUSING[(i * 5) % 6],
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
                    "lookingFor": LOOKING_POOL[hash(p["name"]) % len(LOOKING_POOL)],
                    "lastIngestText": "",
                }
            },
            upsert=True,
        )

    now = datetime.now(timezone.utc)
    seeds = [
        ("Terrace Techno, Tower B", "Bring speakers, we have the roof till 2am.", "party", 2, "Cyber City Highs, Tower B roof", True, 0),
        ("Sunday Padel Doubles", "Two courts booked, need four more racquets.", "event", 3, "Golf Course Rd Sports Club", False, 4),
        ("Chai + Case Prep", "Consulting cases, snacks, zero judgement.", "get-together", 1, "Campus Library, Pod 3", True, 8),
        ("Biryani Crawl: Sector 29", "Four places, one evening, elastic waistbands advised.", "get-together", 5, "Sector 29, Gurugram", False, 12),
        ("Founders' Open Mic", "Five minutes, one idea, brutal-but-kind feedback.", "event", 7, "Masters' Union Atrium", True, 16),
        ("Poker Night, Low Stakes", "Chips are snacks and also chips.", "party", 4, "DLF Phase 2, Flat 402", False, 20),
    ]

    for title, hook, kind, days, place, cfc, host_i in seeds:
        gid = _gid(title)
        host = people[host_i]
        doc = {
            "id": gid,
            "title": title,
            "hook": hook,
            "kind": kind,
            "startsAt": now + timedelta(days=days, hours=3),
            "place": place,
            "hostId": host["id"],
            "hostName": host["name"],
            "comingFromCollege": cfc,
            "createdAt": now,
        }
        await db.gatherings.update_one({"id": gid}, {"$set": doc}, upsert=True)
        for offset in range(0, 5):
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

    await ensure_indexes()
    print(f"seeded {len(people)} people, {len(seeds)} gatherings")


if __name__ == "__main__":
    asyncio.run(main())
