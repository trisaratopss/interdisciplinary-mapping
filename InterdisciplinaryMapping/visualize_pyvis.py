"""Convenience script to run the visualizer."""
from src.visualize_pyvis import main


if __name__ == "__main__":
    main()
from pathlib import Path
import os
import webbrowser
import subprocess

from visualization.data_loader import load_csv_data, load_ndjson_meta
from visualization.layout import bipartite_positions, person_publication_counts, pubs_around_people_positions
from visualization.network_builder import build_network
from visualization.ui_injection import inject_ui


def main():
    base_dir = Path(__file__).parent

    # Run exporter subprocess to refresh CSVs (keeps exporter decoupled).
    try:
        print("→ Running data/export_csv.py to refresh CSVs...")
        subprocess.run(["python3", str(base_dir / "data" / "export_csv.py")], check=True)
    except subprocess.CalledProcessError as e:
        print("⚠️ Exporter failed; continuing with existing CSVs. Error:", e)

    # Load data and metadata
    nodes, edges = load_csv_data(base_dir)
    people_meta, pubs_meta = load_ndjson_meta(base_dir)

    # Compute layout and counts
    # Place publications on an outer ring and people inside
    pos_map = pubs_around_people_positions(nodes)
    person_counts = person_publication_counts(edges)

    # Build network and write HTML
    out = build_network(nodes, edges, people_meta, pubs_meta, pos_map, person_counts, base_dir / "graph.html")

    # Inject UI
    inject_ui(out, people_meta)

    # Open in browser
    opened = webbrowser.open("file://" + str(out))
    if not opened and os.name == "posix":
        try:
            os.system(f'open "{out}"')
        except Exception:
            pass
    print(f"✅ Graph saved as {out} — opening in your browser (or open it manually if it doesn't launch).")


if __name__ == "__main__":
    main()

