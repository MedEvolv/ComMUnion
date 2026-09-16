"""Campus rooms + clubs. Labels are deliberately TBD — real names come from campus later."""

from models.core import Club, Room

ROOMS = [
    Room(id=f"room-{i}", label=f"TBD from campus {i}", capacityMin=3, capacityMax=10)
    for i in range(1, 11)
]

CLUBS = [
    Club(id="club-1", label="TBD from campus (club 1)", kind="club"),
    Club(id="club-2", label="TBD from campus (club 2)", kind="club"),
    Club(id="club-3", label="TBD from campus (club 3)", kind="club"),
    Club(id="frat-1", label="TBD from campus (fraternity 1)", kind="fraternity"),
    Club(id="frat-2", label="TBD from campus (fraternity 2)", kind="fraternity"),
]

ROOM_BY_ID = {r.id: r for r in ROOMS}
CLUB_BY_ID = {c.id: c for c in CLUBS}
