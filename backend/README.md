# Local Cosmos-style graph backend

The persisted source of truth is `data/cosmos_assets.json` (20 documents based on the supplied asset contract). On startup, `main.py` mirrors it into `data/local_cosmos.db`; it is deliberately ignored because it can be regenerated.

Run it locally from the `backend` folder:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Opening `http://localhost:8000/` now returns a service index rather than a 404. API endpoints: `GET /health`, `GET /graph`, `GET /assets`, `GET /assets/{id}`, and `GET /relationships/answer?from_id=asset-03&to_id=asset-08`. Interactive documentation is at `http://localhost:8000/docs`.

The graph response uses Cosmos Gremlin vocabulary (`outV`, `inV`, edge `label`) and includes an equivalent Gremlin traversal. Replacing the repository with `gremlinpython` later leaves the frontend API unchanged.

Graphify is complementary: its free local CLI maps this repository's Python/TypeScript code and documentation into `graphify-out/`; it is not required to host the business-data graph. Install it when desired with `pip install graphifyy`, then run `graphify .` from the repository root.
