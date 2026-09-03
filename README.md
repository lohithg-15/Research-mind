# 🧠 ResearchMind

> **Agentic AI Literature Review & Research Gap Discovery**

ResearchMind is an agentic AI system that automates systematic academic literature reviews. It builds a **citation and topic-similarity network** from live arXiv/Semantic Scholar data, identifies **research gaps** (areas with below-median citation density), and presents a fully inspectable citation subgraph behind every finding — ensuring transparency and auditability at every step.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **6-Agent LangGraph Pipeline** | Planner → Search → Extraction → Synthesis → Graph/Gap → Report |
| 🔍 **Multi-source Search** | Queries arXiv and Semantic Scholar in parallel |
| 🕸️ **Citation Graph Analysis** | NetworkX MultiDiGraph with gap detection via citation density |
| 📊 **Interactive Dashboard** | Vite + React 19 UI with glassmorphic dark-mode styling |
| 📄 **Export Reports** | One-click PDF (ReportLab) and DOCX (python-docx) export |
| 💬 **QA Research Assistant** | Chat-based Q&A over collected papers (similar to Elicit) |
| 🛡️ **Offline Resilience** | Committed fallback dataset + local file-based cache |
| 🧪 **Mock Mode** | Runs fully without API keys using simulated Gemini responses |
| 🔁 **Session Persistence** | Browser localStorage saves progress across page reloads |

---

## 🏗️ Architecture

### Agent Pipeline (LangGraph)

```
User Query
    │
    ▼
┌─────────┐    ┌────────┐    ┌────────────┐    ┌───────────┐    ┌───────────┐    ┌────────┐
│ Planner │───▶│ Search │───▶│ Extraction │───▶│ Synthesis │───▶│ Graph/Gap │───▶│ Report │
└─────────┘    └────────┘    └────────────┘    └───────────┘    └───────────┘    └────────┘
 Sub-queries   arXiv +        Field records     Summaries +       NetworkX +       PDF/DOCX
 & filters     Semantic       & metadata        Comparison        Gap claims       Draft
               Scholar                          table
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Orchestration** | LangGraph (StateGraph) |
| **LLM** | Google Gemini (`gemini-3.6-flash`) |
| **Vector Store** | ChromaDB (with hash-based fallback embeddings) |
| **Graph** | NetworkX (MultiDiGraph) |
| **Backend API** | FastAPI + Uvicorn |
| **Frontend** | Vite 8 + React 19 (glassmorphic dark-mode UI) |
| **PDF Export** | ReportLab |
| **DOCX Export** | python-docx |
| **PDF Parsing** | PyMuPDF |

---

## 📁 Repository Structure

```
Research-Mind/
├── backend/
│   ├── __init__.py
│   ├── api/                        # FastAPI server & routes
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app, CORS, /health, /status endpoints
│   │   ├── jobs.py                 # In-memory jobs dictionary (shared state)
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── query.py            # POST /query, GET /results, POST /qa endpoints
│   │       └── export.py           # GET /export/{job_id} — PDF/DOCX download
│   ├── agents/                     # 6-agent pipeline stages
│   │   ├── __init__.py
│   │   ├── planner.py              # Sub-query decomposition via LLM
│   │   ├── search.py               # arXiv + Semantic Scholar parallel retrieval
│   │   ├── extraction.py           # Field extraction, PDF parsing & deduplication
│   │   ├── synthesis.py            # Summarization & comparison table generation
│   │   ├── graph_gap.py            # Citation graph construction + gap detection
│   │   └── report.py               # PDF/DOCX report generation
│   ├── orchestration/
│   │   └── pipeline.py             # LangGraph StateGraph wiring & PipelineState
│   ├── clients/                    # External API clients
│   │   ├── __init__.py
│   │   ├── arxiv_client.py         # arXiv API search & XML parsing
│   │   ├── claude_client.py        # Gemini LLM client (named for backward compat)
│   │   └── s2_client.py            # Semantic Scholar API client
│   ├── data/                       # Data layer — models, stores & caching
│   │   ├── __init__.py
│   │   ├── models.py               # Pydantic models (PaperMeta, FieldRecord, etc.)
│   │   ├── cache.py                # File-based JSON cache + exponential backoff
│   │   ├── vector_store.py         # ChromaDB vector store wrapper
│   │   └── graph_store.py          # NetworkX graph builder (CITES, SIMILAR_TOPIC)
│   ├── db/                         # Runtime data directory (auto-created, gitignored)
│   │   ├── cache/                  # Cached API responses
│   │   ├── chroma/                 # ChromaDB persistent storage
│   │   └── exports/                # Generated PDF/DOCX report files
│   ├── .env.example                # Environment variable template
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── index.html                  # HTML entry point
│   ├── package.json                # Node dependencies & scripts
│   ├── vite.config.js              # Vite build configuration
│   ├── .oxlintrc.json              # Oxlint linter configuration
│   ├── public/
│   │   ├── favicon.svg             # Browser tab icon
│   │   └── icons.svg               # SVG icon sprite sheet
│   └── src/
│       ├── main.jsx                # React DOM entry point
│       ├── App.jsx                 # Main dashboard, tab routing & API calls
│       ├── App.css                 # App-level overrides
│       ├── index.css               # Design system & glassmorphic styles
│       └── components/
│           ├── QueryForm.jsx       # Research query input & filters
│           ├── ProgressTracker.jsx # Live agent status tracker
│           ├── OverviewPanel.jsx   # Results overview & gap cards
│           ├── ComparisonTable.jsx # Sortable/searchable paper matrix
│           ├── GraphViewer.jsx     # Interactive Cytoscape citation graph
│           ├── SourcesSidebar.jsx  # Source paper detail sidebar
│           ├── ReportExport.jsx    # PDF/DOCX export interface
│           └── QAAssistant.jsx     # Chat-based Q&A over research papers
├── tests/
│   ├── unit/                       # Unit tests for each agent
│   │   ├── test_planner.py
│   │   ├── test_search.py
│   │   ├── test_extraction.py
│   │   ├── test_synthesis.py
│   │   ├── test_graph_gap.py
│   │   └── test_report.py
│   └── integration/
│       └── test_pipeline.py        # Full LangGraph pipeline integration test
├── fallback_dataset/               # Committed offline data
│   ├── cache/                      # Pre-fetched search result cache files
│   ├── results_attention_mechanisms.json  # Pre-computed pipeline output
│   └── generate_fallback.py        # Script to regenerate fallback data
├── docs/                           # Project documentation
│   ├── PRD_ResearchMind.docx       # Product Requirements Document
│   ├── SRS_ResearchMind.docx       # Software Requirements Specification
│   ├── TEST_PLAN_ResearchMind.docx # Test Plan
│   ├── BUILD_GUIDE_ResearchMind.docx   # Build & Deployment Guide
│   └── ANTIGRAVITY_BUILD_PROMPT_ResearchMind.md  # Original build prompt
└── .gitignore
```

---

## ⚙️ Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18.x or higher (npm 9+)

---

## 🚀 Backend Setup

This section walks through every step required to get the ResearchMind backend running locally, from environment activation to verifying the server is live.

---

### Step 1 — Verify Prerequisites

Before starting, confirm the correct versions are installed:

```bash
python --version     # Must be 3.10 or higher
pip --version        # Should be bundled with Python
```

If Python is not installed, download it from [python.org](https://www.python.org/downloads/). Make sure to check **"Add Python to PATH"** during installation on Windows.

---

### Step 2 — Create & Activate the Virtual Environment

Create a Python virtual environment at the project root:

```bash
python -m venv venv
```

Then activate it:

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

> If you get an execution policy error, run this first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

**Windows (Command Prompt):**
```cmd
.\venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

Once activated, your terminal prompt will show `(venv)` as a prefix, confirming the environment is active. All `pip install` and `python` commands from this point will use the isolated environment.

---

### Step 3 — Install Python Dependencies

With the venv active, install all required packages:

```bash
pip install -r backend/requirements.txt
```

This installs the following core packages:

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | ≥0.100 | REST API framework |
| `uvicorn` | ≥0.22 | ASGI server for FastAPI |
| `langgraph` | ≥0.1 | Multi-agent workflow orchestration |
| `chromadb` | ≥0.4 | Vector store for semantic paper search |
| `google-genai` | ≥2.0 | Google Gemini LLM client |
| `networkx` | ≥3.1 | Citation graph construction & analysis |
| `pymupdf` | ≥1.22 | PDF text extraction from arXiv papers |
| `reportlab` | ≥4.0 | PDF report generation |
| `python-docx` | ≥1.0 | DOCX report generation |
| `pydantic` | ≥2.0 | Data validation & Pydantic models |
| `requests` | ≥2.31 | HTTP client for arXiv/Semantic Scholar APIs |
| `numpy` | ≥1.24 | Numerical operations for graph analysis |
| `python-dotenv` | ≥1.0 | `.env` file loading |
| `pytest` | ≥7.3 | Test runner |

> **Tip**: If you encounter dependency conflicts, try:
> ```bash
> pip install -r backend/requirements.txt --upgrade
> ```

---

### Step 4 — Configure Environment Variables

The backend requires a `.env` file inside the `backend/` folder. This file holds all API keys and server configuration. **Never commit this file to Git** — it is already listed in `.gitignore`.

**Create your `.env` from the provided template:**

```bash
# On macOS / Linux / Git Bash on Windows:
cp backend/.env.example backend/.env

# On Windows PowerShell:
Copy-Item backend\.env.example backend\.env
```

**Open `backend/.env` and fill in your values:**

```env
# ── Server Configuration ──────────────────────────────────────────
PORT=8000
HOST=0.0.0.0

# ── LLM Provider ──────────────────────────────────────────────────
# Google Gemini (recommended — free tier available)
GEMINI_API_KEY=your-gemini-api-key-here

# ── Semantic Scholar API (optional, but strongly recommended) ──────
# Without this key, the API applies aggressive rate limits (1 req/s).
# Get a free key at: https://www.semanticscholar.org/product/api
SEMANTIC_SCHOLAR_API_KEY=your-semantic-scholar-api-key-here
```

#### LLM Provider

The backend uses **Google Gemini** as its LLM provider. The client (`claude_client.py`) is named for backward compatibility but internally calls the Gemini API.

| Condition | Mode | Model Used |
|---|---|---|
| `GEMINI_API_KEY` set and valid | **Live Mode** | `gemini-3.6-flash` |
| Key missing or placeholder | **Mock Mode** | Simulated deterministic responses |

**Getting API Keys:**
- **Gemini (Free Tier available):** [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Semantic Scholar:** [semanticscholar.org/product/api](https://www.semanticscholar.org/product/api)

#### 🧪 Mock Mode (No API Keys Required)

If the Gemini key is left as the placeholder string (e.g. `your-gemini-api-key-here`), the backend enters **Mock Mode** automatically. In this mode:

- The LLM pipeline returns pre-scripted, realistic-looking extraction and synthesis responses.
- The arXiv and Semantic Scholar search APIs still run live (no key required for basic arXiv access).
- The full 6-agent pipeline executes end-to-end, including citation graph building and gap detection.
- PDF and DOCX reports are generated normally.

Mock Mode is ideal for **demonstrations, CI testing, and local development** without incurring any API costs.

---

### Step 5 — Start the Backend Server

From the **project root** (not from inside `backend/`), run:

```bash
python -m uvicorn backend.api.main:app --reload --port 8000
```

**What each flag does:**
- `backend.api.main:app` — Python module path to the FastAPI `app` instance
- `--reload` — Auto-restarts the server when source files change (development mode)
- `--port 8000` — Binds to port 8000 (must match the frontend's API base URL)

**Expected startup output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

### Step 6 — Verify the Server is Running

Open your browser or run `curl` to check the health endpoint:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy"}
```

---

## 📡 API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/health` | Health check — confirms server is up |
| `POST` | `/query` | Submit a research topic to start the 6-agent pipeline |
| `GET` | `/status/{job_id}` | Poll live execution progress of each agent |
| `GET` | `/results/{job_id}` | Fetch final results (papers, gaps, graph, report) |
| `POST` | `/qa` | Ask a question about papers from a completed job |
| `GET` | `/export/{job_id}?format=pdf` | Download the generated PDF report |
| `GET` | `/export/{job_id}?format=docx` | Download the generated DOCX report |
| `GET` | `/docs` | Interactive Swagger UI — explore & test all routes |
| `GET` | `/redoc` | ReDoc API documentation |

### Request/Response Examples

**Submit a query:**
```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "attention mechanisms", "filters": {"year_range": [2020, 2026]}}'
```

Response:
```json
{"job_id": "a1b2c3d4-..."}
```

**Poll status:**
```bash
curl http://localhost:8000/status/a1b2c3d4-...
```

Response:
```json
{
  "status": "running",
  "agent_status": {
    "planner": "done",
    "search": "running",
    "extraction": "pending",
    "synthesis": "pending",
    "graph_gap": "pending",
    "report": "pending"
  },
  "error": null
}
```

**Ask a question (QA Assistant):**
```bash
curl -X POST http://localhost:8000/qa \
  -H "Content-Type: application/json" \
  -d '{"job_id": "a1b2c3d4-...", "question": "What datasets are most commonly used?"}'
```

---

### Backend Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'backend'` | Running uvicorn from inside `backend/` | Run from the **project root** with `python -m uvicorn backend.api.main:app` |
| `Address already in use` on port 8000 | Another process using port 8000 | Change port: `--port 8001` or kill the process using `netstat -ano \| findstr :8000` |
| `chromadb` import error | Missing binary dependency | Run `pip install chromadb --upgrade` |
| `pymupdf` install fails on Windows | Build tools missing | Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| Uvicorn not found | venv not activated | Re-run the activation command in Step 2 |
| LLM key not picked up | `.env` file in wrong location | Ensure `.env` is inside `backend/` (not the project root) |

---

## 🖥️ Frontend Setup

The frontend is a **Vite 8 + React 19** single-page application with a glassmorphic dark-mode UI. It communicates with the backend over HTTP on `localhost:8000`.

---

### Step 1 — Verify Node.js

```bash
node --version     # Must be 18.x or higher
npm --version      # Must be 9.x or higher
```

If Node is not installed, download it from [nodejs.org](https://nodejs.org/en/download) (choose the **LTS** version).

---

### Step 2 — Navigate to the Frontend Directory

All frontend commands must be run from inside the `frontend/` folder:

```bash
cd frontend
```

> **Important**: Do not run `npm install` from the project root — there is no `package.json` there. All npm commands belong inside `frontend/`.

---

### Step 3 — Install Node Dependencies

```bash
npm install --legacy-peer-deps
```

**Why `--legacy-peer-deps`?**
The project uses React 19 (latest), but some third-party packages declare peer dependency ranges that don't yet include React 19. The `--legacy-peer-deps` flag tells npm to use the older, more permissive peer resolution algorithm instead of throwing an error — the packages still work correctly at runtime.

This installs the following packages:

**Runtime Dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2 | Core UI library |
| `react-dom` | ^19.2 | DOM renderer for React |
| `cytoscape` | ^3.30 | Interactive citation/similarity graph rendering |
| `lucide-react` | ^0.400 | Icon library (Search, BookOpen, GitFork, etc.) |

**Dev Dependencies:**

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^8.1 | Lightning-fast build tool & dev server |
| `@vitejs/plugin-react` | ^6.0 | Vite plugin for React JSX transform |
| `@types/react` | ^19.2 | TypeScript types for React |
| `@types/react-dom` | ^19.2 | TypeScript types for React DOM |
| `oxlint` | ^1.71 | Fast JavaScript/JSX linter |

After install, a `node_modules/` folder will be created inside `frontend/`. This folder is excluded from Git via `.gitignore`.

---

### Step 4 — Start the Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h + enter to show help
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser. The app supports **Hot Module Replacement (HMR)** — changes to `.jsx` or `.css` files are reflected in the browser instantly without a full page reload.

> **The backend must also be running** on `http://localhost:8000` for the frontend to process research queries. Start the backend first (see Backend Setup → Step 5).

---

### Step 5 — Verify the App is Working

1. Open `http://localhost:5173` in your browser
2. You should see the ResearchMind dark-mode dashboard
3. Enter a topic (e.g. `"attention mechanisms"`) in the query box
4. Click **Run Review** — the progress tracker should show each agent status updating in real time
5. Once complete, explore the **Overview**, **Comparison Table**, **Gap Evidence**, **Report**, and **Ask Assistant** tabs

If the dashboard loads but queries fail, check that the backend server is running at `http://localhost:8000/health`.

---

### Available npm Scripts

Run these from inside the `frontend/` directory:

| Script | Command | Description |
|---|---|---|
| **Development** | `npm run dev` | Starts Vite dev server with HMR at `localhost:5173` |
| **Production Build** | `npm run build` | Bundles the app into `frontend/dist/` for deployment |
| **Preview Build** | `npm run preview` | Serves the production build locally for testing |
| **Lint** | `npm run lint` | Runs `oxlint` to check for code quality issues |

---

### How the Frontend Connects to the Backend

The frontend calls the backend API directly from the browser. The base URL is hardcoded to `http://localhost:8000` in `App.jsx`:

```js
// Submits a research query and starts the pipeline job
const res = await fetch('http://localhost:8000/query', { ... });

// Polls agent progress every 2 seconds
const res = await fetch(`http://localhost:8000/status/${jobId}`);

// Fetches final results when pipeline completes
const res = await fetch(`http://localhost:8000/results/${jobId}`);

// QA Assistant — asks questions about collected papers
const res = await fetch('http://localhost:8000/qa', { ... });

// Report export — download PDF or DOCX
window.open(`http://localhost:8000/export/${jobId}?format=pdf`);
```

The backend is configured with CORS `allow_origins=["*"]`, so no proxy or extra configuration is needed during local development.

---

### Frontend Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `npm: command not found` | Node.js not installed | Install Node.js 18+ from [nodejs.org](https://nodejs.org) |
| `npm install` fails with peer dep errors | Running without `--legacy-peer-deps` | Always use `npm install --legacy-peer-deps` |
| `ENOENT: no such file or directory, package.json` | Running npm from project root | `cd frontend` first, then run npm commands |
| Port 5173 already in use | Another Vite instance running | Stop the other server or run `npm run dev -- --port 5174` |
| App loads but shows "Failed to fetch" | Backend not running | Start the backend on port 8000 first |
| Graph not rendering | `cytoscape` not installed | Re-run `npm install --legacy-peer-deps` |
| Blank white screen | Build/JSX error | Open browser DevTools → Console for error details |

---

## 🧪 Running Tests

Run the full test suite (unit + integration):

```bash
python -m pytest
```

Run only unit tests:

```bash
python -m pytest tests/unit/
```

Run only integration tests:

```bash
python -m pytest tests/integration/
```

### Test Coverage

| Test File | Agent / Module Tested |
|---|---|
| `test_planner.py` | Sub-query decomposition |
| `test_search.py` | arXiv + Semantic Scholar search |
| `test_extraction.py` | Field extraction & deduplication |
| `test_synthesis.py` | Summarization & comparison table |
| `test_graph_gap.py` | Citation graph & gap detection |
| `test_report.py` | PDF/DOCX report generation |
| `test_pipeline.py` | Full end-to-end LangGraph pipeline |

---

## 🛡️ Offline Resilience & Demo Mode

ResearchMind is designed to remain usable even without live API access:

- **Local Caching**: The search agent caches all API responses under `backend/db/cache/`. Repeated queries are served from the cache instantly. Cache keys are MD5 hashes of the request parameters.
- **Exponential Backoff**: API clients automatically retry on 429 (rate limit) and network errors with exponential backoff (up to 5 retries).
- **Committed Fallback Dataset**: If the system is fully offline or rate-limited, it automatically falls back to:
  - `fallback_dataset/cache/` — pre-fetched paper search results
  - `fallback_dataset/results_attention_mechanisms.json` — a complete pre-computed pipeline result for the query *"attention mechanisms"*
- **Fallback Embeddings**: If ChromaDB's default embedding model fails to download, the vector store falls back to hash-based 384-dimensional embeddings for similarity computation.

---

## 🗺️ Frontend Components

| Component | Description |
|---|---|
| `QueryForm` | Research topic input, year range, domain, and max-papers filters |
| `ProgressTracker` | Real-time display of each agent's status (pending / running / done / error) |
| `OverviewPanel` | High-level summary cards and identified gap claim tiles |
| `ComparisonTable` | Sortable, searchable paper comparison matrix |
| `GraphViewer` | Interactive Cytoscape citation/similarity graph with force-directed layout |
| `SourcesSidebar` | Detailed sidebar for individual paper metadata and abstracts |
| `ReportExport` | One-click PDF and DOCX export with preview |
| `QAAssistant` | Chat-based research co-pilot — ask questions about collected papers with cited sources |

---

## 🔧 Pydantic Data Models

The pipeline state uses these core models defined in `backend/data/models.py`:

| Model | Purpose | Key Fields |
|---|---|---|
| `PaperMeta` | Paper metadata from arXiv/S2 | `id`, `title`, `authors`, `year`, `abstract`, `citations`, `citation_count` |
| `FieldRecord` | Extracted fields per paper | `method`, `dataset`, `key_metric`, `limitation`, `verification_status` |
| `Summary` | Per-paper summary with grounding | `summary_text`, `attributions` |
| `GapClaim` | Identified research gap | `topic_label`, `description`, `citation_density`, `subgraph_snapshot` |

---

## 📦 Python Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server |
| `langgraph` | Multi-agent workflow orchestration |
| `chromadb` | Vector store for semantic search |
| `google-genai` | Gemini LLM client |
| `networkx` | Citation graph construction & analysis |
| `pymupdf` | PDF text extraction from arXiv papers |
| `reportlab` | PDF report generation |
| `python-docx` | DOCX report generation |
| `pydantic` | Data validation & models |
| `requests` | HTTP client for arXiv/Semantic Scholar |
| `numpy` | Numerical operations for embeddings & graphs |
| `python-dotenv` | Environment variable loading |
| `pytest` | Test runner |

---

## 📚 Documentation

The `docs/` directory contains the following project documents:

| Document | Description |
|---|---|
| `PRD_ResearchMind.docx` | Product Requirements Document |
| `SRS_ResearchMind.docx` | Software Requirements Specification |
| `TEST_PLAN_ResearchMind.docx` | Test Plan & test case definitions |
| `BUILD_GUIDE_ResearchMind.docx` | Build & deployment guide |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed as an academic research tool. See [LICENSE](LICENSE) for details.
