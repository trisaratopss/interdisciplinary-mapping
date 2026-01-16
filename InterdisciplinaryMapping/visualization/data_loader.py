from pathlib import Path
import json
import pandas as pd


def load_csv_data(base_dir: Path):
    nodes = pd.read_csv(base_dir / "data" / "nodes.csv")
    edges = pd.read_csv(base_dir / "data" / "edges.csv")
    return nodes, edges


def load_ndjson_meta(base_dir: Path):
    people_meta = {}
    pubs_meta = {}

    pers_path = base_dir / "data" / "personnel.ndjson"
    pubs_path = base_dir / "data" / "publications.ndjson"

    if pers_path.exists():
        with pers_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                pid = str(rec.get("id", "")).strip()
                if not pid:
                    continue
                people_meta[pid] = {
                    "name": rec.get("name", ""),
                    "subteam": rec.get("subteam", ""),
                    "active": bool(rec.get("active", False)),
                    "PI": bool(rec.get("PI", False)),
                }

    if pubs_path.exists():
        with pubs_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                pubid = str(rec.get("id", "")).strip()
                if not pubid:
                    continue
                year = str(rec.get("project_year", "")).strip()
                if not year:
                    year = str(rec.get("year", "")).strip()
                date = rec.get("date", "") or ""
                if not year and isinstance(date, str) and len(date) >= 4 and date[:4].isdigit():
                    year = date[:4]
                pubs_meta[pubid] = {
                    "team": rec.get("team", ""),
                    "title": rec.get("title", ""),
                    "short_title": rec.get("short_title", ""),
                    "type": rec.get("type", ""),
                    "year": year,
                    "doi": rec.get("doi", None),
                    "authors": [str(a) for a in rec.get("authors", [])],
                    "venue": rec.get("venue", ""),
                }

    return people_meta, pubs_meta
