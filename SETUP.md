# ResearchMind: Setup Guide

How to get ResearchMind running on your machine. For what the project does and how it works, see [README.md](README.md).

**You will run two processes:** a Python backend on port **8000** and a Vite frontend on port **5173**.

The steps below were checked on Python 3.12 and Node 22: dependencies install cleanly, the backend starts, all 25 tests pass, and the frontend builds.

---

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.10+ | `python --version` (or `python3 --version`) |
| Node.js | 18+ (with npm) | `node --version` |
| Git | any | `git --version` |

You also need internet access: the backend calls arXiv and Semantic Scholar, and ChromaDB downloads a small embedding model the first time it runs.

**API keys (all optional for a first run):**

| Key | Purpose | Without it |
|---|---|---|
| `GEMINI_API_KEY` | Real LLM output (planning, extraction, summaries, reports, Q&A) | App runs in **mock mode** with simulated responses |
| `SEMANTIC_SCHOLAR_API_KEY` | Higher Semantic Scholar rate limits | Works, but may hit rate limits (429) more often |

Get a Gemini key from Google AI Studio (https://aistudio.google.com/apikey).

---

## 2. Get the code

```bash
git clone <your-repo-url> Research-mind
cd Research-mind
```

If you downloaded a ZIP instead, unzip it and `cd` into the folder (it may be named `Research-mind-main`).

All backend commands below run from this **repository root**, not from inside `backend/`. The code imports as `backend.…`, so the working directory matters.

---

## 3. Backend

### 3.1 Create a virtual environment

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell)**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first.

### 3.2 Install dependencies

```bash
pip install -r backend/requirements.txt
```

This pulls in FastAPI, LangGraph, ChromaDB, PyMuPDF, ReportLab, python-docx, the Google GenAI SDK and others. ChromaDB is the largest, so the first install can take a few minutes.

### 3.3 Configure environment variables

```bash
cp backend/.env.example backend/.env          # Windows: copy backend\.env.example backend\.env
```

Edit `backend/.env`. The file **must** be at `backend/.env`; that is where the app looks for it.

```ini
PORT=8000
HOST=0.0.0.0

# LLM (leave as the placeholder to run in mock mode)
GEMINI_API_KEY=your-real-gemini-key

# Optional, recommended
SEMANTIC_SCHOLAR_API_KEY=your-semantic-scholar-key

# Auth
JWT_SECRET_KEY=<long random string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
```

Notes:

- Generate a secret with `python -c "import secrets; print(secrets.token_hex(32))"`. If `JWT_SECRET_KEY` is missing, the app silently uses a hardcoded development value, which is not safe beyond your own machine.
- `ANTHROPIC_API_KEY` appears in `.env.example` but nothing reads it. You can delete that line.
- `GOOGLE_API_KEY` is accepted as an alternative to `GEMINI_API_KEY`.
- `PORT` and `HOST` in this file are **not** used when you start with `uvicorn` as shown below. Pass `--port` / `--host` on the command line instead.
- Never commit `backend/.env`. It is already in `.gitignore`.

### 3.4 Start the server

From the repository root, with the virtual environment active:

```bash
python -m uvicorn backend.api.main:app --reload --port 8000
```

On startup the app creates the SQLite database and the folders it needs under `backend/db/` (`researchmind.db`, `langgraph_checkpoints.db`, plus `chroma/`, `cache/` and `exports/` as they are used). You don't need to create anything by hand.

### 3.5 Check that it works

```bash
curl http://localhost:8000/health
# {"status":"healthy"}
```

Also open http://localhost:8000/docs for the interactive API explorer.

If you did not set a Gemini key, the logs will say `GEMINI_API_KEY not set. Running in Mock Mode.` That is expected.

---

## 4. Frontend

Open a **second terminal**.

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

The frontend expects the backend at `http://localhost:8000`. Keep the backend running, or searches will fail with a connection error.

### Other npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `frontend/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

---

## 5. Try it

1. Go to http://localhost:5173 and choose to start a new research.
2. Enter a topic, for example `attention mechanisms in transformers`, and optionally set the year range.
3. Watch the six agents progress. A run typically takes a few minutes with a real LLM, because it downloads and reads many PDFs.
4. Explore the tabs: **Papers**, **Overview**, **Comparison**, **Gaps**, **Graph**, **Assistant**, **Reports**.
5. Export a PDF or DOCX from the **Reports** tab.

**Accounts are optional.** Without logging in everything works, but only signed-in users get their sessions saved to **History**.

**Getting no gaps or an empty graph?** Gap detection needs at least 15 papers. Broaden the topic or widen the year range.

---

## 6. Run the tests

From the repository root, with the virtual environment active:

```bash
python -m pytest tests -q
```

Expected: `25 passed`. Tests mock the LLM and network, so no keys or internet are needed.

---

## 7. Offline or demo mode

- **No Gemini key:** the app runs end to end with simulated LLM responses (mock mode). Good for exploring the UI and for development. The paper search itself still goes to arXiv and Semantic Scholar.
- **No internet for search:** `fallback_dataset/cache/` holds a committed snapshot of search results for a small set of queries (the demo topic is "attention mechanisms"). Cache keys depend on the exact query text, year range and result limit, so only matching searches are served from it.
- **No internet for embeddings:** if ChromaDB cannot download its embedding model, the app falls back to hash-based vectors. Everything still runs, but topic-similarity edges and gap results are marked as degraded.

To rebuild the fallback snapshot, run a search while online so the local cache fills, then run from the repository root:

```bash
python -m fallback_dataset.generate_fallback
```

---

## 8. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `ModuleNotFoundError: No module named 'backend'` | You are inside `backend/` or ran a different command. Run from the repository root with `python -m uvicorn backend.api.main:app …`. |
| `uvicorn: command not found` | The virtual environment isn't active. Activate it, or use `python -m uvicorn`. |
| Frontend shows "Failed to submit query" or a connection error | Backend isn't running or isn't on port 8000. Check `curl http://localhost:8000/health`. |
| Backend log says "Running in Mock Mode" | `GEMINI_API_KEY` is missing, still the placeholder, or invalid. Check `backend/.env`, then restart the server. |
| Log shows `API call failed … Falling back to mock` | The Gemini call failed (bad key, quota, model access or network). The pipeline continues with mock output for that call. Fix the key or quota and rerun. |
| Semantic Scholar `429` / slow searches | Add `SEMANTIC_SCHOLAR_API_KEY`. Calls already retry with backoff. |
| First run is slow or warns "Embedding model unavailable" | ChromaDB is downloading (or failed to download) its embedding model. Wait, or check your connection. Results are marked degraded until it loads. |
| Port 8000 already in use | Start with another port, e.g. `--port 8001`, **and** update the hardcoded `http://localhost:8000` URLs in the frontend (see below). |
| CORS errors in the browser console | The backend allows all origins by default, so this usually means the backend is down or the URL is wrong. |
| Edited `.env` but nothing changed | Restart uvicorn. The file is read once at startup. |
| Want a clean slate | Stop the backend and delete `backend/db/researchmind.db`, `backend/db/langgraph_checkpoints.db`, `backend/db/chroma/`, `backend/db/cache/`, `backend/db/exports/`. They are recreated on the next start. |

### Changing the backend URL or port

The API address `http://localhost:8000` is hardcoded in several frontend files (not an env variable). To change it, search for it:

```bash
grep -rn "localhost:8000" frontend/src
```

Files in the live app: `context/AuthContext.jsx`, `context/ResearchContext.jsx`, `pages/HistoryPage.jsx`, `components/HistorySidebar.jsx`, `components/QAAssistant.jsx`, `components/ReportExport.jsx`. (`App.jsx` and `components/QueryForm.jsx` also contain it but are not used by the current router.) A good improvement is to replace these with a single `import.meta.env.VITE_API_URL`.

---

## 9. Before you deploy anywhere public

This setup is built for local use. At minimum:

- Set a strong `JWT_SECRET_KEY`.
- Restrict `allow_origins` in `backend/api/main.py` (currently `["*"]`).
- Point the frontend at your real API URL and run `npm run build`, then serve `frontend/dist/`.
- Run uvicorn without `--reload`, behind HTTPS.
- Remember that jobs are held in memory and `researchmind.db` is a local SQLite file, so use a single worker process and back up the file if sessions matter.
