from collections import Counter
from functools import lru_cache
from random import Random
from typing import Literal

import networkx as nx
from pydantic import BaseModel, Field

Kind = Literal["department", "application", "process", "policy", "agent", "employee",
               "dataset", "pipeline", "metric", "role", "plan", "model", "tool"]


class Entity(BaseModel):
    id: str
    label: str
    kind: Kind
    department: str
    details: dict[str, str] = Field(default_factory=dict)


class Relationship(BaseModel):
    source: str
    target: str
    kind: Literal["depends_on", "owned_by", "belongs_to", "governed_by", "mitigated_by", "can_read", "uses_model", "uses_tool"]


DEPARTMENTS = ("Strategy", "Finance", "Operations", "Technology", "Data & Analytics", "People",
               "Legal", "Risk", "Procurement", "Customer Success", "Product", "Research",
               "Marketing", "Sales", "Internal Audit", "Facilities", "Revenue Operations",
               "Business Continuity", "Information Security", "Communications", "Partner Services",
               "Quality", "Sustainability", "Logistics", "Service Delivery", "Architecture",
               "Corporate Planning", "Treasury", "Digital Experience", "Knowledge Management")
COUNTS = {"department": 30, "application": 50, "process": 200, "policy": 100, "agent": 25,
          "employee": 10000, "dataset": 65, "pipeline": 40, "metric": 12, "role": 60,
          "plan": 35, "model": 5, "tool": 10}
YEARS = (2024, 2025, 2026)
NAMES = {
    "application": ("Order Management", "Identity Directory", "Financial Ledger", "Service Registry", "Partner Portal"),
    "process": ("Order Fulfillment", "Revenue Reconciliation", "Supplier Onboarding", "Quarterly Planning"),
    "dataset": ("Shipment Events", "Customer Directory", "Ledger Entries", "Service Inventory"),
    "metric": ("Operating Margin", "On-Time Delivery", "Revenue Retention", "Service Availability"),
    "agent": ("Workflow Triage", "Variance Analyst", "Documentation Assistant", "Supply Planner"),
}


def key(kind, index):
    return f"{kind}-{index + 1}"


@lru_cache(maxsize=3)
def organization(year: int = 2026) -> nx.DiGraph:
    rng = Random(6091)
    graph = nx.DiGraph()
    counts = dict(COUNTS)
    counts["application"] -= (2026 - year) * 3
    counts["agent"] -= (2026 - year) * 5

    def link(source, target, kind):
        graph.add_edge(source, target, relation=Relationship(source=source, target=target, kind=kind))

    # Consume the same random choices across snapshots so differences reflect modeled changes.
    for kind, count in counts.items():
        for index in range(COUNTS[kind]):
            department_index = index if kind == "department" else rng.randrange(30)
            if index >= count:
                continue
            department = key("department", department_index)
            names = NAMES.get(kind, ())
            label = (DEPARTMENTS[index] if kind == "department" else names[index] if index < len(names)
                     else f"{DEPARTMENTS[department_index]} {kind.title()} {index + 1:02}")
            details = {}
            if kind == "metric":
                details = {"definition": f"Monthly executive indicator for {label.lower()}",
                           "calculation": "100 × qualifying records / eligible records",
                           "unit": "%", "window": "Calendar month"}
            if kind == "pipeline":
                details = {"transformation": "Validate records, deduplicate event IDs, aggregate by month"}
            if kind == "dataset" and index % 8:
                details = {"documentation": "Synthetic records with a stable identifier and event timestamp"}
            if kind == "policy":
                details = {"access_baseline": "Department-scoped read access for AI agents"}
            if kind == "plan":
                details = {"procedure": "Activate the manual queue and reconcile records after recovery"}
            entity = Entity(id=key(kind, index), label=label, kind=kind, department=department, details=details)
            graph.add_node(entity.id, entity=entity)

    for kind, count in counts.items():
        for index in range(count):
            node = key(kind, index)
            entity = graph.nodes[node]["entity"]
            if kind != "department" and not (kind == "policy" and index == count - 1):
                link(node, entity.department, "belongs_to")
            department_index = int(entity.department.split("-")[1]) - 1
            if kind in {"application", "process", "dataset", "pipeline", "metric", "agent"} and index % 13:
                reassignment = int(year >= 2025 and index % 17 == 0)
                link(node, key("role", (2 * department_index + reassignment + index % 2) % 60), "owned_by")
                if index % 7 == 0:
                    link(node, key("role", 2 * department_index + 1 - index % 2), "owned_by")
            if kind == "role":
                link(node, key("employee", index * 103), "owned_by")
            if kind == "application" and index and index % 3 == 0:
                link(node, key("application", index % 5), "depends_on")
            if kind == "dataset":
                link(node, key("application", (index * 7 + int(year == 2026 and index % 9 == 0)) % counts["application"]), "depends_on")
            if kind == "pipeline":
                link(node, key("dataset", index * 3 % 65), "depends_on")
            if kind == "metric":
                link(node, key("pipeline", index * 3 % 40), "depends_on")
                link(node, key("process", index * 7), "depends_on")
            if kind == "process":
                link(node, key("application", index * 11 % counts["application"]), "depends_on")
                link(node, key("policy", index % 99), "governed_by")
                if index % 4 == 0:
                    link(node, key("plan", index % 35), "mitigated_by")
            if kind == "agent":
                link(node, key("model", index % 5), "uses_model")
                link(node, key("tool", index % 10), "uses_tool")
                link(node, key("process", index % 10), "depends_on")
                dataset = key("dataset", (index * 3) % 65)
                link(node, dataset, "can_read")
                link(node, key("policy", index % 10), "governed_by")
    return nx.freeze(graph)


def entity(graph, node):
    return graph.nodes[node]["entity"]


def relations(graph, nodes):
    return [data["relation"] for source, target, data in graph.subgraph(nodes).edges(data=True)]


def dependencies(graph):
    result = nx.DiGraph()
    result.add_nodes_from(graph)
    result.add_edges_from((source, target) for source, target, data in graph.edges(data=True)
                          if data["relation"].kind in {"depends_on", "can_read", "uses_model", "uses_tool"})
    return result


def targets(graph, node, kind):
    return [target for target, data in graph[node].items() if data["relation"].kind == kind]


def trace(graph, node, downstream):
    dependency = dependencies(graph)
    traversal = dependency.reverse(copy=False) if downstream else dependency
    levels = nx.single_source_shortest_path_length(traversal, node)
    nodes = set(levels)
    if not downstream:
        nodes.update(owner for item in levels for owner in targets(graph, item, "owned_by"))
    affected = [entity(graph, item) for item in levels if item != node]
    return {"levels": levels, "nodes": [entity(graph, item) for item in graph if item in nodes],
            "edges": relations(graph, nodes), "counts": dict(Counter(item.kind for item in affected)),
            "departments": sorted({item.department for item in affected}),
            "plans": [entity(graph, item) for item in sorted({plan for item in levels
                      for plan in targets(graph, item, "mitigated_by")})]}


def risks(graph):
    dependency = dependencies(graph)
    findings = []
    for node in dependency:
        item = entity(graph, node)
        if item.kind not in {"application", "dataset", "process", "metric", "pipeline", "agent"}:
            continue
        owners = targets(graph, node, "owned_by")
        dependents = len(nx.ancestors(dependency, node))
        candidates = [
            ("Missing ownership", "No documented ownership relationship.", not owners),
            ("Concentrated dependency", f"{dependents} transitive dependents share this dependency.", dependents >= 8),
            ("Single point of failure", "At least one direct consumer has this as its only recorded operational prerequisite.",
             any(dependency.out_degree(consumer) == 1 for consumer in dependency.predecessors(node))),
            ("Fragile process", "The process has one operational dependency and no documented contingency.",
             item.kind == "process" and dependency.out_degree(node) == 1
             and not targets(graph, node, "mitigated_by")),
        ]
        for title, reason, match in candidates:
            if match:
                findings.append({"title": title, "reason": reason, "entity": item, "dependents": dependents})
    return sorted(findings, key=lambda row: (-row["dependents"], row["entity"].id, row["title"]))
