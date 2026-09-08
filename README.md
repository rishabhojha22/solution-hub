# Bosch Solution Hub

The project has separate frontend and backend applications.

| Folder | Stack | Purpose |
| --- | --- | --- |
| `frontend/` | Next.js + TypeScript | Solution Hub and interactive knowledge graph UI |
| `backend/` | FastAPI + Python | Local Cosmos-style graph API and persisted mock data |

## Local development

Start the backend in one terminal:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Visit `http://localhost:8000/` for the API index or `http://localhost:8000/docs` for Swagger UI.

Start the frontend in a second terminal:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev -- --webpack
```

Open `http://localhost:3000/knowledge-graph`.

## Docker

Start both services:

```powershell
docker compose up --build
```

The frontend is available at port 3000 and the Python graph API at port 8000.




Questions to Test the Website

Can I search for computer vision and get only relevant solutions?
Does searching invoice automation find the Document Intelligence solution?
Does an empty search show all available solutions?
Do category and department filters work together?
Does clearing filters restore the original result list?
Does changing the sort order change the result order?
Can I open a solution from the search results?
Does the solution detail page show the correct owner, department, technologies, and status?
Does saving a solution visibly change its saved state?
Does the access request modal open and submit successfully?
Does submitting an empty required form show validation errors?
Does a new solution request appear after submission?
Does the contribution wizard move correctly through all seven steps?
Does the duplicate warning appear for a similar solution name?
Does the Knowledge Graph load when the backend is running?
Does the Knowledge Graph fallback work when the backend is unavailable?
Does searching graph assets hide unrelated nodes?
Does selecting an asset update the inspector panel?
Does relationship tracing show the correct path and hop count?
Does the graph show a clear result when no relationship exists?
Does the site work on mobile width without overlapping content?
Can keyboard users reach search, filters, buttons, dialogs, and forms?
Are all important buttons and inputs accessible to screen readers?
Does refreshing the page preserve only data that is supposed to persist?
Does unauthorized access to /admin get blocked in a real deployment?


Who owns Visual Quality Inspection
Which projects are owned by Daniel Hoffmann
What projects use Python
Which assets use Azure Cosmos DB
Which projects depend on Edge Gateway
What is connected to Industrial Feature Store
Which assets are related to Data Product Catalog
Show projects in Manufacturing
Which projects are in Production
Which assets use ISO 27001
What projects use Azure AD
Which projects use Python and Azure
What depends on Data Product Catalog
Which projects are owned by Maya Singh
Which projects have computer vision tags
What assets are connected to Vision Review Workbench