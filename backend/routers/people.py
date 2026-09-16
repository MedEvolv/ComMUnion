from fastapi import APIRouter, HTTPException
from typing import List

from lib.db import db
from lib.tags import ALL_INTERESTS, ALL_LOOKING_FOR, extract_tags
from models.core import IngestRequest, IngestResult, Person, Profile, ProfileUpdate

router = APIRouter(tags=["people"])


@router.get("/people", response_model=List[Person])
async def list_people():
    docs = await db.people.find().sort("name", 1).to_list(200)
    return [Person(**d) for d in docs]


@router.get("/people/{person_id}", response_model=Person)
async def get_person(person_id: str):
    doc = await db.people.find_one({"id": person_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Person not found")
    return Person(**doc)


@router.get("/vocab")
async def get_vocab():
    return {"interests": ALL_INTERESTS, "lookingFor": ALL_LOOKING_FOR}


async def _profile(person_id: str) -> Profile:
    doc = await db.profiles.find_one({"personId": person_id})
    return Profile(**doc) if doc else Profile(personId=person_id)


@router.get("/profiles/{person_id}", response_model=Profile)
async def get_profile(person_id: str):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    return await _profile(person_id)


@router.put("/profiles/{person_id}", response_model=Profile)
async def put_profile(person_id: str, payload: ProfileUpdate):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    current = await _profile(person_id)
    updated = Profile(
        personId=person_id,
        bio=payload.bio,
        interests=payload.interests,
        lookingFor=payload.lookingFor,
        lastIngestText=current.lastIngestText,
    )
    await db.profiles.update_one(
        {"personId": person_id}, {"$set": updated.model_dump()}, upsert=True
    )
    return updated


@router.post("/profiles/{person_id}/ingest", response_model=IngestResult)
async def ingest_profile(person_id: str, payload: IngestRequest):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Paste some text first.")
    interests, looking_for = extract_tags(text)
    if not interests and not looking_for:
        raise HTTPException(
            status_code=422,
            detail="No tags found in that text — try mentioning things like padel, techno, startups or 'looking for a gym buddy'.",
        )
    current = await _profile(person_id)
    merged_interests = sorted(set(current.interests) | set(interests))
    merged_looking = sorted(set(current.lookingFor) | set(looking_for))
    await db.profiles.update_one(
        {"personId": person_id},
        {
            "$set": {
                "personId": person_id,
                "bio": current.bio,
                "interests": merged_interests,
                "lookingFor": merged_looking,
                "lastIngestText": text,
            }
        },
        upsert=True,
    )
    return IngestResult(
        interests=merged_interests,
        lookingFor=merged_looking,
        matched=len(interests) + len(looking_for),
    )
