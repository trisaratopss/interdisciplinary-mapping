from .graph import Graph

class GraphBuilder:
    def __init__(self, personnel_source, publication_source):
        self.personnel_source = personnel_source
        self.publication_source = publication_source

    def build(self) -> Graph:
        g = Graph()

    # index people by id and lowercase name
        id_to_node = {}
        name_to_node = {}

        for p in self.personnel_source.load_people():
            person_node = f"person:{p.id}"
            id_to_node[p.id] = person_node
            if p.name:
                name_to_node[p.name.strip().lower()] = person_node
            g.add_node(person_node)

        for pub in self.publication_source.load_publications():
            pub_node = f"pub:{pub.id}"
            g.add_node(pub_node)

            for author in pub.authors:
                person_node = id_to_node.get(author)

                if not person_node:
                    person_node = name_to_node.get(author.strip().lower())

                if not person_node:
                    person_node = f"person:{author}"
                    g.add_node(person_node)

                g.add_edge(person_node, pub_node)

        return g
