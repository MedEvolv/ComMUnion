from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from models.core import (
    Attendee,
    DeleteResult,
    Gathering,
    GatheringCreate,
    RSVP,
    RSVPRequest,
)

router = APIRouter(tags=["gatherings"])


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _hydrate(doc: dict) -> Gathering:
    rsvps = await db.rsvps.find({"gatheringId": doc["id"]}).to_list(500)
    ids = [r["personId"] for r in rsvps]
    people = {p["id"]: p for p in await db.people.find({"id": {"$in": ids}}).to_list(500)}
    going = [
        Attendee(
            personId=r["personId"],
            name=people[r["personId"]]["name"],
            batch=people[r["personId"]]["batch"],
            housing=people[r["personId"]]["housing"],
            comingFromCollege=bool(r.get("comingFromCollege")),
        )
        for r in rsvps
        if r["personId"] in people
    ]
    going.sort(key=lambda a: a.name)
    return Gathering(**{**doc, "startsAt": _aware(doc["startsAt"]), "createdAt": _aware(doc["createdAt"]), "going": going})


@router.get("/gatherings", response_model=List[Gathering])
async def list_gatherings(
    kind: Optional[str] = Query(default=None),
    upcoming: bool = Query(default=True),
):
    q: dict = {}
    if kind and kind != "all":
        if kind not in ("party", "event", "get-together"):
            raise HTTPException(status_code=400, detail="Unknown kind")
        q["kind"] = kind
    if upcoming:
        q["startsAt"] = {"$gte": datetime.now(timezone.utc)}
    docs = await db.gatherings.find(q).sort("startsAt", 1).to_list(200)
    return [await _hydrate(d) for d in docs]


@router.post("/gatherings", response_model=Gathering, status_code=201)
async def create_gathering(payload: GatheringCreate):
    host = await db.people.find_one({"id": payload.hostId})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    g = Gathering(
        title=payload.title.strip(),
        hook=payload.hook.strip(),
        kind=payload.kind,
        startsAt=_aware(payload.startsAt),
        place=payload.place.strip(),
        hostId=payload.hostId,
        hostName=host["name"],
        comingFromCollege=payload.comingFromCollege,
    )
    doc = g.model_dump()
    doc.pop("going", None)
    await db.gatherings.insert_one(doc)
    await db.rsvps.insert_one(
        RSVP(
            gatheringId=g.id,
            personId=payload.hostId,
            comingFromCollege=payload.comingFromCollege,
        ).model_dump()
    )
    return await _hydrate(doc)


@router.get("/gatherings/{gathering_id}", response_model=Gathering)
async def get_gathering(gathering_id: str):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    return await _hydrate(doc)


@router.post("/gatherings/{gathering_id}/rsvp", response_model=Gathering)
async def join_gathering(gathering_id: str, payload: RSVPRequest):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    if not await db.people.find_one({"id": payload.personId}):
        raise HTTPException(status_code=404, detail="Person not found")
    await db.rsvps.update_one(
        {"gatheringId": gathering_id, "personId": payload.personId},
        {
            "$set": {"comingFromCollege": payload.comingFromCollege},
            "$setOnInsert": RSVP(
                gatheringId=gathering_id, personId=payload.personId
            ).model_dump(include={"id", "gatheringId", "personId", "createdAt"}),
        },
        upsert=True,
    )
    return await _hydrate(doc)


@router.delete("/gatherings/{gathering_id}/rsvp/{person_id}", response_model=DeleteResult)
async def leave_gathering(gathering_id: str, person_id: str):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    if doc["hostId"] == person_id:
        raise HTTPException(status_code=400, detail="The host can't leave their own gathering.")
    res = await db.rsvps.delete_one({"gatheringId": gathering_id, "personId": person_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="You aren't on this list.")
    return DeleteResult(ok=True, id=gathering_id)
