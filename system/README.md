# SwissHack26 — Advisory System (Multi-Agent)

LangGraph-powered multi-agent system that drives the wealth advisory
workbench. Each agent in the graph corresponds to a node in
`graph.drawio.xml`.

## Architecture

```
  USER                 DEPLOYMENT                    CLOUD
  ┌──────────┐     ┌─────────────────────┐    ┌──────────────────┐
  │ WM       │────▶│ Wealth Advisory Svr  │───▶│ Azure Confid.    │
  │ Computer │◀────│ LangGraph Orchestr.  │◀───│ GPU (LLM)        │
  └──────────┘     │                      │    └──────────────────┘
                   │  ┌─ DNA ──┐          │
                   │  │Decision│          │    ┌──────────────────┐
                   │  │Making  │          │───▶│ Enterprise       │
                   │  │PlanEval│          │◀───│ Knowledge        │
                   │  └────────┘          │    │ ┌─News Registry  │
                   │  Telemetry & Obs.    │    │ ├─GraphRAG      │
                   └─────────────────────┘    │ ├─Client DNA     │
                                               │ └─CRM Data       │
                           ┌────────────────┐  └──────────────────┘
                           │ SIX MCP Server  │────────▶
                           └────────────────┘
```

## Graph (Agent Flow)

```
  ┌─Start──▶ Get client DNA ──▶ Get CIO plan ──▶ Get current invest. plan
                                                    │
                                                    ▼
                                              Fetch news (GraphRAG)
                                                    │
                                                    ▼
                                           Check if actions needed
                                          ╱                    ╲
                                    (yes) ╱                      ╲ (no)
                                         ▼                        └──▶ END
                                 Create action plan
                                         │
                                         ▼
                                 Explain action plan
                                         │
                                         ▼
                               WM → HITL (apply / reject)
                                   ╱            ╲
                           (apply)╱              ╲(reject)
                                 ▼                └──▶ END
                         Evaluate plan quality
                                 │
                                 ▼
                                END
```

## Prerequisites

- **Python 3.11+**
- **Node 22+** (for the workbench server)
- **Docker** (for GraphRAG)

## Setup

```bash
cd system

# 1. Create your .env from the template
cp .env.example .env
# Edit .env with your LLM API key and endpoint

# 2. Install Python dependencies
pip install -e ".[dev]"

# 3. Start the workbench server (in another terminal)
cd ../server && npm install && npm run dev

# 4. Start GraphRAG (Docker)
docker compose up -d

# 5. Run the advisory system
python -m src.main
```

## Configuration

| Variable | Description |
|---|---|
| `LLM_API_BASE` | Remote LLM endpoint (Azure OpenAI compatible) |
| `LLM_API_KEY` | API key for the LLM |
| `LLM_MODEL_NAME` | Model deployment name (e.g. `gpt-4o`) |
| `SIX_MCP_SERVER_URL` | SIX MCP Server URL (not yet available) |
| `SIX_MCP_SERVER_API_KEY` | SIX MCP Server API key |
| `GRAPHRAG_API_URL` | Local GraphRAG API URL |
| `WORKBENCH_API_URL` | Workbench backend URL |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/system/health` | System health check |
| POST | `/api/system/trigger` | Run the advisory pipeline for a client |
| POST | `/api/system/hitl` | Submit WM HITL decision |

## Agents

| Agent | Source | Description |
|---|---|---|
| `get_client_dna` | Workbench API | Fetches client profile, portfolio, risk, communication style |
| `get_cio_plan` | Workbench API | Retrieves CIO mandate and investment universe |
| `get_current_plan` | Workbench API | Gets current holdings and drift status |
| `fetch_news` | GraphRAG + Workbench API | Semantic news retrieval + structured market data |
| `check_actions` | LLM | Determines if an advisory action is needed |
| `create_plan` | LLM | Generates a suggestion with tailored client message |
| `explain_plan` | LLM | Creates WM-facing explanation and client-facing message |
| `evaluate_plan` | LLM | Scores plan quality after WM decision |

## What's stubbed

- **LLM**: Configured for Azure OpenAI but `LLM_API_KEY` must be set. Raises `NotImplementedError` if missing.
- **SIX MCP Server**: Client implemented in `src/graph/tools/mcp_server.py` but `SIX_MCP_SERVER_URL` must be set when access is granted.
- **GraphRAG**: Docker Compose ready; needs news data in `graphrag/data/input/` and an LLM key for indexing.