from pathlib import Path
from pyvis.network import Network


def build_network(nodes_df, edges_df, people_meta, pubs_meta, pos_map, person_pub_counts, out_path: Path) -> Path:
    net = Network(height="750px", width="100%", bgcolor="#FFFFFF", font_color="black", notebook=False)

    def _wrap_label(text: str, width: int = 18, max_lines: int = 3) -> str:
        """Wrap label at spaces to reduce overlap. Returns up to max_lines lines joined by \n."""
        if not text:
            return ""
        words = str(text).split()
        lines = []
        cur = []
        cur_len = 0
        for w in words:
            if cur_len + (1 if cur else 0) + len(w) > width:
                lines.append(" ".join(cur))
                cur = [w]
                cur_len = len(w)
                if len(lines) >= max_lines - 1:
                    # last line: append remaining words truncated
                    remain = " ".join([cur] + words[words.index(w)+1:]) if False else " ".join(cur)
                    lines.append(remain)
                    break
            else:
                cur.append(w)
                cur_len += (1 if cur_len else 0) + len(w)
        else:
            if cur:
                lines.append(" ".join(cur))
        return "\n".join(lines[:max_lines])

    # Add nodes
    for _, row in nodes_df.iterrows():
        node_id = str(row['id'])
        label = str(row['label'])
        kind = str(row['kind']).lower()
        color = "#87CEEB" if kind.startswith("person") else "#90EE90"
        raw_id = node_id.split(":", 1)[1] if ":" in node_id else node_id
        x, y = pos_map.get(node_id, (None, None))

        if kind.startswith("person"):
            meta = people_meta.get(raw_id, {})
            full_name = meta.get("name", label) or label
            subteam = meta.get("subteam", "")
            pub_count = int(person_pub_counts.get(node_id, 0))
            # Skip people with no publications to keep the graph focused
            if pub_count <= 0:
                continue
            tooltip = f"<b>{full_name}</b>" + (f"<br/>Subteam: {subteam}" if subteam else "")
            if pub_count:
                tooltip += f"<br/>Publications: {pub_count}"
            display_label = _wrap_label(label, width=18, max_lines=2)
            net.add_node(
                node_id,
                label=display_label,
                color=color,
                title=tooltip,
                origColor=color,
                PI=bool(meta.get("PI", False)),
                kind="person",
                full_name=full_name,
                origLabel=display_label,
                subteam=subteam,
                value=max(pub_count, 1),
                x=x if x is not None else 0,
                y=y if y is not None else 0,
                fixed=True,
                physics=False,
            )
        else:
            meta = pubs_meta.get(raw_id, {})
            full_title = meta.get("title", label)
            team = meta.get("team", "")
            ptype = meta.get("type", "")
            year = meta.get("year", "")
            doi = meta.get("doi", None)
            authors_ids = meta.get("authors", [])
            author_names = []
            for aid in authors_ids:
                nm = people_meta.get(aid, {}).get("name")
                author_names.append(nm if nm else aid)
            # Count PI authors
            pi_count = 0
            for aid in authors_ids:
                if bool(people_meta.get(aid, {}).get("PI", False)):
                    pi_count += 1
            tooltip_lines = [f"<b>{full_title}</b>"]
            if team: tooltip_lines.append(f"Team: {team}")
            if ptype: tooltip_lines.append(f"Type: {ptype}")
            if year: tooltip_lines.append(f"Year: {year}")
            if author_names: tooltip_lines.append("Authors: " + ", ".join(author_names))
            if doi: tooltip_lines.append(f"DOI: {doi}")
            if pi_count >= 2: tooltip_lines.append(f"PI authors: {pi_count}")
            tooltip = "<br/>".join(tooltip_lines)
            # Highlight publications with 2+ PI authors
            pub_color = "#90EE90"
            if pi_count >= 2:
                pub_color = "#F6C445"  # amber
            display_label = _wrap_label(label, width=20, max_lines=3)
            net.add_node(
                node_id,
                label=display_label,
                color=pub_color,
                title=tooltip,
                origColor=pub_color,
                kind="pub",
                full_title=full_title,
                team=team,
                ptype=ptype,
                year=year,
                doi=(doi or ""),
                authors=author_names,
                origLabel=display_label,
                x=x if x is not None else 0,
                y=y if y is not None else 0,
                fixed=True,
                physics=False,
            )

    # Add edges with a darker color and fixed width for better contrast
    for _, row in edges_df.iterrows():
        net.add_edge(
            str(row['source']),
            str(row['target']),
            color="#666666",
            width=1,
        )

    # Disable physics to keep layout positions fixed
    net.toggle_physics(False)

    out = out_path.resolve()
    net.write_html(str(out), open_browser=False, notebook=False)
    return out
