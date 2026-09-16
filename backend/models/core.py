"""Pydantic v2 models. Field names are camelCase to mirror the TS interfaces 1:1."""

import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

Kind = Literal["party", "event", "get-together", "lunch", "cowork"]
Status = Literal["open", "full", "cancelled"]
Programme = Literal["UG", "PG"]
Cohort = Literal["AI", "Sustainability"]
ClubKind = Literal["club", "fraternity"]


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Person(BaseModel):
    id: str = Field(default_factory=_uuid)
    name: str
    batch: str
    housing: str
    programme: Programme
    cohort: Optional[Cohort] = None
    clubIds: List[str] = []


class Room(BaseModel):
    id: str
    label: str
    capacityMin: int
    capacityMax: int
    layout: str = "TBD"


class Club(BaseModel):
    id: str
    label: str
    kind: ClubKind


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
    """Suggestions only — nothing is committed to the profile until the student confirms."""

    interests: List[str]
    lookingFor: List[str]
    matched: int


class Attendee(BaseModel):
    personId: str
    name: str
    batch: str
    housing: str
    comingFromCollege: bool
    interests: List[str] = []


class GatheringCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    hook: str = Field(min_length=2, max_length=160)
    kind: Kind
    startsAt: datetime
    place: str = Field(min_length=2, max_length=120)
    hostId: str
    comingFromCollege: bool = False
    cap: int = Field(default=8, ge=2, le=200)
    roomId: Optional[str] = None
    hostClubId: Optional[str] = None


class GatheringUpdate(BaseModel):
    hostId: str
    title: Optional[str] = Field(default=None, min_length=2, max_length=80)
    hook: Optional[str] = Field(default=None, min_length=2, max_length=160)
    startsAt: Optional[datetime] = None
    place: Optional[str] = Field(default=None, min_length=2, max_length=120)
    cap: Optional[int] = Field(default=None, ge=2, le=200)
    roomId: Optional[str] = None
    hostClubId: Optional[str] = None
    comingFromCollege: Optional[bool] = None


class HostAction(BaseModel):
    hostId: str


class Gathering(BaseModel):
    id: str = Field(default_factory=_uuid)
    title: str
    hook: str
    kind: Kind
    startsAt: datetime
    slotDate: str
    place: str
    hostId: str
    hostName: str
    hostBatch: str
    hostProgramme: Programme
    comingFromCollege: bool = False
    cap: int = 8
    status: Status = "open"
    roomId: Optional[str] = None
    roomLabel: Optional[str] = None
    hostClubId: Optional[str] = None
    hostClubLabel: Optional[str] = None
    createdAt: datetime = Field(default_factory=_now)
    going: List[Attendee] = []


class PersonPlans(BaseModel):
    hosting: List[Gathering] = []
    joined: List[Gathering] = []


class Match(BaseModel):
    person: Person
    shared: List[str]


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
