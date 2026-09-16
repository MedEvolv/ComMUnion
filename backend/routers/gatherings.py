from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from lib.campus import CLUB_BY_ID, CLUBS, ROOM_BY_ID, ROOMS
from lib.dates import today_iso
from lib.db import db
from models.core import (
    Attendee,
    Club,
    DeleteResult,
    Gathering,
    GatheringCreate,
    GatheringUpdate,
    HostAction,
    PersonPlans,
    Room,
    RSVP,
    RSVPRequest,
)

router = APIRouter(tags=["gatherings"])

ACTIVE = {"$in": ["open", "full"]}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _slot(dt: datetime) -> str:
    return _aware(dt).date().isoformat()


async def _hydrate(doc: dict) -> Gathering:
    rsvps = await db.rsvps.find({"gatheringId": doc["id"]}).to_list(500)
    ids = [r["personId"] for r in rsvps]
    people = {p["id"]: p for p in await db.people.find({"id": {"$in": ids}}).to_list(500)}
    profiles = {
        p["personId"]: p
        for p in await db.profiles.find({"personId": {"$in": ids}}).to_list(500)
    }
    going = [
        Attendee(
            personId=r["personId"],
            name=people[r["personId"]]["name"],
            batch=people[r["personId"]]["batch"],
            housing=people[r["personId"]]["housing"],
            comingFromCollege=bool(r.get("comingFromCollege")),
            interests=list(profiles.get(r["personId"], {}).get("interests", [])),
        )
        for r in rsvps
        if r["personId"] in people
    ]
    going.sort(key=lambda a: a.name)
    status = doc.get("status", "open")
    cap = int(doc.get("cap", 8))
    if status != "cancelled":
        status = "full" if len(going) >= cap else "open"
    room = ROOM_BY_ID.get(doc.get("roomId") or "")
    club = CLUB_BY_ID.get(doc.get("hostClubId") or "")
    return Gathering(
        **{
            **doc,
            "startsAt": _aware(doc["startsAt"]),
            "createdAt": _aware(doc["createdAt"]),
            "slotDate": doc.get("slotDate") or _slot(doc["startsAt"]),
            "status": status,
            "cap": cap,
            "roomLabel": room.label if room else None,
            "hostClubLabel": club.label if club else None,
            "going": going,
        }
    )


async def _sync_status(gathering_id: str) -> None:
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc or doc.get("status") == "cancelled":
        return
    count = await db.rsvps.count_documents({"gatheringId": gathering_id})
    status = "full" if count >= int(doc.get("cap", 8)) else "open"
    if status != doc.get("status"):
        await db.gatherings.update_one({"id": gathering_id}, {"$set": {"status": status}})


async def _room_conflict(room_id: Optional[str], slot_date: str, exclude_id: Optional[str]) -> None:
    if not room_id:
        return
    if room_id not in ROOM_BY_ID:
        raise HTTPException(status_code=400, detail="Unknown room")
    q: dict = {"roomId": room_id, "slotDate": slot_date, "status": ACTIVE}
    if exclude_id:
        q["id"] = {"$ne": exclude_id}
    clash = await db.gatherings.find_one(q)
    if clash:
        raise HTTPException(
            status_code=409,
            detail=f"{ROOM_BY_ID[room_id].label} is already on “{clash['title']}” for that day. Pick another room.",
        )


@router.get("/rooms", response_model=List[Room])
async def list_rooms():
    return ROOMS


@router.get("/clubs", response_model=List[Club])
async def list_clubs():
    return CLUBS


@router.get("/gatherings", response_model=List[Gathering])
async def list_gatherings(
    kind: Optional[str] = Query(default=None),
    upcoming: bool = Query(default=True),
    batch: Optional[str] = Query(default=None),
    programme: Optional[str] = Query(default=None),
):
    q: dict = {"status": ACTIVE}
    if kind and kind != "all":
        if kind in ("party", "event", "get-together", "lunch", "cowork"):
            q["kind"] = kind
        elif kind == "room":
            q["roomId"] = {"$nin": [None, ""]}
        elif kind == "club":
            q["hostClubId"] = {"$nin": [None, ""]}
        elif kind == "other":
            q["kind"] = {"$nin": ["lunch"]}
            q["roomId"] = {"$in": [None, ""]}
            q["hostClubId"] = {"$in": [None, ""]}
        else:
            raise HTTPException(status_code=400, detail="Unknown kind")
    if batch:
        q["hostBatch"] = batch
    if programme:
        if programme not in ("UG", "PG"):
            raise HTTPException(status_code=400, detail="Unknown programme")
        q["hostProgramme"] = programme
    if upcoming:
        q["startsAt"] = {"$gte": datetime.now(timezone.utc)}
    docs = await db.gatherings.find(q).sort("startsAt", 1).to_list(200)
    return [await _hydrate(d) for d in docs]


@router.get("/gatherings/lunch-today", response_model=List[Gathering])
async def lunch_today():
    docs = (
        await db.gatherings.find({"kind": "lunch", "slotDate": today_iso(), "status": ACTIVE})
        .sort("startsAt", 1)
        .to_list(100)
    )
    return [await _hydrate(d) for d in docs]


@router.post("/gatherings", response_model=Gathering, status_code=201)
async def create_gathering(payload: GatheringCreate):
    host = await db.people.find_one({"id": payload.hostId})
    if not host:
        raise HTTPException(status_code=404, detail="Host not found")
    if payload.hostClubId and payload.hostClubId not in CLUB_BY_ID:
        raise HTTPException(status_code=400, detail="Unknown club")
    starts = _aware(payload.startsAt)
    slot = _slot(starts)
    await _room_conflict(payload.roomId, slot, None)
    g = Gathering(
        title=payload.title.strip(),
        hook=payload.hook.strip(),
        kind=payload.kind,
        startsAt=starts,
        slotDate=slot,
        place=payload.place.strip(),
        hostId=payload.hostId,
        hostName=host["name"],
        hostBatch=host["batch"],
        hostProgramme=host.get("programme", "UG"),
        comingFromCollege=payload.comingFromCollege,
        cap=payload.cap,
        roomId=payload.roomId or None,
        hostClubId=payload.hostClubId or None,
    )
    doc = g.model_dump(exclude={"going", "roomLabel", "hostClubLabel"})
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


@router.patch("/gatherings/{gathering_id}", response_model=Gathering)
async def edit_gathering(gathering_id: str, payload: GatheringUpdate):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    if doc["hostId"] != payload.hostId:
        raise HTTPException(status_code=403, detail="Only the host can edit this.")
    if doc.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="This one was taken down.")
    changes = payload.model_dump(exclude={"hostId"}, exclude_none=True)
    if "hostClubId" in changes and changes["hostClubId"] and changes["hostClubId"] not in CLUB_BY_ID:
        raise HTTPException(status_code=400, detail="Unknown club")
    if "startsAt" in changes:
        changes["startsAt"] = _aware(changes["startsAt"])
        changes["slotDate"] = _slot(changes["startsAt"])
    room_id = changes.get("roomId", doc.get("roomId"))
    slot = changes.get("slotDate", doc.get("slotDate") or _slot(doc["startsAt"]))
    if room_id and (room_id != doc.get("roomId") or slot != doc.get("slotDate")):
        await _room_conflict(room_id, slot, gathering_id)
    if "cap" in changes:
        count = await db.rsvps.count_documents({"gatheringId": gathering_id})
        if changes["cap"] < count:
            raise HTTPException(
                status_code=400, detail=f"{count} people are already going — cap can't go below that."
            )
    for key in ("title", "hook", "place"):
        if key in changes:
            changes[key] = changes[key].strip()
    if changes:
        await db.gatherings.update_one({"id": gathering_id}, {"$set": changes})
        await _sync_status(gathering_id)
    return await _hydrate(await db.gatherings.find_one({"id": gathering_id}))


@router.post("/gatherings/{gathering_id}/cancel", response_model=Gathering)
async def cancel_gathering(gathering_id: str, payload: HostAction):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    if doc["hostId"] != payload.hostId:
        raise HTTPException(status_code=403, detail="Only the host can take this down.")
    await db.gatherings.update_one({"id": gathering_id}, {"$set": {"status": "cancelled"}})
    return await _hydrate(await db.gatherings.find_one({"id": gathering_id}))


@router.get("/people/{person_id}/gatherings", response_model=PersonPlans)
async def person_plans(person_id: str):
    if not await db.people.find_one({"id": person_id}):
        raise HTTPException(status_code=404, detail="Person not found")
    hosting_docs = await db.gatherings.find({"hostId": person_id}).sort("startsAt", 1).to_list(200)
    rsvps = await db.rsvps.find({"personId": person_id}).to_list(500)
    joined_ids = [r["gatheringId"] for r in rsvps]
    joined_docs = (
        await db.gatherings.find({"id": {"$in": joined_ids}, "hostId": {"$ne": person_id}})
        .sort("startsAt", 1)
        .to_list(200)
    )
    return PersonPlans(
        hosting=[await _hydrate(d) for d in hosting_docs],
        joined=[await _hydrate(d) for d in joined_docs],
    )


@router.post("/gatherings/{gathering_id}/rsvp", response_model=Gathering)
async def join_gathering(gathering_id: str, payload: RSVPRequest):
    doc = await db.gatherings.find_one({"id": gathering_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Gathering not found")
    if not await db.people.find_one({"id": payload.personId}):
        raise HTTPException(status_code=404, detail="Person not found")
    if doc.get("status") == "cancelled":
        raise HTTPException(status_code=409, detail="This one was taken down by the host.")
    already = await db.rsvps.find_one({"gatheringId": gathering_id, "personId": payload.personId})
    if not already:
        count = await db.rsvps.count_documents({"gatheringId": gathering_id})
        if count >= int(doc.get("cap", 8)):
            await db.gatherings.update_one({"id": gathering_id}, {"$set": {"status": "full"}})
            raise HTTPException(status_code=409, detail="Full — this one just filled up. Nudge the host instead.")
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
    await _sync_status(gathering_id)
    return await _hydrate(await db.gatherings.find_one({"id": gathering_id}))


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
    await _sync_status(gathering_id)
    return DeleteResult(ok=True, id=gathering_id)
