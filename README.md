# swisshack26 — Next-Gen Wealth Advisory Workbench

A relationship/wealth-manager (**WM**) workbench for the SIX · Noumena · NTT Data
challenge *"The Next Generation of Wealth Advisory"*. The WM sees what changed
for each client, understands why (news → analysis → advice → action), and acts —
while the client always decides.

This repo holds two apps:

| Folder | What it is |
|---|---|
| `frontend/` | React + Vite + TypeScript SPA (the dashboard) |
| `server/` | Express + SQLite backend implementing the UML entities + WM use cases |
| `data/` | The challenge workbooks (CRM + portfolio) the backend seeds from |

> The backend here is a **real, working** reference (real persistence, real
> apply/drop mutations) seeded from the provided `.xlsx`. The agent-driven
> inference (news + suggestions) is currently seeded; it's where the parallel
> multi-agent system will plug in.

---

## Prerequisites

- **Node 22.12+** and npm. (Check with `node -v`. If you use nvm: `nvm use` —
  `.nvmrc` pins 22.12.0 in `frontend/`.)

## Run it (two terminals)

**1. Backend** — seeds the SQLite DB from `data/*.xlsx` on first boot:

```bash
cd server
npm install
npm run dev            # http://localhost:4000
```

**2. Frontend** — Vite dev server, proxies `/api` → `http://localhost:4000`:

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open **http://localhost:5173**.

To rebuild the database from the workbooks at any time:

```bash
cd server && npm run seed -- --reset
```

---

## How it's wired

```
 data/*.xlsx ──seed──▶ SQLite (server/data/workbench.db)
                          │
        Express REST API (server, :4000)
                          │  /api/*  (Vite proxy)
                React SPA (frontend, :5173)
```

- **Frontend → API:** `frontend/src/lib/api.ts` (fetch) + `lib/queries.ts`
  (react-query). Mutations invalidate `dashboard`/`customer` queries so the UI
  refetches automatically.
- **API → DB:** `server/src/index.ts` (routes), `server/src/repo.ts` (drift +
  apply/drop logic), `server/src/schema.ts` (DDL), `server/src/seed.ts` (xlsx →
  rows).

### API endpoints (the UML use cases)

| Use case | Endpoint |
|---|---|
| Get dashboard data (+ TLDR news) | `GET /api/dashboard` |
| Get client | `GET /api/customers/:id` |
| Add client data (comment) | `POST /api/customers/:id/comments` |
| Apply suggestion (records a transaction, swaps the holding) | `POST /api/suggestions/:id/apply` |
| Drop suggestion | `POST /api/suggestions/:id/drop` |

Per the brief, **news is shown on the WM dashboard, not inside the client view**
(even though the UML lists "get TLDR news" under "get client").

---

## App map (where to find things)

- **Dashboard** (`/`) — clients overview, action queue (pending suggestions),
  market signals (TLDR news). `frontend/src/pages/DashboardPage.tsx`
- **Clients** (`/clients`) — the book. `ClientsPage.tsx`
- **Client detail** (`/clients/:id`) — tabs: Holdings (donut + table),
  Suggestions (apply/drop), History, Relationship · DNA (CRM log + add data).
  `ClientDetailPage.tsx`
- **Action queue** (`/alerts`) — cross-book pending suggestions.

## Design

Palette follows the SIX reference UI: light neutral canvas, white cards, **SIX
red** as the accent (active nav, primary actions, alerts), green for positive
figures. Tokens live in `frontend/src/index.css` (`:root` / `.dark`). Type:
Bricolage Grotesque (display) · Inter (body) · IBM Plex Mono (tabular figures).

## Continuing the work

- The data layer is decoupled: to point the frontend at a different backend,
  keep the response shapes in `frontend/src/lib/api-types.ts`.
- The 4 personas (Räber, Schneider, Huber, Ammann) and their trigger scenarios
  are seeded in `server/src/seed.ts` — extend there.
- Tech-stack/setup notes (incl. the self-contained Node install used on the
  build machine) are in each app's own `README.md`.

## Status / TODO

- [ ] Replace seeded news/suggestions with the live multi-agent inference.
- [ ] Tailored advisory message generation (Message agent) — not yet built.
- [ ] SIX MCP / Event Registry live data wiring.
