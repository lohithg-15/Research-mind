# 🧠 ResearchMind

> **Agentic AI Literature Review & Research Gap Discovery**

ResearchMind is an agentic AI system that automates systematic academic literature reviews. It builds a **citation and topic-similarity network** from live arXiv/Semantic Scholar data, identifies **research gaps** (areas with below-median citation density), and presents a fully inspectable citation subgraph behind every finding — ensuring transparency and auditability at every step.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **6-Agent LangGraph Pipeline** | Planner → Search → Extraction → Synthesis → Graph/Gap → Report |
| 🔍 **Multi-source Search** | Queries arXiv and Semantic Scholar in parallel |
| 🕸️ **Citation Graph Analysis** | NetworkX graph with gap detection via citation density |
| 📊 **Interactive Dashboard** | Vite + React UI with glassmorphic styling |
| 📄 **Export Reports** | One-click PDF (ReportLab) and DOCX (python-docx) export |
| 🛡️ **Offline Resilience** | Committed fallback dataset + local ChromaDB cache |
| 🧪 **Mock Mode** | Runs fully without API keys using simulated Claude responses |

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
| **LLM** | Anthropic Claude / Google Gemini |
| **Vector Store** | ChromaDB |
| **Graph** | NetworkX |
| **Backend API** | FastAPI + Uvicorn |
| **Frontend** | Vite + React (glassmorphic UI) |
| **PDF Export** | ReportLab |
| **DOCX Export** | python-docx |

---

## 📁 Repository Structure

```
Research-Mind/
├── backend/
│   ├── api/                  # FastAPI server, routes & SSE streaming
│   ├── agents/               # 6-agent pipeline stages
│   │   ├── planner.py        # Sub-query decomposition
│   │   ├── search.py         # arXiv + Semantic Scholar retrieval
│   │   ├── extraction.py     # Field extraction & deduplication
│   │   ├── synthesis.py      # Summarization & comparison table
│   │   ├── graph_gap.py      # Citation graph + gap detection
│   │   └── report.py         # PDF/DOCX report generation
│   ├── orchestration/
│   │   └── pipeline.py       # LangGraph wiring & shared PipelineState
│   ├── clients/              # arXiv, Semantic Scholar & Claude/Gemini clients
│   ├── data/                 # Pydantic models, ChromaDB & NetworkX stores
│   ├── db/                   # Runtime cache directory (auto-created)
│   ├── .env.example          # Environment variable template
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main dashboard & tab routing
│   │   ├── index.css         # Design system & glassmorphic styles
│   │   └── components/
│   │       ├── QueryForm.jsx         # Research query input & filters
│   │       ├── ProgressTracker.jsx   # Live agent status tracker
│   │       ├── OverviewPanel.jsx     # Results overview & gap cards
│   │       ├── ComparisonTable.jsx   # Sortable/searchable paper matrix
│   │       ├── GraphViewer.jsx       # Interactive citation graph
│   │       ├── SourcesSidebar.jsx    # Source paper detail sidebar
│   │       └── ReportExport.jsx      # PDF/DOCX export interface
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── tests/
│   ├── unit/                 # Unit tests for agents and utilities
│   └── integration/          # Full LangGraph pipeline integration test
├── fallback_dataset/         # Committed cached papers & pre-computed results
│   ├── cache/                # Fallback search result cache
│   └── results_attention_mechanisms.json
└── docs/                     # Additional documentation
```

---

## ⚙️ Prerequisites

- **Python** 3.10 or higher
- **Node.js** 18.x or higher (npm 9+)

---

## 🚀 Backend Setup

### 1. Activate the Virtual Environment

A pre-created `venv/` lives at the project root.

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\venv\Scripts\activate.bat
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 2. Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Configure Environment Variables

Copy the example file and fill in your API keys:

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set the following:

```env
PORT=8000
HOST=0.0.0.0

# LLM — at least one is required for full mode
ANTHROPIC_API_KEY=your-anthropic-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here

# Optional but recommended (prevents rate limiting)
SEMANTIC_SCHOLAR_API_KEY=your-semantic-scholar-api-key-here
```

> **Mock Mode**: If both LLM keys are left as placeholders, the backend automatically uses simulated Claude responses — perfect for demos and local testing without any API costs.

### 4. Start the Backend Server

```bash
python -m uvicorn backend.api.main:app --reload --port 8000
```

API available at → `http://localhost:8000`
Interactive API docs → `http://localhost:8000/docs`

---

## 🖥️ Frontend Setup

### 1. Install Node Dependencies

```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Start the Dev Server

```bash
npm run dev
```

Dashboard available at → `http://localhost:5173`

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

---

## 🛡️ Offline Resilience & Demo Mode

ResearchMind is designed to remain usable even without live API access:

- **Local Caching**: The search agent caches all API responses under `backend/db/cache/`. Repeated queries are served from the cache instantly.
- **Committed Fallback Dataset**: If the system is fully offline or rate-limited, it automatically falls back to:
  - `fallback_dataset/cache/` — pre-fetched paper search results
  - `fallback_dataset/results_attention_mechanisms.json` — a complete pre-computed pipeline result for the query *"attention mechanisms"*

---

## 📦 Python Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | REST API framework |
| `uvicorn` | ASGI server |
| `langgraph` | Multi-agent workflow orchestration |
| `chromadb` | Vector store for semantic search |
| `anthropic` | Claude LLM client |
| `google-genai` | Gemini LLM client |
| `networkx` | Citation graph construction & analysis |
| `reportlab` | PDF report generation |
| `python-docx` | DOCX report generation |
| `pydantic` | Data validation & models |
| `requests` | HTTP client for arXiv/Semantic Scholar |
| `python-dotenv` | Environment variable loading |
| `pytest` | Test runner |

---

## 🗺️ Frontend Components

| Component | Description |
|---|---|
| `QueryForm` | Research topic input, year range, domain, and max-papers filters |
| `ProgressTracker` | Real-time display of each agent's status (pending / running / done / error) |
| `OverviewPanel` | High-level summary cards and identified gap claim tiles |
| `ComparisonTable` | Sortable, searchable paper comparison matrix |
| `GraphViewer` | Interactive citation/similarity graph with force-directed layout |
| `SourcesSidebar` | Detailed sidebar for individual paper metadata and abstracts |
| `ReportExport` | One-click PDF and DOCX export with preview |

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
