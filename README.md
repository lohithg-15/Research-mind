# 🧠 ResearchMind

**Agentic literature review and research-gap discovery.**

Give ResearchMind a topic. It searches arXiv and Semantic Scholar, reads the papers, extracts structured facts from each one, builds a graph of how the papers relate, and flags clusters of work that look under-connected and under-cited. Every flagged gap ships with the exact subgraph that produced it, so you can inspect the evidence instead of trusting a label.

> New here? Go straight to **[SETUP.md](SETUP.md)** to run it locally.

---

## Contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [How gaps are detected](#how-gaps-are-detected)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Data models](#data-models)
- [Frontend](#frontend)
- [Resilience and mock mode](#resilience-and-mock-mode)
- [Testing](#testing)
- [Known limitations](#known-limitations)

---

## What it does

| Capability | Details |
|---|---|
| **Multi-source search** | Queries arXiv and Semantic Scholar in parallel, then deduplicates by DOI, arXiv ID and title similarity. |
| **Grounded extraction** | For each paper, extracts *method, dataset, key metric, limitation*. Reads the full PDF when available, falls back to the abstract. Each record carries a verification status. |
| **Source-attributed summaries** | Three-sentence summaries where each sentence is tagged `[Source: Method]`, `[Source: Dataset]`, etc. |
| **Comparison table** | One row per paper with the extracted fields and a verification badge. |
| **Graph + gap detection** | Paper, author and topic graph (NetworkX). Gaps are scored statistically against a bootstrap null, and each carries a `subgraph_snapshot`. |
| **Interactive graph view** | Cytoscape.js viewer in the browser. |
| **Q&A assistant** | Ask questions about the collected papers, by paper number, title, author or topic. |
| **Report export** | LLM-written introduction, thematic synthesis and gap narratives, exported as **PDF** and **DOCX**. |
| **Accounts and history** | Optional JWT login. Signed-in users get their sessions saved to SQLite and can reopen them later. |
| **Cancel and resume** | Jobs can be cancelled cooperatively via the API. LangGraph checkpoints every step to SQLite so a run can be resumed. |
| **Mock mode** | Runs end to end with no LLM key, using deterministic simulated responses. |

---

## How it works

A single LangGraph `StateGraph` runs six agents in a fixed sequence, all sharing one `PipelineState` dictionary.

```
 Query ─▶ Planner ─▶ Search ─▶ Extraction ─▶ Synthesis ─▶ Graph/Gap ─▶ Report
          │           │          │              │             │             │
          sub-queries papers     per-paper      summaries +   NetworkX      markdown +
          (2–4)       + vectors  fields +       comparison    graph + gap   PDF + DOCX
                      (Chroma)   verification   table         claims
```

| # | Agent | File | What it does |
|---|---|---|---|
| 1 | **Planner** | `agents/planner.py` | Asks the LLM to split the topic into 2–4 specific sub-queries. Falls back to `[topic]` on any failure. |
| 2 | **Search** | `agents/search.py` | Runs every sub-query against arXiv and Semantic Scholar (15 results each, up to 6 threads). Applies the year filter, merges duplicates, and stores title + abstract embeddings in ChromaDB. |
| 3 | **Extraction** | `agents/extraction.py` | Downloads each PDF, extracts text with PyMuPDF, and sends the first 12,000 characters to the LLM along with a request for supporting quotes. Quotes are fuzzy-matched against the source text. Papers without a usable PDF use an abstract-only prompt. If the LLM fails, a regex heuristic fills the fields. Up to 8 papers in parallel. |
| 4 | **Synthesis** | `agents/synthesis.py` | Writes a source-attributed summary per paper and assembles the comparison table. Up to 8 in parallel. |
| 5 | **Graph/Gap** | `agents/graph_gap.py` | Builds the graph, clusters papers into 3–5 topics with the LLM (keyword fallback if that fails), and scores each cluster for gap-likeness. **Needs at least 15 papers**, otherwise it is skipped and no gaps or graph are returned. |
| 6 | **Report** | `agents/report.py` | Generates the introduction, thematic synthesis and per-gap narratives, then writes a Markdown draft plus PDF (ReportLab) and DOCX (python-docx) files to `backend/db/exports/`. |

Cancellation is cooperative. The flag is checked between agents and between per-paper tasks. It does not interrupt an LLM or network call already in flight.

### Pipeline state

| Field | Written by | Description |
|---|---|---|
| `query`, `filters` | API | Topic and filters (`year_range`, plus `venue_type` / `keywords` from the UI) |
| `sub_queries` | Planner | 2–4 search strings |
| `papers` | Search | Deduplicated `PaperMeta` list |
| `extracted_fields` | Extraction | `FieldRecord` per paper |
| `summaries` | Synthesis | `Summary` per paper |
| `comparison_table` | Synthesis | Flat rows for the UI |
| `graph_ref` | Graph/Gap | Graph as node-link JSON (`null` if under 15 papers) |
| `gap_claims` | Graph/Gap | `GapClaim` list |
| `report_draft` | Report | `text`, `synthesis_text`, `introduction_text`, `pdf_path`, `docx_path` |
| `agent_status` | All | `pending` → `running` → `done` / `error` / `cancelled`, per agent |

---

## How gaps are detected

The gap logic lives in `backend/agents/graph_gap.py`.

**Graph.** `GraphStore` builds a `MultiDiGraph` with:

- Nodes: `Paper`, `Author`, `Topic`
- Edges: `AUTHORED_BY`, `CO_AUTHORED_WITH`, `CITES` (only between papers in the corpus), `SIMILAR_TOPIC` (cosine similarity ≥ 0.6 on ChromaDB embeddings), and `BELONGS_TO` (paper → topic cluster)

**Scoring.** For each topic cluster:

- **Pace** is the number of in-corpus `CITES` edges pointing at the cluster's papers, divided by the sum of those papers' ages in years. This is an age-adjusted citation rate.
- **Isolation** is the weakest bridge to any other cluster: `SIMILAR_TOPIC` edges between the two clusters, divided by `(within_A + within_B + 1)`.
- **Gap score** is `normalize(isolation) − normalize(pace)`. A high score means low citation pace and weak connection to the rest of the field.

**Significance.** Paper IDs are shuffled across clusters 100 times (preserving cluster sizes) to build a null distribution. A cluster is flagged only if its score is at or above the **90th percentile** of that null.

**Evidence.** Each `GapClaim` includes `subgraph_snapshot`, the induced subgraph of the cluster's papers, their authors and the topic node, so the claim can be audited.

**Honesty flags.** If the embedding model could not load, similarity edges come from a hash-based fallback and the gap is marked `signal_degraded` with a warning in its description. If the whole corpus has near-zero citation pace, the description says the corpus may be too recent for a meaningful signal.

---

## Tech stack

| Layer | Technology |
|---|---|
| Orchestration | LangGraph `StateGraph` + `SqliteSaver` checkpointer |
| LLM | Google Gemini via `google-genai` (model set in `backend/clients/claude_client.py`) |
| Vector store | ChromaDB (persistent), default embedding function with hash-vector fallback |
| Graph | NetworkX |
| API | FastAPI + Uvicorn |
| Database / auth | SQLite, JWT (`python-jose`), `bcrypt` |
| PDF parsing | PyMuPDF |
| Exports | ReportLab (PDF), python-docx (DOCX) |
| Frontend | React 19, React Router 6, Vite 8, Cytoscape.js, lucide-react |
| Tests | pytest |

> **Naming note:** `claude_client.py` and the `ClaudeClient` class are historical names. The client now wraps **Gemini**. The class name was kept so agent imports didn't change. `ANTHROPIC_API_KEY` in `.env.example` is not read by any code.

---

## Project structure

```
Research-mind/
├── backend/
│   ├── .env.example               # Copy to .env and fill in
│   ├── requirements.txt
│   ├── logging_utils.py           # [job=<id>] log prefixing
│   ├── agents/                    # planner, search, extraction, synthesis, graph_gap, report
│   ├── api/
│   │   ├── main.py                # FastAPI app, CORS, /status, /health
│   │   ├── deps.py                # JWT create/decode, auth dependencies
│   │   ├── jobs.py                # In-memory job store, cancellation flags, restore-from-DB
│   │   └── routes/                # query.py, auth.py, history.py, export.py
│   ├── clients/
│   │   ├── claude_client.py       # Gemini wrapper + mock mode
│   │   ├── arxiv_client.py
│   │   └── s2_client.py
│   ├── data/
│   │   ├── models.py              # Pydantic models
│   │   ├── cache.py               # File cache with TTL + backoff decorator
│   │   ├── vector_store.py        # ChromaDB wrapper
│   │   └── graph_store.py         # NetworkX graph builder
│   ├── db/
│   │   ├── database.py            # SQLite schema (users, research_sessions)
│   │   └── …                      # Created at runtime: researchmind.db, chroma/, cache/, exports/
│   └── orchestration/pipeline.py  # LangGraph wiring + PipelineState
├── frontend/
│   ├── src/
│   │   ├── router.jsx             # Routes (the real entry point)
│   │   ├── context/               # AuthContext, ResearchContext
│   │   ├── pages/                 # Landing, Login, Signup, NewResearch, Progress, Workspace, PaperDetail, History
│   │   │   └── tabs/              # Papers, Overview, Comparison, Gaps, Graph, Assistant, Reports
│   │   └── components/            # Navbar, GraphViewer, ComparisonTable, QAAssistant, ReportExport, …
│   └── package.json
├── fallback_dataset/              # Committed cache snapshot for offline demos
├── tests/
│   ├── unit/                      # 8 test modules
│   └── integration/test_pipeline.py
└── docs/                          # PRD, SRS, build guide, test plan
```

`frontend/src/App.jsx`, `components/QueryForm.jsx` and `src/__graphtest_data.json` are not used by the current router and look like leftovers from an earlier single-page version.

---

## API reference

Base URL: `http://localhost:8000`. Interactive docs at `/docs`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/query` | optional | Start a job. Body: `{"query": "...", "filters": {"year_range": [2018, 2025]}}`. Returns `{"job_id": "..."}`. Results auto-save to history if you send a valid token. |
| `GET` | `/status/{job_id}` | – | Job status, per-agent status, `mock_mode`, timestamps, error. |
| `GET` | `/results/{job_id}` | – | Papers, comparison table, gap claims, graph, summaries, sub-queries, report draft. Returns a "still processing" message while running. |
| `POST` | `/jobs/{job_id}/cancel` | – | Request cooperative cancellation. |
| `POST` | `/qa` | – | Ask a question about a finished job. Body: `{"job_id", "question", "history"?}`. |
| `GET` | `/export/{job_id}?format=pdf\|docx` | – | Download the generated report. |
| `POST` | `/auth/register` | – | `{email, password}` (min 6 chars) → `{token, user_id, email}`. |
| `POST` | `/auth/login` | – | Same response shape. |
| `GET` | `/auth/me` | required | Current user. |
| `GET` | `/history` | required | List saved sessions. |
| `GET` | `/history/{id}` | required | Full saved results for one session. |
| `DELETE` | `/history/{id}` | required | Delete a session. |
| `GET` | `/health` | – | `{"status": "healthy"}` |

Authenticated requests send `Authorization: Bearer <token>`.

**Job lifecycle:** `pending` → `running` → `done` | `error` | `cancelled`. The frontend polls `/status`, then loads `/results`.

---

## Data models

Defined in `backend/data/models.py`.

- **`PaperMeta`**: `id`, `title`, `authors`, `year`, `venue`, `abstract`, `pdf_url`, `url`, `full_text_available`, `citation_count`, `citations`, `doi`, `arxiv_id`, `source` (`arxiv`, `semantic_scholar` or `merged`)
- **`FieldRecord`**: `paper_id`, `method`, `dataset`, `key_metric`, `limitation`, `year`, `verification_status` (`verified`, `unverified`, `failed`, `heuristic`), `verification_notes`, `abstract_only`
- **`Summary`**: `paper_id`, `title`, `summary_text`, `attributions[]` (sentence → source tag)
- **`GapClaim`**: `gap_id`, `topic_label`, `description`, `citation_density` (the pace value), `papers_in_cluster`, `subgraph_snapshot`, `suggested_directions`, `signal_degraded`

### Database

SQLite file `backend/db/researchmind.db`, created on startup:

- `users(id, email UNIQUE, hashed_password, created_at)`
- `research_sessions(id, user_id → users, query, filters, results, title, created_at)`

LangGraph checkpoints live in a separate `backend/db/langgraph_checkpoints.db`.

---

## Frontend

Routes (`frontend/src/router.jsx`):

| Path | Page |
|---|---|
| `/` | Landing |
| `/login`, `/signup` | Auth |
| `/research/new` | Query form with year, venue-type and keyword filters |
| `/research/:jobId/progress` | Live per-agent progress |
| `/research/:jobId/:tab` | Workspace. Tabs: `papers`, `overview`, `comparison`, `gaps`, `graph`, `assistant`, `reports` |
| `/research/:jobId/paper/:paperId` | Single paper detail |
| `/history` | Saved sessions (login required) |

Each URL is deep-linkable. Reloading a workspace restores the job from the backend. Research state is also persisted in the browser's `localStorage`, so a page reload keeps your place.

---

## Resilience and mock mode

- **No LLM key:** `ClaudeClient` switches to a deterministic mock that parses the paper text in the prompt and returns plausible fields. `/status` and `/results` report `mock_mode: true` (the current UI stores the flag but does not display a banner, so check the API or backend logs). Use this for UI work and tests.
- **LLM failure mid-run:** each call falls back to the mock response rather than crashing the pipeline, and extraction falls back to a regex heuristic marked `verification_status: "heuristic"`.
- **Rate limits and network errors:** arXiv and Semantic Scholar calls retry with exponential backoff.
- **File cache:** search results are cached in `backend/db/cache/` (arXiv: 30 days, Semantic Scholar: 3 days).
- **Offline demo data:** if a search is not in the local cache, `fallback_dataset/cache/` is checked next. It holds a committed snapshot for a small set of queries (the demo topic is "attention mechanisms") and never expires. Regenerate it with `fallback_dataset/generate_fallback.py`.
- **Embeddings unavailable:** if ChromaDB cannot load its embedding model (for example, no internet on first run), the app uses hash-seeded vectors and flags results as degraded.

---

## Testing

```bash
python -m pytest tests -q        # run from the repository root
```

25 tests cover caching, cancellation, extraction and grounding, graph/gap logic, planner, search and dedup, synthesis, report generation, and a mocked end-to-end pipeline run. No API keys or network are required.

---

## Known limitations

Worth knowing before you deploy or extend this.

- **Jobs live in memory.** A server restart loses running and unsaved jobs. Only sessions saved by logged-in users can be restored.
- **Gaps need at least 15 papers.** Narrow topics or tight year filters can fall below this and return no graph.
- **Citation signal is only in-corpus.** `CITES` edges are kept only when both papers are in the retrieved set, so pace is a relative signal within the corpus, not a global citation count. arXiv records carry no citation data; it comes from Semantic Scholar.
- **Gaps are heuristic.** A flagged cluster is a lead worth investigating, not proof that nobody has worked on it.
- **Filters:** only `year_range` is applied in search code. `venue_type` and `keywords` are passed to the planner prompt as context, which influences the sub-queries but does not hard-filter results.
- **Security defaults are for local use.** CORS allows all origins, and `JWT_SECRET_KEY` falls back to a hardcoded dev value if unset. Set a real secret and restrict CORS before exposing the API.
- **API URL is hardcoded.** The frontend calls `http://localhost:8000` in several files (see SETUP.md).
- **Cancel has no button in the current UI.** `POST /jobs/{id}/cancel` works, but only the legacy `App.jsx` called it.
- **Resume primitive is not exposed.** `retry_pipeline()` exists in `routes/query.py` but no endpoint calls it yet.
- **Embedding model download.** ChromaDB's default embedding model downloads on first use. Offline first runs fall back to degraded hash vectors.
- **Fallback embeddings are not stable across restarts**, because they are seeded with Python's per-process randomized `hash()`.

---

## Further reading

`docs/` contains the original PRD, SRS, build guide, test plan and the AI-agent build prompt this project was generated from. Where they disagree with the code (for example, the earlier "below-median citation density" gap rule), this README reflects the code.
