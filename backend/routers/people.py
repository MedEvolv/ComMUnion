from fastapi import APIRouter, HTTPException
from typing import List

from lib.db import db
from lib.tags import ALL_INTERESTS, ALL_LOOKING_FOR, extract_tags
from models.core import IngestRequest, IngestResult, Match, Person, Profile, ProfileUpdate

router = APIRouter(tags=["people"])


def _person(doc: dict) -> Person:
    doc.setdefault("programme", "PG" if doc.get("batch", "").startswith("PG") else "UG")
    return Person(**doc)


@router.get("/people", response_model=List[Person])
async def list_people():
    docs = await db.people.find().sort("name", 1).to_list(200)
    return [_person(d) for d in docs]


@router.get("/people/{person_id}", response_model=Person)
async def get_person(person_id: str):
    doc = await db.people.find_one({"id": person_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Person not found")
    return _person(doc)


@router.get("/people/{person_id}/matches", response_model=List[Match])
async def person_matches(person_id: str):
    """Classmates who share at least one interest with this person, best overlap first."""
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    me = await db.profiles.find_one({"personId": person_id})
    mine = set((me or {}).get("interests", []))
    if not mine:
        return []
    profiles = await db.profiles.find(
        {"personId": {"$ne": person_id}, "interests": {"$in": list(mine)}}
    ).to_list(500)
    ids = [p["personId"] for p in profiles]
    people = {p["id"]: p for p in await db.people.find({"id": {"$in": ids}}).to_list(500)}
    matches = [
        Match(person=_person(people[p["personId"]]), shared=sorted(mine & set(p.get("interests", []))))
        for p in profiles
        if p["personId"] in people
    ]
    matches.sort(key=lambda m: (-len(m.shared), m.person.name))
    return matches[:12]


@router.get("/vocab")
async def get_vocab():
    return {"interests": ALL_INTERESTS, "lookingFor": ALL_LOOKING_FOR}


async def _profile(person_id: str) -> Profile:
    doc = await db.profiles.find_one({"personId": person_id})
    if not doc:
        return Profile(personId=person_id)
    doc["lookingFor"] = [t for t in doc.get("lookingFor", []) if t in ALL_LOOKING_FOR]
    return Profile(**doc)


@router.get("/profiles/{person_id}", response_model=Profile)
async def get_profile(person_id: str):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    return await _profile(person_id)


@router.put("/profiles/{person_id}", response_model=Profile)
async def put_profile(person_id: str, payload: ProfileUpdate):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    bad = [t for t in payload.lookingFor if t not in ALL_LOOKING_FOR]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown looking-for tag: {bad[0]}")
    current = await _profile(person_id)
    updated = Profile(
        personId=person_id,
        bio=payload.bio,
        interests=sorted(set(payload.interests)),
        lookingFor=sorted(set(payload.lookingFor)),
        lastIngestText=current.lastIngestText,
    )
    await db.profiles.update_one(
        {"personId": person_id}, {"$set": updated.model_dump()}, upsert=True
    )
    return updated


@router.post("/profiles/{person_id}/ingest", response_model=IngestResult)
async def ingest_profile(person_id: str, payload: IngestRequest):
    """Returns SUGGESTIONS only. Selected chips are untouched until the student saves."""
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Paste some text first.")
    interests, looking_for = extract_tags(text)
    await db.profiles.update_one(
        {"personId": person_id},
        {"$set": {"lastIngestText": text}, "$setOnInsert": {"personId": person_id, "bio": "", "interests": [], "lookingFor": []}},
        upsert=True,
    )
    return IngestResult(
        interests=sorted(interests),
        lookingFor=sorted(looking_for),
        matched=len(interests) + len(looking_for),
    )
