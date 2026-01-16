def visualize_graph(graph_data):
    from pyvis.network import Network

    net = Network(notebook=True)
    net.from_nx(graph_data)
    net.show("graph.html")

def main():
    import networkx as nx

    # Example graph data
    G = nx.Graph()
    G.add_edges_from([(1, 2), (2, 3), (3, 1), (3, 4)])

    visualize_graph(G)

if __name__ == "__main__":
    main()