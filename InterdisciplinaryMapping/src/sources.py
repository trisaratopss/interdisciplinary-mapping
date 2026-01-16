# sources.py
import json, os
from .models import Person, Publication

class PersonnelSource: # abstract base
    def load_people(self):
        raise NotImplementedError

class PublicationSource: # abstract base
    def load_publications(self):
        raise NotImplementedError

class NDJSONPersonnelSource(PersonnelSource):
    def __init__(self, path: str):
        self.path = path

    def load_people(self): # start list
        people = []
        if not os.path.exists(self.path):
            return people

    # Read file and accumulate lines until a full JSON object parses
    # (handles embedded newlines).
        with open(self.path, "r", encoding="utf-8") as f:
            buf = ""
            for raw in f:
                # Append the line to the buffer and try parsing.
                buf += raw
                try:
                    rec = json.loads(buf)
                except Exception:
                    # incomplete JSON — keep buffering
                    continue
                # parsed successfully: normalize and append
                pid = str(rec.get("id", ""))
                name = str(rec.get("name", ""))
                if pid:
                    people.append(Person(pid, name))
                buf = ""
        return people

class NDJSONPublicationSource(PublicationSource):
    def __init__(self, path: str):
        self.path = path

    def load_publications(self):
        pubs = []
        if not os.path.exists(self.path):
            return pubs

    # Accumulate lines until a complete JSON object parses.
        with open(self.path, "r", encoding="utf-8") as f:
            buf = ""
            for raw in f:
                buf += raw
                try:
                    rec = json.loads(buf)
                except Exception:
                    continue
                pub_id = str(rec.get("id", ""))
                title = str(rec.get("title", ""))
                short_title = str(rec.get("short_title", ""))
                raw_authors = rec.get("authors", [])
                authors = [str(a) for a in raw_authors]
                if pub_id:
                    pubs.append(Publication(pub_id, title, authors, short_title=short_title))
                buf = ""
        return pubs
