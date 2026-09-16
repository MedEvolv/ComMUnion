// Hand-written mirrors of the Pydantic models in backend/models/core.py.
// Change one, change the other in the same edit.

export type Kind = "party" | "event" | "get-together";

export interface Person {
  id: string;
  name: string;
  batch: string;
  housing: string;
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
}

export interface Gathering {
  id: string;
  title: string;
  hook: string;
  kind: Kind;
  startsAt: string;
  place: string;
  hostId: string;
  hostName: string;
  comingFromCollege: boolean;
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
