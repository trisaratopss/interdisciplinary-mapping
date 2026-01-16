# app.py
import os
from src.builder import GraphBuilder
from src.sources import NDJSONPersonnelSource, NDJSONPublicationSource

def main():
    # Print current working directory
    print("CWD:", os.getcwd())

    # Build absolute paths to the data files
    base = os.path.dirname(__file__)
    personnel_path = os.path.join(base, "data", "personnel.ndjson")
    publications_path = os.path.join(base, "data", "publications.ndjson")

    print("Looking for:", personnel_path)
    print("Looking for:", publications_path)

    # List data/ contents if present
    data_dir = os.path.join(base, "data")
    if os.path.isdir(data_dir):
        print("data/ contents:", os.listdir(data_dir))
    else:
        print("data/ directory not found!")

    # Build the graph
    personnel_source = NDJSONPersonnelSource(personnel_path)
    publication_source = NDJSONPublicationSource(publications_path)
    builder = GraphBuilder(personnel_source, publication_source)
    graph = builder.build()

    # Print summary + full graph
    print(f"Loaded graph with {len(graph.nodes())} nodes.")
    print(graph)

if __name__ == "__main__":
    main()
