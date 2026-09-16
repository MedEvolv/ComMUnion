// Hand-written mirrors of the Pydantic models in backend/models/core.py.
// Change one, change the other in the same edit.

export type Kind = "party" | "event" | "get-together" | "lunch" | "cowork";
export type Status = "open" | "full" | "cancelled";
export type Programme = "UG" | "PG";
export type Cohort = "AI" | "Sustainability";

export interface Person {
  id: string;
  name: string;
  batch: string;
  housing: string;
  programme: Programme;
  cohort: Cohort | null;
  clubIds: string[];
}

export interface Room {
  id: string;
  label: string;
  capacityMin: number;
  capacityMax: number;
  layout: string;
}

export interface Club {
  id: string;
  label: string;
  kind: "club" | "fraternity";
}

export interface Profile {
  personId: string;
  bio: string;
  interests: string[];
  lookingFor: string[];
  lastIngestText: string;
}

export interface ProfileUpdate {
  bio: string;
  interests: string[];
  lookingFor: string[];
}

export interface IngestResult {
  interests: string[];
  lookingFor: string[];
  matched: number;
}

export interface Attendee {
  personId: string;
  name: string;
  batch: string;
  housing: string;
  comingFromCollege: boolean;
  interests: string[];
}

export interface Gathering {
  id: string;
  title: string;
  hook: string;
  kind: Kind;
  startsAt: string;
  slotDate: string;
  place: string;
  hostId: string;
  hostName: string;
  hostBatch: string;
  hostProgramme: Programme;
  comingFromCollege: boolean;
  cap: number;
  status: Status;
  roomId: string | null;
  roomLabel: string | null;
  hostClubId: string | null;
  hostClubLabel: string | null;
  createdAt: string;
  going: Attendee[];
}

export interface GatheringCreate {
  title: string;
  hook: string;
  kind: Kind;
  startsAt: string;
  place: string;
  hostId: string;
  comingFromCollege: boolean;
  cap: number;
  roomId: string | null;
  hostClubId: string | null;
}

export interface GatheringUpdate {
  hostId: string;
  title?: string;
  hook?: string;
  startsAt?: string;
  place?: string;
  cap?: number;
  roomId?: string | null;
  hostClubId?: string | null;
  comingFromCollege?: boolean;
}

export interface HostAction {
  hostId: string;
}

export interface RSVPRequest {
  personId: string;
  comingFromCollege: boolean;
}

export interface DeleteResult {
  ok: boolean;
  id: string | null;
}

export interface Vocab {
  interests: string[];
  lookingFor: string[];
}

export interface PersonPlans {
  hosting: Gathering[];
  joined: Gathering[];
}

export interface Match {
  person: Person;
  shared: string[];
}
