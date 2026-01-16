"""Export the graph to CSV files (nodes.csv and edges.csv).

This copy lives in data/other; adjust paths so it still finds the NDJSON files
which are in the parent `data/` directory and so imports from `src` work.
"""

from pathlib import Path
import csv
import json
from typing import Dict, List, Tuple

import sys
# Ensure the repository root is on sys.path even when this script is located
# in data/other. parents[2] -> repo root for data/other/export_csv.py
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.builder import GraphBuilder
from src.sources import NDJSONPersonnelSource, NDJSONPublicationSource


BASE = Path(__file__).resolve().parent
# DATA_DIR should point to the containing `data/` directory (parent of this file)
DATA_DIR = BASE.parent


def load_ndjson(path: Path) -> List[dict]:
    """Load NDJSON and return parsed records; skip invalid lines."""
    records: List[dict] = []
    if not path.exists():
        return records
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except Exception:
                # skip malformed lines
                continue
    return records


def build_people_maps(person_records: List[dict]) -> Tuple[Dict[str, str], Dict[str, bool]]:
    """Return (label_map, pi_map) for personnel records."""
    label_map: Dict[str, str] = {}
    pi_map: Dict[str, bool] = {}
    for rec in person_records:
        pid = str(rec.get("id", "")).strip()
        if not pid:
            continue
        node = f"person:{pid}"
        name = rec.get("name") or pid
        label_map[node] = str(name)
        pi_map[node] = bool(rec.get("PI", False))
    return label_map, pi_map


def build_publication_maps(pub_records: List[dict], pi_map: Dict[str, bool]) -> Tuple[Dict[str, str], Dict[str, int]]:
    """Return (pub_label_map, pub_pi_counts)."""
    label_map: Dict[str, str] = {}
    pi_counts: Dict[str, int] = {}
    for rec in pub_records:
        pub_id = str(rec.get("id", "")).strip()
        if not pub_id:
            continue
        node = f"pub:{pub_id}"
        short = (rec.get("short_title") or "")
        title = rec.get("title") or pub_id
        label = short.strip() if short.strip() else str(title)
        label_map[node] = label

        authors = [str(a) for a in rec.get("authors", [])]
        count = 0
        for a in authors:
            if pi_map.get(f"person:{a}"):
                count += 1
        pi_counts[node] = count
    return label_map, pi_counts


def write_nodes_csv(path: Path, person_records: List[dict], pub_records: List[dict], people_map: Dict[str, str], pub_map: Dict[str, str], pub_pi_counts: Dict[str, int]) -> None:
    """Write nodes.csv (id,label,kind,PI,pi_count)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["id", "label", "kind", "PI", "pi_count"])

        # people first (from NDJSON so we include any person even with zero pubs)
        for rec in person_records:
            pid = str(rec.get("id", "")).strip()
            if not pid:
                continue
            node = f"person:{pid}"
            label = people_map.get(node, rec.get("name") or pid)
            pi_flag = "true" if bool(rec.get("PI", False)) else "false"
            writer.writerow([node, label, "person", pi_flag, ""])

        # publications
        for rec in pub_records:
            pub_id = str(rec.get("id", "")).strip()
            if not pub_id:
                continue
            node = f"pub:{pub_id}"
            label = pub_map.get(node, rec.get("short_title") or rec.get("title") or pub_id)
            pi_count = pub_pi_counts.get(node, 0)
            writer.writerow([node, label, "pub", "", str(pi_count)])


def write_edges_csv(path: Path, graph) -> None:
    """Write undirected edges as source,target CSV without duplicates."""
    path.parent.mkdir(parents=True, exist_ok=True)
    seen = set()
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["source", "target"])
        for node in graph.nodes():
            for nbr in graph.neighbors(node):
                pair = tuple(sorted([node, nbr]))
                if pair in seen:
                    continue
                seen.add(pair)
                writer.writerow([pair[0], pair[1]])


def export_to_csv() -> None:
    # Prepare sources and build graph
    personnel_path = DATA_DIR / "personnel.ndjson"
    publications_path = DATA_DIR / "publications.ndjson"

    personnel_source = NDJSONPersonnelSource(str(personnel_path))
    publication_source = NDJSONPublicationSource(str(publications_path))
    builder = GraphBuilder(personnel_source, publication_source)
    graph = builder.build()

    # Load NDJSON records (include all persons/pubs)
    person_records = load_ndjson(personnel_path)
    pub_records = load_ndjson(publications_path)

    people_map, pi_map = build_people_maps(person_records)
    pub_map, pub_pi_counts = build_publication_maps(pub_records, pi_map)

    nodes_path = DATA_DIR / "nodes.csv"
    edges_path = DATA_DIR / "edges.csv"

    write_nodes_csv(nodes_path, person_records, pub_records, people_map, pub_map, pub_pi_counts)
    write_edges_csv(edges_path, graph)

    print(" ", nodes_path)
    print(" ", edges_path)


if __name__ == "__main__":
    export_to_csv()
