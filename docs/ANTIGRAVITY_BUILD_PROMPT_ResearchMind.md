# ResearchMind — Full Build Prompt for AI Coding Agent

You are building **ResearchMind**, an agentic AI system that automates literature review and
research gap discovery. This prompt is the complete, self-contained specification. Follow it
exactly — do not add agents, swap the graph backend, or expand scope beyond what is defined here.
Every design decision below has already been made and reviewed; implement it, don't redesign it.

---

## 1. Project Summary

Given a free-text research topic, the system retrieves candidate papers from arXiv and Semantic
Scholar, extracts structured per-paper data, builds a citation/co-authorship/topic-similarity
graph, detects candidate research gaps from that graph, and compiles a traceable report exported
to PDF/DOCX.

**Core differentiator (do not lose this in implementation):** every identified research gap must
carry a `subgraph_snapshot` — the exact set of graph nodes/edges that produced it — so a user can
independently verify the claim. This is more important than any other feature. If you have to cut
scope somewhere, cut elsewhere, not here.

**Explicitly out of scope — do not build these:**
- Matching Elicit/Consensus corpus scale or synthesis engines
- Multi-tenant features: auth, billing, teams, SSO
- Non-English paper support
- A hosted/persistent graph database (see Section 3 — NetworkX only, in-memory)
- Full PRISMA protocol pre-registration

---

## 2. Tech Stack (exact — do not substitute)

| Layer | Choice | Notes |
|---|---|---|
| Orchestration | **LangGraph** | State machine over agent nodes, not a free-form chat loop |
| LLM | **Claude API (Anthropic)** | Used for extraction/summarization; every claim must be source-grounded |
| Vector DB | **ChromaDB** | Local, in-process, no external server |
| Graph library | **NetworkX** | In-memory Python graph. Do NOT use Neo4j or any hosted graph DB — this was a deliberate decision to remove infrastructure/deployment risk for a live demo |
| Backend | **FastAPI** | Async |
| Frontend | **React + Tailwind CSS** | Dashboard: query input, live per-agent progress, comparison table, graph visualization |
| PDF processing | **PyMuPDF** (default), Grobid optional/stretch only | Do not spend build time on Grobid setup before PyMuPDF is working end to end |
| Graph visualization | **Cytoscape.js or D3.js** | Renders NetworkX's node-link JSON export |
| External APIs | **arXiv API** (no key), **Semantic Scholar API** (free-tier key) | |

---

## 3. Architecture

Five layers, strictly separated:

```
Presentation Layer   → React + Tailwind dashboard. Talks ONLY to FastAPI, never directly
                        to an agent or external API.
Application Layer    → FastAPI (REST endpoints) + LangGraph orchestrator (6-agent state machine)
Agent Layer          → 6 agents, each a LangGraph node (see Section 4)
Data Layer           → ChromaDB (embeddings) + NetworkX (in-memory graph, per-session)
                        + local cache (API responses, fallback dataset)
External Services    → arXiv API, Semantic Scholar API, Claude API
```

NetworkX and ChromaDB are both **in-process, in-memory, single-session** — there is no persistent
multi-user database. This is intentional, not a shortcut to fix later.

---

## 4. The 6-Agent Pipeline (locked — do not add or remove agents)

Do not build the originally-considered 12-agent version. Six agents only:

1. **Planner Agent** — decomposes the input topic into sub-queries, sets retrieval filters
2. **Search Agent** — queries arXiv + Semantic Scholar, deduplicates, ranks
3. **Extraction Agent** — pulls full text (PyMuPDF), extracts structured fields
4. **Synthesis Agent** — produces grounded per-paper summaries + comparison table
5. **Graph/Gap Agent** — builds the NetworkX graph, runs the gap-detection heuristic
6. **Report Agent** — compiles the final report, exports PDF/DOCX

Each agent implements a strict contract: `run(state) -> state`. Build and test each agent in
isolation against this contract before wiring the full LangGraph pipeline.

### 4.1 Agent Contracts

| Agent | Input | Output |
|---|---|---|
| Planner | `topic: str, filters: dict` | `sub_queries: list[str]` |
| Search | `sub_queries: list[str]` | `papers: list[PaperMeta]` (deduplicated by DOI/arXiv ID/title similarity) |
| Extraction | `papers: list[PaperMeta]` | `extracted_fields: list[FieldRecord]` |
| Synthesis | `extracted_fields: list[FieldRecord]` | `summaries: list[Summary], comparison_table` |
| Graph/Gap | `papers + embeddings` | `graph_ref, gap_claims: list[GapClaim]` |
| Report | all prior state | `report_draft, export files (PDF/DOCX)` |

### 4.2 Shared Pipeline State (LangGraph passes this through all 6 nodes)

```python
class PipelineState:
    query: str
    filters: dict            # { year_range, venue_type, keywords }
    sub_queries: list[str]
    papers: list[PaperMeta]
    extracted_fields: list[FieldRecord]
    summaries: list[Summary]
    comparison_table: DataFrame
    graph_ref: networkx.MultiDiGraph
    gap_claims: list[GapClaim]
    report_draft: ReportDocument
    agent_status: dict[str, Literal["pending", "running", "done", "error"]]
```

`agent_status` powers the live per-agent progress UI — each agent must update its own status
before and after execution. FastAPI streams this to the frontend via `/status/{job_id}`.

---

## 5. Detailed Agent Behavior

### 5.1 Planner Agent
- Accept free-text topic + optional filters (year range, venue type, keywords)
- Decompose into ≥2 distinct sub-queries covering different facets of the topic
- Validate input; reject empty/invalid topics with a clear error, not a crash

### 5.2 Search Agent
- Query both arXiv API and Semantic Scholar API for every sub-query
- Deduplicate by DOI, arXiv ID, and title similarity
- **Build caching and exponential backoff now, in this phase — not later.** A rate-limit
  failure here blocks every downstream agent. On a 429 response, back off and use cached
  results if available.

### 5.3 Extraction Agent
- Pull full text via PyMuPDF where a PDF is accessible
- Where full text is unavailable, fall back to abstract-only processing and explicitly flag
  the record as `abstract_only: true` — never fail silently
- Extract structured fields per paper: `method, dataset, key_metric, limitation, year`
- **Grounding requirement:** every extracted field must be verified against the source text.
  Run a verification pass that checks whether the extracted value actually appears in/is
  supported by the source document. Flag unmatched values instead of silently including them.
  This is a hard requirement — hallucinated metrics are the single biggest credibility risk
  for this project.

### 5.4 Synthesis Agent
- Produce per-paper summaries with **sentence-level source attribution** (every sentence in
  a summary must be traceable to specific source text)
- Compile a comparison table across all processed papers using the extracted structured fields

### 5.5 Graph/Gap Agent
Build an in-memory NetworkX `MultiDiGraph` with this schema:

**Nodes:**
- `Paper` — id (DOI/arXiv ID), title, year, venue, abstract, full_text_available, citation_count
- `Author` — id, name, affiliation
- `Topic` — id, label, embedding_centroid

**Edges:**
- `CITES` (directed, Paper→Paper) — source, target, year_of_citation
- `AUTHORED_BY` (Paper→Author) — author_position
- `CO_AUTHORED_WITH` (undirected, Author↔Author) — shared_paper_count
- `BELONGS_TO` (Paper→Topic) — membership_score
- `SIMILAR_TOPIC` (weighted, Paper↔Paper) — weight = cosine similarity of ChromaDB embeddings

**Gap detection heuristic (v1 — keep this simple, do not over-engineer):**
1. Group papers into topic clusters using `BELONGS_TO` edges and embedding similarity
2. For each cluster, compute citation density in the last 3 years (citation count / paper
   count, filtered by `CITES` edge `year_of_citation`)
3. Clusters below the median density across all clusters are flagged as candidate gaps
4. For every flagged cluster, extract the induced subgraph (its nodes and all incident edges)
   and store it as `subgraph_snapshot` — this is the auditability feature, do not skip it
5. **Minimum corpus size = 15 papers.** Below this, skip gap detection entirely and return a
   clear "insufficient data for gap detection" message. Never return a low-confidence guess.

### 5.6 Report Agent
- Compile: introduction, comparison table, identified gaps (each with its subgraph evidence),
  trend/frequency view (as a report subsection, not a separate agent), suggested future
  directions
- Export to both PDF and DOCX
- Every factual claim in the report must be traceable to a specific source paper/section —
  100% traceability, no exceptions

---

## 6. Data Schemas

### 6.1 ChromaDB Collection
| Field | Type | Purpose |
|---|---|---|
| id | str | Same as NetworkX Paper node id — used to join the two stores |
| embedding | vector[float] | Sentence-transformer embedding of title + abstract |
| metadata.title | str | |
| metadata.year | int | |
| metadata.full_text_available | bool | Drives fallback-to-abstract logic |

---

## 7. REST API

| Endpoint | Method | Purpose |
|---|---|---|
| `/query` | POST | Submit topic + filters; returns `job_id`, starts pipeline async |
| `/status/{job_id}` | GET | Poll live `agent_status` for the progress UI |
| `/results/{job_id}` | GET | Comparison table, gap claims, subgraph snapshots |
| `/export/{job_id}` | GET | Download report as PDF or DOCX |

---

## 8. Repository Structure

```
researchmind/
├── backend/
│   ├── api/                 # FastAPI routes
│   │   ├── main.py
│   │   ├── routes/query.py
│   │   └── routes/export.py
│   ├── agents/               # One file per agent, each with run(state) -> state
│   │   ├── planner.py
│   │   ├── search.py
│   │   ├── extraction.py
│   │   ├── synthesis.py
│   │   ├── graph_gap.py
│   │   └── report.py
│   ├── orchestration/
│   │   └── pipeline.py       # LangGraph graph definition wiring the 6 agents
│   ├── data/
│   │   ├── vector_store.py   # ChromaDB wrapper
│   │   ├── graph_store.py    # NetworkX graph builder
│   │   └── cache.py          # API response cache + backoff
│   ├── clients/
│   │   ├── arxiv_client.py
│   │   ├── s2_client.py      # Semantic Scholar
│   │   └── claude_client.py
│   ├── requirements.txt
│   └── .env.example          # ANTHROPIC_API_KEY, SEMANTIC_SCHOLAR_API_KEY — never commit real keys
├── frontend/
│   ├── src/
│   │   └── components/
│   │       ├── QueryForm.jsx
│   │       ├── ProgressTracker.jsx
│   │       ├── ComparisonTable.jsx
│   │       ├── GraphViewer.jsx
│   │       └── ReportExport.jsx
│   ├── package.json
│   └── .env.example
├── tests/
│   ├── unit/                 # one test file per agent
│   ├── integration/          # agent-to-agent handoffs
│   └── e2e/                  # full pipeline runs on fixed test topics
├── fallback_dataset/          # committed cached results from a successful run, for demo resilience
├── README.md
└── .gitignore
```

---

## 9. Build Order (do not build agents in parallel — follow this sequence)

**Phase 1 — Retrieval end to end**
Search Agent working against arXiv + Semantic Scholar on 3 fixed test topics. Caching and
backoff built now, not deferred. Store metadata in ChromaDB.

**Phase 2 — Extraction on real PDFs**
Extraction Agent pulls full text, extracts structured fields, verification pass in place.
Manually spot-check 10 papers against the extracted table.

**Phase 3 — Graph and gap detection**
Build the NetworkX graph, implement the v1 gap heuristic exactly as specified in Section 5.5.
Enforce the 15-paper minimum. Every gap carries a subgraph_snapshot.

**Phase 4 — Report + UI**
Report Agent assembles all sections and exports PDF/DOCX. React dashboard with live per-agent
progress — this matters more for a demo than the final PDF alone.

**Phase 5 — Validation (do not skip)**
Curate 20–30 ground-truth papers across 2–3 topics from existing published surveys. Report
retrieval precision/recall, extraction correctness rate, and gap-claim agreement — honestly,
including failure cases. Commit a cached fallback dataset from a successful run as a demo-day
deliverable, not a last-minute contingency.

---

## 10. Non-Functional Targets

| Requirement | Target |
|---|---|
| Retrieval latency (50 candidate papers) | < 60 seconds |
| Full pipeline (query → report, 20 papers) | < 5 minutes |
| Extraction accuracy (manual spot-check) | ≥ 80% field-level correctness |
| Citation traceability | 100% of report claims link to a source |
| Scalability | Handle 100+ papers per query without redesign |
| Demo resilience | Cached fallback dataset available if live APIs are rate-limited |

---

## 11. Known Failure Modes — Handle Explicitly, Don't Hide

| Failure Mode | Required Handling |
|---|---|
| API rate limits mid-run | Cached fallback dataset switches in automatically; no crash |
| LLM invents a metric not in the paper | Verification pass flags it; never silently included |
| Sparse graph on a niche topic | Gap detection skipped below 15-paper minimum, clear message shown |
| PDF fully inaccessible (paywalled) | Falls back to abstract-only, flagged in output |

---

## 12. Testing Requirements

For each agent, write unit tests against its `run(state) -> state` contract using mock inputs.
Write integration tests for each agent-to-agent handoff. Write end-to-end tests that run all 3
fixed test topics through the full pipeline. Testing detail and exact test case IDs are defined
in the project's Test Plan document — implement tests to match that structure (test cases
TC-P01–TC-P03, TC-S01–TC-S03, TC-E01–TC-E04, TC-Y01–TC-Y02, TC-G01–TC-G04, TC-R01–TC-R03, plus
accuracy validation TC-A01–TC-A04 and failure-mode TC-F01–TC-F04).

---

## 13. Deliverables Expected From This Build

- Working backend (`backend/`) with all 6 agents wired through LangGraph
- Working frontend (`frontend/`) with live progress UI, comparison table, graph viewer, export
- `README.md` with setup instructions (env vars needed, how to run backend + frontend locally)
- `.env.example` files (backend and frontend) — no real keys committed, ever
- `fallback_dataset/` populated with a real successful run's cached output
- Test suite covering unit, integration, and e2e levels per Section 12
- Clean git history with meaningful commits per phase (Phase 1 commit, Phase 2 commit, etc.) —
  this matters for demonstrating incremental, real progress, not one giant commit

---

## 14. Differentiation Statement (keep this in mind throughout the build)

"Unlike Elicit or Consensus, which return conclusions without showing their reasoning graph,
ResearchMind exposes the citation subgraph behind every claimed research gap — the user can
trace exactly which papers and missing links produced that conclusion." Every implementation
decision should protect this property. If a shortcut would break subgraph traceability, don't
take it.
