"""Keyword vocabulary for the Profile paste-to-tag ingest. No LLM, pure matching."""

import re
from typing import Dict, List

INTEREST_VOCAB: Dict[str, List[str]] = {
    "fintech": ["fintech", "finance", "markets", "trading", "vc", "investing"],
    "startups": ["startup", "startups", "founder", "entrepreneur", "building", "yc"],
    "techno": ["techno", "edm", "rave", "house music", "dj", "clubbing"],
    "bollywood-night": ["bollywood", "desi night", "punjabi", "dance floor"],
    "board-games": ["board game", "boardgames", "catan", "monopoly", "codenames"],
    "poker": ["poker", "texas holdem", "cards"],
    "padel": ["padel"],
    "football": ["football", "soccer", "fifa"],
    "cricket": ["cricket", "ipl", "gully cricket"],
    "gym": ["gym", "lifting", "crossfit", "workout", "fitness"],
    "running": ["running", "marathon", "run club", "5k"],
    "coffee": ["coffee", "cafe", "espresso", "chai"],
    "food-crawl": ["foodie", "food crawl", "biryani", "street food", "brunch"],
    "anime": ["anime", "manga", "one piece"],
    "cinema": ["cinema", "movies", "film", "letterboxd", "nolan"],
    "music-jam": ["guitar", "jam", "sing", "band", "music production"],
    "photography": ["photography", "camera", "photoshoot"],
    "standup": ["standup", "stand-up", "comedy", "open mic"],
    "design": ["design", "figma", "ux", "ui"],
    "ai": [" ai ", "machine learning", "llm", "genai", "deep learning"],
    "reading": ["reading", "books", "book club"],
    "travel": ["travel", "trek", "roadtrip", "backpacking"],
}

LOOKING_FOR_VOCAB: Dict[str, List[str]] = {
    "cofounder": ["cofounder", "co-founder", "co founder"],
    "gym-buddy": ["gym buddy", "gym partner", "workout partner"],
    "study-group": ["study group", "study buddy", "case prep", "exam prep"],
    "jam-partners": ["jam partner", "bandmates", "band mates"],
    "startup-team": ["hackathon", "project team", "startup team", "build together"],
    "internship-leads": ["internship", "intern role", "placement", "referral"],
    "new-friends": ["new friends", "make friends", "meet people", "new people"],
    "sports-squad": ["sports squad", "team to play", "pickup game", "someone to play"],
    "party-crew": ["party crew", "night out", "clubbing buddies", "plus one"],
    "mentor": ["mentor", "mentorship", "guidance"],
}

ALL_INTERESTS = sorted(INTEREST_VOCAB.keys())
ALL_LOOKING_FOR = sorted(LOOKING_FOR_VOCAB.keys())


def _match(text: str, vocab: Dict[str, List[str]]) -> List[str]:
    padded = f" {re.sub(r'[^a-z0-9]+', ' ', text.lower())} "
    hits = []
    for tag, needles in vocab.items():
        for needle in needles:
            cleaned = re.sub(r"[^a-z0-9]+", " ", needle.lower()).strip()
            if cleaned and f" {cleaned} " in padded:
                hits.append(tag)
                break
    return hits


def extract_tags(text: str) -> tuple[List[str], List[str]]:
    return _match(text, INTEREST_VOCAB), _match(text, LOOKING_FOR_VOCAB)
