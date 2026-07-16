# ResearchMind

**ResearchMind** is an agentic AI literature review and gap discovery assistant designed to automate systematic research reviews. Unlike black-box search engines, ResearchMind builds a citation and topic similarity network, uses it to locate research gaps with below-median citation density, and displays the inspectable citation subgraph behind each gap for auditability and verification.

---

## Repository Structure

```
Research-Mind/
├── backend/
│   ├── api/                 # FastAPI server and routes
│   ├── agents/              # 6-agent LangGraph workflow stages
│   ├── orchestration/       # LangGraph wiring and shared state
│   ├── data/                # Vector store (ChromaDB) and Graph store (NetworkX)
│   ├── clients/             # arXiv, Semantic Scholar, and Claude clients
│   └── requirements.txt     # Python requirements
├── frontend/                # Vite + React Dashboard application
│   ├── src/                 # React source and glassmorphic styling
│   └── package.json         # Node dependencies
├── tests/
│   ├── unit/                # Unit tests for agents and utilities
│   └── integration/         # Integration test for the full LangGraph pipeline
└── fallback_dataset/        # Committed cached papers and final state JSON
```

---

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher (npm 9+)

---

## Backend Installation & Setup

1. **Activate the pre-created Python virtual environment** (named `venv/` at the root folder):
   - **On Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **On Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **On macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory by copying `backend/.env.example`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Open `backend/.env` and enter your API keys. If the keys are left as placeholder values, the backend will automatically run in **Mock Mode**, using simulated Claude responses for local testing and demonstration.
   - `ANTHROPIC_API_KEY`: Anthropic Claude API Key (optional).
   - `SEMANTIC_SCHOLAR_API_KEY`: Semantic Scholar Free-tier API Key (optional but recommended to prevent rate limits).

3. **Run Backend Server**:
   Start the FastAPI development server:
   ```bash
   python -m uvicorn backend.api.main:app --reload --port 8000
   ```
   The backend will be available at `http://localhost:8000`.

---

## Running Backend Tests

Run all unit and integration tests using pytest:
```bash
python -m pytest
```

---

## Frontend Installation & Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run Vite development server**:
   ```bash
   npm run dev
   ```
   The dashboard will be available in your browser at `http://localhost:5173`.

---

## Offline Resilience & Demo Mode

- **Local Caching**: The search agent automatically caches results under `backend/db/cache/`.
- **Committed Fallback Dataset**: If you execute a query offline or get rate-limited, the system will fall back to reading matching searches from `fallback_dataset/cache/` and load the pre-computed final results from `fallback_dataset/results_attention_mechanisms.json`.
