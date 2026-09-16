"""Pydantic v2 models. Field names are camelCase to mirror the TS interfaces 1:1."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Kind = Literal["party", "event", "get-together"]


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Person(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    batch: str
    housing: str


class Profile(BaseModel):
    personId: str
    bio: str = ""
    interests: List[str] = []
    lookingFor: List[str] = []
    lastIngestText: str = ""


class ProfileUpdate(BaseModel):
    bio: str = ""
    interests: List[str] = []
    lookingFor: List[str] = []


class IngestRequest(BaseModel):
    text: str


class IngestResult(BaseModel):
    interests: List[str]
    lookingFor: List[str]
    matched: int


class Attendee(BaseModel):
    personId: str
    name: str
    batch: str
    housing: str
    comingFromCollege: bool


class GatheringCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    hook: str = Field(min_length=2, max_length=160)
    kind: Kind
    startsAt: datetime
    place: str = Field(min_length=2, max_length=120)
    hostId: str
    comingFromCollege: bool = False


class Gathering(BaseModel):
    id: str = Field(default_factory=_uuid)
    title: str
    hook: str
    kind: Kind
    startsAt: datetime
    place: str
    hostId: str
    hostName: str
    comingFromCollege: bool = False
    createdAt: datetime = Field(default_factory=_now)
    going: List[Attendee] = []


class RSVPRequest(BaseModel):
    personId: str
    comingFromCollege: bool = False


class RSVP(BaseModel):
    id: str = Field(default_factory=_uuid)
    gatheringId: str
    personId: str
    comingFromCollege: bool = False
    createdAt: datetime = Field(default_factory=_now)


class DeleteResult(BaseModel):
    ok: bool
    id: Optional[str] = None
