from typing import Dict, Tuple
import math


def bipartite_positions(nodes_df) -> Dict[str, Tuple[int, int]]:
    people = []
    pubs = []
    for _, row in nodes_df.iterrows():
        if str(row["kind"]).lower().startswith("person"):
            people.append(row)
        else:
            pubs.append(row)

    def _sort_key(r):
        return str(r["label"]).lower()

    people.sort(key=_sort_key)
    pubs.sort(key=_sort_key)

    # helper to lay out one centered row
    def _row_positions(rows, y_fixed, step=140):
        n = len(rows)
        if n == 0:
            return {}
        start = -step * (n - 1) / 2.0
        pos = {}
        for i, r in enumerate(rows):
            nid = str(r["id"])
            x = int(start + i * step)
            pos[nid] = (x, y_fixed)
        return pos

    # split helpers for alternating rows
    def _split_two(rows):
        return rows[0::2], rows[1::2]

    def _split_three(rows):
        return rows[0::3], rows[1::3], rows[2::3]

    # pubs: three rows at the top
    pubs_row1, pubs_row2, pubs_row3 = _split_three(pubs)
    # people: two rows at the bottom
    people_row1, people_row2 = _split_two(people)

    pos_map: Dict[str, Tuple[int, int]] = {}
    # three rows of publications
    pos_map.update(_row_positions(pubs_row1, y_fixed=-360))
    pos_map.update(_row_positions(pubs_row2, y_fixed=-240))
    pos_map.update(_row_positions(pubs_row3, y_fixed=-120))
    # first row of people
    pos_map.update(_row_positions(people_row1, y_fixed=150))
    # second (bottom) row of people
    pos_map.update(_row_positions(people_row2, y_fixed=300))

    return pos_map


def person_publication_counts(edges_df):
    counts = {}
    for _, erow in edges_df.iterrows():
        s = str(erow["source"])
        t = str(erow["target"])
        if s.startswith("person:"):
            counts[s] = counts.get(s, 0) + 1
        if t.startswith("person:"):
            counts[t] = counts.get(t, 0) + 1
    return counts


def pubs_around_people_positions(nodes_df, inner_radius: int = 380, outer_radius: int = 700) -> Dict[str, Tuple[int, int]]:
    """Place people on inner circle and publications on outer circle."""
    people = []
    pubs = []
    for _, row in nodes_df.iterrows():
        if str(row["kind"]).lower().startswith("person"):
            people.append(row)
        else:
            pubs.append(row)

    def _sort_key(r):
        return str(r["label"]).lower()

    people.sort(key=_sort_key)
    pubs.sort(key=_sort_key)

    pos: Dict[str, Tuple[int, int]] = {}

    # Inner ring for people
    n_people = len(people)
    if n_people > 0:
        for i, r in enumerate(people):
            nid = str(r["id"])  # matches nodes.csv id
            theta = (2.0 * math.pi * i) / n_people
            x = int(round(inner_radius * math.cos(theta)))
            y = int(round(inner_radius * math.sin(theta)))
            pos[nid] = (x, y)

    # Outer ring for publications
    n_pubs = len(pubs)
    if n_pubs > 0:
        for i, r in enumerate(pubs):
            nid = str(r["id"])  # matches nodes.csv id
            theta = (2.0 * math.pi * i) / n_pubs
            x = int(round(outer_radius * math.cos(theta)))
            y = int(round(outer_radius * math.sin(theta)))
            pos[nid] = (x, y)

    return pos
