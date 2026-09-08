"""Local-first Cosmos DB / Gremlin-ready knowledge graph API.

The JSON seed is the persisted mock container. SQLite is a small local stand-in
for a graph store; swap LocalCosmosRepository for a gremlinpython repository
when Azure Cosmos DB Gremlin access is available.
"""
from __future__ import annotations

import json
import sqlite3
from collections import deque
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).parent
SEED_FILE = ROOT / "data" / "cosmos_assets.json"
DB_FILE = ROOT / "data" / "local_cosmos.db"

app = FastAPI(
    title="Solution Hub Graph API",
    version="0.1.0",
    description="Local Cosmos DB-style asset graph with Gremlin-ready relationship traversals.",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def load_documents() -> list[dict[str, Any]]:
    return json.loads(SEED_FILE.read_text(encoding="utf-8"))["documents"]

def seed_local_cosmos() -> None:
    """Persist documents locally; intentionally mirrors a Cosmos container seed."""
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, document TEXT NOT NULL)")
        for asset in load_documents():
            conn.execute("INSERT OR REPLACE INTO assets VALUES (?, ?)", (asset["id"], json.dumps(asset)))

def graph_payload() -> dict[str, Any]:
    docs = load_documents()
    
    # Asset nodes
    nodes = [{"id": d["id"], "label": d["projectInformation"]["projectName"], "type": "asset", "department": d["projectInformation"]["department"], "bu": d["projectInformation"]["bu"], "status": d["projectInformation"]["status"], "maturity": d["projectInformation"]["assetMaturity"], "tags": d["tags"], "description": d["shortDescription"], "owner": d["description"]["AssetOwner"]["name"]} for d in docs]
    
    # Extract unique people and create person nodes
    people: dict[str, dict[str, Any]] = {}
    for doc in docs:
        owner = doc["description"]["AssetOwner"]
        owner_id = f"person-{owner['name'].lower().replace(' ', '-')}"
        if owner_id not in people:
            people[owner_id] = {"id": owner_id, "label": owner["name"], "type": "person", "email": owner["emailAddress"], "phone": owner.get("phoneNumber", ""), "role": "Owner"}
        
        maintainer = doc["description"]["AssetMaintainer"]
        maintainer_id = f"person-{maintainer['name'].lower().replace(' ', '-')}"
        if maintainer_id not in people:
            people[maintainer_id] = {"id": maintainer_id, "label": maintainer["name"], "type": "person", "email": maintainer["emailAddress"], "phone": maintainer.get("phoneNumber", ""), "role": "Maintainer"}
    
    nodes.extend(people.values())
    
    # Edges
    edges, seen = [], set()
    
    # Asset-to-asset edges
    for doc in docs:
        for target in doc["Relations"]["ancestorOf"]:
            edge_id = f"{doc['id']}--ENABLES--{target}"
            if edge_id not in seen:
                edges.append({"id": edge_id, "outV": doc["id"], "inV": target, "label": "ENABLES", "gremlin": f"g.V('{doc['id']}').addE('ENABLES').to(g.V('{target}'))"})
                seen.add(edge_id)
    
    # Person-to-asset edges
    for doc in docs:
        owner = doc["description"]["AssetOwner"]
        owner_id = f"person-{owner['name'].lower().replace(' ', '-')}"
        owns_edge_id = f"{owner_id}--OWNS--{doc['id']}"
        if owns_edge_id not in seen:
            edges.append({"id": owns_edge_id, "outV": owner_id, "inV": doc["id"], "label": "OWNS", "gremlin": f"g.V('{owner_id}').addE('OWNS').to(g.V('{doc['id']}'))"})
            seen.add(owns_edge_id)
        
        maintainer = doc["description"]["AssetMaintainer"]
        maintainer_id = f"person-{maintainer['name'].lower().replace(' ', '-')}"
        maintains_edge_id = f"{maintainer_id}--MAINTAINS--{doc['id']}"
        if maintains_edge_id not in seen:
            edges.append({"id": maintains_edge_id, "outV": maintainer_id, "inV": doc["id"], "label": "MAINTAINS", "gremlin": f"g.V('{maintainer_id}').addE('MAINTAINS').to(g.V('{doc['id']}'))"})
            seen.add(maintains_edge_id)
    
    return {"nodes": nodes, "edges": edges, "stats": {"assets": len([n for n in nodes if n["type"] == "asset"]), "people": len([n for n in nodes if n["type"] == "person"]), "relationships": len(edges), "departments": len({n['department'] for n in nodes if 'department' in n}), "storage": "Local Cosmos DB simulation (SQLite + JSON seed)"}}

def find_path(start: str, end: str) -> list[str]:
    graph = graph_payload()
    links: dict[str, list[str]] = {}
    for edge in graph["edges"]:
        links.setdefault(edge["outV"], []).append(edge["inV"])
        links.setdefault(edge["inV"], []).append(edge["outV"])
    queue, parents = deque([start]), {start: None}
    while queue:
        current = queue.popleft()
        if current == end: break
        for neighbor in links.get(current, []):
            if neighbor not in parents: parents[neighbor] = current; queue.append(neighbor)
    if end not in parents: return []
    path = []
    while end is not None: path.append(end); end = parents[end]
    return path[::-1]

@app.on_event("startup")
def startup() -> None: seed_local_cosmos()

@app.get("/", tags=["service"])
def root() -> dict[str, Any]:
    """Makes opening the backend URL useful instead of returning a 404."""
    return {
        "service": "Solution Hub Graph API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "graph": "/graph",
        "assets": "/assets",
        "people": "/people",
        "search": "/search?q=priya",
        "personMaintains": "/people/person-priya-nair/maintains",
        "relationshipAnswer": "/relationships/answer?from_id=asset-03&to_id=asset-08",
    }

@app.get("/health", tags=["service"])
def health() -> dict[str, str]: return {"status": "ok", "storage": "local-cosmos-simulation"}

@app.get("/graph")
def get_graph() -> dict[str, Any]: return graph_payload()

@app.get("/assets")
def assets(q: str = "", department: str = "") -> list[dict[str, Any]]:
    result = load_documents()
    if department: result = [d for d in result if d["projectInformation"]["department"] == department]
    if q:
        term = q.lower(); result = [d for d in result if term in json.dumps(d).lower()]
    return result

@app.get("/assets/{asset_id}")
def asset(asset_id: str) -> dict[str, Any]:
    for document in load_documents():
        if document["id"] == asset_id: return document
    raise HTTPException(404, "Asset not found")

@app.get("/relationships/answer")
def relationship_answer(from_id: str = Query(...), to_id: str = Query(...)) -> dict[str, Any]:
    graph, path = graph_payload(), find_path(from_id, to_id)
    labels = {node["id"]: node["label"] for node in graph["nodes"]}
    if not path: return {"answer": f"No relationship path was found between {from_id} and {to_id}.", "path": []}
    return {"answer": " → ".join(labels[p] for p in path), "path": path, "hops": len(path) - 1, "traversal": f"g.V('{from_id}').repeat(bothE().otherV()).until(hasId('{to_id}')).path()"}

@app.get("/people")
def people(q: str = "") -> list[dict[str, Any]]:
    """Find people by name or email."""
    graph = graph_payload()
    people_nodes = [n for n in graph["nodes"] if n.get("type") == "person"]
    if q:
        term = q.lower()
        people_nodes = [p for p in people_nodes if term in p["label"].lower() or term in p.get("email", "").lower()]
    return people_nodes

@app.get("/people/{person_id}/maintains")
def person_maintains(person_id: str) -> dict[str, Any]:
    """Find all projects maintained by a person."""
    graph = graph_payload()
    person_node = next((n for n in graph["nodes"] if n["id"] == person_id), None)
    if not person_node:
        raise HTTPException(404, f"Person {person_id} not found")
    
    # Find all MAINTAINS edges from this person
    maintains_edges = [e for e in graph["edges"] if e["outV"] == person_id and e["label"] == "MAINTAINS"]
    maintained_assets_ids = [e["inV"] for e in maintains_edges]
    maintained_assets = [n for n in graph["nodes"] if n["id"] in maintained_assets_ids]
    
    return {
        "person": person_node,
        "maintains": maintained_assets,
        "count": len(maintained_assets)
    }

@app.get("/search")
def search(q: str = "") -> dict[str, Any]:
    """Full-text search across assets and people."""
    graph = graph_payload()
    docs = load_documents()
    
    term = q.lower()
    results = {
        "assets": [],
        "people": []
    }
    
    # Search in assets
    for doc in docs:
        if term in json.dumps(doc).lower():
            results["assets"].append({
                "id": doc["id"],
                "name": doc["projectInformation"]["projectName"],
                "description": doc["shortDescription"],
                "type": "asset"
            })
    
    # Search in people
    for person in [n for n in graph["nodes"] if n.get("type") == "person"]:
        if term in person["label"].lower() or term in person.get("email", "").lower():
            results["people"].append(person)
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
