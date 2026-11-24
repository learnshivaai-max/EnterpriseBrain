import networkx as nx
from fastapi.testclient import TestClient

from backend.graph import COUNTS, dependencies, entity, organization, trace
from backend.main import app

client = TestClient(app)


def test_snapshot_counts_and_reproducibility():
    first = organization()
    assert {kind: sum(entity(first, node).kind == kind for node in first) for kind in COUNTS} == COUNTS
    nodes, edges = list(first.nodes(data=True)), list(first.edges(data=True))
    organization.cache_clear()
    second = organization()
    assert list(second.nodes(data=True)) == nodes
    assert list(second.edges(data=True)) == edges


def test_progressive_graph_and_employee_search():
    overview = client.get("/graph").json()
    assert len(overview["nodes"]) == 180
    assert len(overview["departments"]) == 30
    assert overview["counts"]["employee"] == 10000
    assert all(item["kind"] != "employee" for item in overview["nodes"])
    employee = client.get("/graph", params={"q": "employee-10000"}).json()
    assert employee["nodes"][0]["id"] == "employee-10000"
    assert client.get("/graph?limit=251").status_code == 422


def test_failure_propagates_in_reverse_dependency_order():
    graph = organization()
    result = trace(graph, "application-1", downstream=True)
    expected = nx.single_source_shortest_path_length(dependencies(graph).reverse(), "application-1")
    assert result["levels"] == expected
    assert expected["process-1"] == 1
    assert expected["metric-1"] == 2
    assert sum(result["counts"].values()) == len(expected) - 1
    assert result["plans"]


def test_metric_traces_to_data_and_owners():
    result = client.get("/trace/metric-1").json()
    assert {"metric", "pipeline", "dataset", "application", "role"} <= {item["kind"] for item in result["nodes"]}
    assert result["levels"]["pipeline-1"] == 1
    assert result["levels"]["dataset-1"] == 2


def test_snapshot_differences_and_invalid_year():
    result = client.get("/snapshots?before=2024&after=2026").json()
    assert len(result["added"]) == 16
    assert result["relationship_count"] > len(result["added"])
    assert any(row["kind"] == "owned_by" for row in result["changes"])
    assert client.get("/graph?year=1999").status_code == 404


def test_analysis_modules_and_evidence():
    answer = client.post("/ask", json={"text": "What happens if Order Management fails?"}).json()
    assert answer["levels"]["process-1"] == 1 and answer["edges"]
    unknown = client.post("/ask", json={"text": "What is the weather?"}).json()
    assert not unknown["nodes"]
    assert client.get("/risk").json()[0]["dependents"] >= 8
    assert {"Confirmed", "Inferred"} <= {row["confidence"] for row in client.get("/blind-spots").json()}
    assert client.get("/agents/agent-1").json()["overlaps"]
    assert client.get("/knowledge/role-1").json()
    assert client.get("/knowledge/agent-1").status_code == 422


def test_scenarios_persist_and_validate_entity(tmp_path, monkeypatch):
    monkeypatch.setenv("ENTERPRISEBRAIN_DB", str(tmp_path / "scenarios.sqlite3"))
    payload = {"title": "Order system failure", "entity_id": "application-1"}
    response = client.post("/scenarios", json=payload)
    assert response.status_code == 201
    assert client.get("/scenarios").json() == [response.json()]
    assert client.post("/scenarios", json={**payload, "entity_id": "missing"}).status_code == 404


def test_department_aggregation_preserves_cross_department_dependencies():
    result = client.get("/clusters").json()
    graph = organization()
    assert len(result["nodes"]) == 30
    assert sum(int(row["details"]["members"]) for row in result["nodes"]) == len(graph) - 30
    assert sum(edge["weight"] for edge in result["edges"]) == sum(
        entity(graph, left).department != entity(graph, right).department
        for left, right in dependencies(graph).edges
    )


def test_local_model_summary_preserves_verified_evidence_and_falls_back(monkeypatch):
    from unittest.mock import Mock

    from backend import llm

    question = {"text": "What happens if Order Management fails?"}
    baseline = client.post("/ask", json=question).json()
    service = Mock()
    service.getresponse.return_value.status = 200
    service.getresponse.return_value.read.return_value = b'{"response":"Synthetic summary."}'
    connect = Mock(return_value=service)
    monkeypatch.setattr(llm, "HTTPConnection", connect)
    monkeypatch.setenv("ENTERPRISEBRAIN_OLLAMA_MODEL", "example-local-model")
    assert client.post("/ask", json=question).json() == {**baseline, "summary": "Synthetic summary."}
    connect.assert_called_once_with("127.0.0.1", 11434, timeout=8)
    assert service.request.call_args.args[:2] == ("POST", "/api/generate")
    service.getresponse.side_effect = TimeoutError()
    assert client.post("/ask", json=question).json() == baseline
