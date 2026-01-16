class Person:
    def __init__(self, person_id: str, name: str = ""):
        self.id = person_id
        self.name = name

class Publication:
    def __init__(self, pub_id: str, title: str = "", authors=None, short_title: str = ""):
        self.id = pub_id
        self.title = title
        self.short_title = short_title or ""
        self.authors = authors or []