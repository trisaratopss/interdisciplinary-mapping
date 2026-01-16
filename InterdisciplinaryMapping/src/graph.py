class Graph:
    def __init__(self):
        # adjacency list: { node: set(neighbors) }
        self._adj = {}

    def add_node(self, node: str):
        if node not in self._adj:
            self._adj[node] = set()

    def add_edge(self, a: str, b: str):
        self.add_node(a)
        self.add_node(b)
        self._adj[a].add(b)
        self._adj[b].add(a)

    def neighbors(self, node: str):
        return self._adj.get(node, set())

    def nodes(self):
        return list(self._adj.keys())

    def __str__(self):
        lines = ["Graph:"]
        for n, nbrs in self._adj.items():
            lines.append(f"  {n} -> {list(nbrs)}")
        return "\n".join(lines)
