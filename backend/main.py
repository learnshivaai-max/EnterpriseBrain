import json
import os
import sqlite3
from collections import Counter
from contextlib import closing
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from .graph import COUNTS, YEARS, dependencies, entity, organization, relations, risks, targets, trace

app = FastAPI(title="EnterpriseBrain", version="0.1.0", description="Synthetic Nexora Global graph intelligence")


def snapshot(year):
    if year not in YEARS:
        raise HTTPException(404, "Snapshot unavailable")
    return organization(year)


def require(graph, node):
    if node not in graph:
        raise HTTPException(404, "Entity unavailable")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/graph")
def graph_view(year: int = 2026, department: str = "", kind: str = "", q: str = "",
               offset: int = Query(0, ge=0), limit: int = Query(180, ge=1, le=250)):
    graph = snapshot(year)
    matches = []
    for node in graph:
        item = entity(graph, node)
        if department and item.department != department:
            continue
        if kind and item.kind != kind:
            continue
        if q and q.casefold() not in f"{item.label} {node}".casefold():
            continue
        if not (q or kind) and item.kind == "employee":
            continue
        matches.append(item)
    view = matches[offset:offset + limit]
    return {"nodes": view, "edges": relations(graph, {item.id for item in view}), "total": len(matches),
            "departments": [entity(graph, f"department-{index+1}") for index in range(30)],
            "counts": {kind: sum(node.startswith(kind + "-") for node in graph) for kind in COUNTS}}


@app.get("/entities/{node}")
def inspect(node: str, year: int = 2026):
    graph = snapshot(year)
    require(graph, node)
    adjacent = sorted(set(graph.predecessors(node)) | set(graph.successors(node)))
    view = adjacent[:80]
    return {"entity": entity(graph, node), "nodes": [entity(graph, neighbor) for neighbor in view],
            "edges": [edge for edge in relations(graph, {node, *view}) if node in (edge.source, edge.target)],
            "total": len(adjacent)}


@app.get("/clusters")
def clusters(year: int = 2026):
    graph = snapshot(year)
    members = Counter(entity(graph, node).department for node in graph
                      if entity(graph, node).kind != "department")
    links = Counter((entity(graph, left).department, entity(graph, right).department)
                    for left, right in dependencies(graph).edges)
    departments = [entity(graph, f"department-{index + 1}") for index in range(30)]
    return {"nodes": [item.model_copy(update={"details": {"members": str(members[item.id])}})
                      for item in departments],
            "edges": [{"source": left, "target": right, "kind": "department dependency", "weight": weight}
                      for (left, right), weight in sorted(links.items()) if left != right]}


@app.get("/trace/{node}")
def lineage(node: str, year: int = 2026, direction: Literal["upstream", "downstream"] = "upstream"):
    graph = snapshot(year)
    require(graph, node)
    return trace(graph, node, direction == "downstream")


@app.get("/risk")
def risk(year: int = 2026):
    return risks(snapshot(year))


@app.get("/knowledge/{role}")
def knowledge(role: str, year: int = 2026):
    graph = snapshot(year)
    require(graph, role)
    if entity(graph, role).kind != "role":
        raise HTTPException(422, "Choose an organizational role")
    return [{"entity": entity(graph, node), "alternatives": [entity(graph, owner) for owner in owners if owner != role],
             "mitigation": "Document a backup owner" if len(owners) == 1 else "Confirm handover with the listed owner"}
            for node in graph.predecessors(role)
            if role in (owners := targets(graph, node, "owned_by"))]


@app.get("/blind-spots")
def blind_spots(year: int = 2026):
    graph = snapshot(year)
    findings = [{"entity": entity(graph, node), "title": "Disconnected entity",
                 "reason": "The entity has no recorded graph relationships.", "confidence": "Confirmed"}
                for node in graph if graph.degree(node) == 0]
    findings.extend({**row, "confidence": "Confirmed"} for row in risks(graph)
                    if row["title"] == "Missing ownership")
    findings.extend({"entity": entity(graph, node), "title": "Missing dataset documentation",
                     "reason": "The dataset lacks a description of its recorded fields.",
                     "confidence": "Confirmed"} for node in graph
                    if entity(graph, node).kind == "dataset" and "documentation" not in entity(graph, node).details)
    findings.extend({"entity": entity(graph, node), "title": "Possible capability duplication",
                     "reason": "Another agent supports the same process with the same model.", "confidence": "Inferred"}
                    for node, peers in agent_overlaps(graph).items() if peers)
    return findings


def agent_overlaps(graph):
    agents = [node for node in graph if entity(graph, node).kind == "agent"]
    capabilities = {node: (targets(graph, node, "depends_on"), targets(graph, node, "uses_model")) for node in agents}
    return {node: [other for other in agents if node != other and capabilities[node] == capabilities[other]]
            for node in agents}


@app.get("/agents/{node}")
def agent(node: str, year: int = 2026):
    graph = snapshot(year)
    require(graph, node)
    if entity(graph, node).kind != "agent":
        raise HTTPException(422, "Choose an AI agent")
    reads = targets(graph, node, "can_read")
    return {"entity": entity(graph, node), "overlaps": [entity(graph, other) for other in agent_overlaps(graph)[node]],
            "excess": [entity(graph, dataset) for dataset in reads
                       if entity(graph, dataset).department != entity(graph, node).department],
            "assumption": "The synthetic baseline permits same-department reads. Cross-department grants require review.",
            "evidence": inspect(node, year)}


@app.get("/snapshots")
def snapshots(before: int = 2024, after: int = 2026):
    start, end = snapshot(before), snapshot(after)
    start_edges = {(source, target, data["relation"].kind) for source, target, data in start.edges(data=True)}
    end_edges = {(source, target, data["relation"].kind) for source, target, data in end.edges(data=True)}
    changes = sorted(start_edges ^ end_edges)
    return {"years": YEARS, "added": [entity(end, node) for node in sorted(set(end) - set(start))],
            "removed": [entity(start, node) for node in sorted(set(start) - set(end))],
            "relationship_count": len(changes),
            "risk_before": len(risks(start)), "risk_after": len(risks(end)),
            "changes": [{"source": source, "target": target, "kind": kind,
                         "change": "Added" if (source, target, kind) in end_edges else "Removed"}
                        for source, target, kind in changes if kind != "belongs_to"]}


class Question(BaseModel):
    text: str = Field(min_length=1, max_length=400)
    year: int = 2026


@app.post("/ask")
def ask(question: Question):
    graph = snapshot(question.year)
    prompt = question.text.casefold()
    candidates = [entity(graph, node) for node in graph if entity(graph, node).kind != "employee"
                  and (entity(graph, node).label.casefold() in prompt or node in prompt.split())]
    if not candidates:
        return {"answer": "Include an exact entity name, such as Order Management or Operating Margin.",
                "assumption": "The deterministic interpreter matches entity names and supports ownership, lineage and impact.",
                "nodes": [], "edges": [], "levels": {}}
    item = max(candidates, key=lambda candidate: len(candidate.label))
    if any(term in prompt for term in ("owner", "owns", "accountable")):
        owners = targets(graph, item.id, "owned_by")
        return {"answer": f"{item.label} has {len(owners)} documented owners.",
                "nodes": [item, *(entity(graph, owner) for owner in owners)],
                "edges": relations(graph, [item.id, *owners]), "levels": {item.id: 0},
                "assumption": "Ownership is based on direct recorded assignments."}
    downstream = any(term in prompt for term in ("fail", "impact", "downstream", "depend on it"))
    result = trace(graph, item.id, downstream)
    return {**result, "answer": f"{item.label} has {sum(result['counts'].values())} "
                                 f"{'downstream dependents' if downstream else 'upstream dependencies'}.",
            "assumption": "Paths use documented dependency, data access and model-use relationships."}


class SavedScenario(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    entity_id: str
    year: int = 2026


def database():
    path = Path(os.environ.get("ENTERPRISEBRAIN_DB", "data/scenarios.sqlite3"))
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.execute("CREATE TABLE IF NOT EXISTS scenarios (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)")
    return connection


@app.post("/scenarios", status_code=201)
def save_scenario(scenario: SavedScenario):
    require(snapshot(scenario.year), scenario.entity_id)
    with closing(database()) as connection, connection:
        record = connection.execute("INSERT INTO scenarios (payload) VALUES (?)", (scenario.model_dump_json(),))
        return {"id": record.lastrowid, **scenario.model_dump()}


@app.get("/scenarios")
def scenarios():
    with closing(database()) as connection:
        return [{"id": row[0], **json.loads(row[1])}
                for row in connection.execute("SELECT id, payload FROM scenarios ORDER BY id DESC LIMIT 100")]
