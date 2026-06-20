# Polaris by SIX — Backend

Real persistence + WM use-case endpoints for the advisory workbench. Implements
the UML class diagram (WM, Customer, Comment, Holding, Transaction, Suggestion,
News, CIOMandate + enums) on **SQLite**, and the use cases from the UML as a
small REST API.

- **Express + better-sqlite3 + TypeScript** (run with `tsx`).
- **Real data, not mock:** the seed parses the provided workbooks in
  `../data/*.xlsx` with SheetJS — 274 portfolio holdings and the three-year CRM
  interaction logs become `holding` and `comment` rows. The trigger-scenario
  `news` + `suggestion` rows stand in for the SYSTEM use cases ("update knowledge
  DB news", "inference new suggestions") that the parallel multi-agent backend
  will own.

## Run

Node 22.12+ required.

```bash
npm install
npm run dev      # http://localhost:4000 — seeds the DB on first boot
npm run seed -- --reset   # rebuild the DB from the workbooks
```

The SQLite file lives at `data/workbench.db` (gitignored).

## Endpoints (UML use cases)

| Use case | Method & path |
|---|---|
| Get dashboard data (+ TLDR news) | `GET /api/dashboard` |
| Get client (holdings, history, suggestions, comments) | `GET /api/customers/:id` |
| Add client data (relationship comment) | `POST /api/customers/:id/comments` |
| Apply suggestion (records a transaction, swaps the holding) | `POST /api/suggestions/:id/apply` |
| Drop suggestion | `POST /api/suggestions/:id/drop` |

Note: per the brief, **news is surfaced on the WM dashboard**, not inside the
client view — even though the UML includes "get TLDR news" under "get client".

Applying a suggestion is a real, transactional mutation: it closes the replaced
holding, opens the new one, writes a `suggestion_execution` transaction, and
marks the suggestion `executed`.
