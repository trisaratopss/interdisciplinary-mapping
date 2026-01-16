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

## Deploy to GitHub Pages

Project Pages hosting is prepped with a root `index.html` and a `.nojekyll` file so your static graph can be viewed directly from GitHub.

Steps:

1. Commit and push your changes to `main`.
2. In your GitHub repo, go to Settings → Pages.
3. Under "Build and deployment", set:
   - Source: "Deploy from a branch"
   - Branch: `main`
   - Folder: `/ (root)`
4. Save. GitHub Pages will build and publish within ~1–2 minutes.

After publishing, your site will be available at:

- `https://trisaratopss.github.io/interdisciplinary-mapping/` (root redirects to the interactive graph)
- The interactive graph itself lives at `InterdisciplinaryMapping/graph.html` and loads its assets from `InterdisciplinaryMapping/assets` and `InterdisciplinaryMapping/lib`.

Notes:

- We’ve added `InterdisciplinaryMapping/index.html` which redirects to `graph.html` inside the same folder, so browsing to the folder path works cleanly.
- If you prefer not to use redirects, you can rename `InterdisciplinaryMapping/graph.html` to `InterdisciplinaryMapping/index.html` and update links accordingly.
- GitHub Pages uses a CDN; if you update data and re-export the graph, push the new `graph.html` and the site will reflect the changes after the build finishes.
