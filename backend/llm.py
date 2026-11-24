import json
import os
from http.client import HTTPConnection, HTTPException


def summarize(answer, evidence):
    model = os.environ.get("ENTERPRISEBRAIN_OLLAMA_MODEL", "").strip()
    if not model or not evidence["edges"]:
        return None

    names = {item.id: item.label for item in evidence["nodes"]}
    facts = [
        [names[edge.source], edge.kind, names[edge.target]]
        for edge in evidence["edges"][:24]
    ]
    payload = json.dumps({
        "model": model,
        "system": (
            "Summarize the supplied synthetic graph answer in two brief sentences. "
            "Use only the supplied facts. Preserve the answer's counts and omit speculation."
        ),
        "prompt": json.dumps({"answer": answer, "sample_relationships": facts}),
        "stream": False,
        "options": {"num_predict": 120, "temperature": 0},
    }).encode()
    connection = HTTPConnection("127.0.0.1", 11434, timeout=8)
    try:
        connection.request("POST", "/api/generate", payload, {"Content-Type": "application/json"})
        response = connection.getresponse()
        if response.status != 200:
            return None
        result = json.loads(response.read(32_768))
        summary = result.get("response") if isinstance(result, dict) else None
        if not isinstance(summary, str):
            return None
        return summary.strip()[:1200] or None
    except (OSError, HTTPException, ValueError):
        return None
    finally:
        connection.close()
