# Interdisciplinary Mapping

This project builds and visualizes an interdisciplinary collaboration network from local CSV/NDJSON data.

How to run

1. (Optional) create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install minimal dependencies if you plan to run the Python scripts:

```bash
pip install pandas networkx pyvis
```

3. Generate the visualization HTML:

```bash
python visualize_pyvis.py
```

4. Open `graph.html` in your browser to view the interactive network.

That's it — the scripts read the files in `data/` and produce the visual output.
