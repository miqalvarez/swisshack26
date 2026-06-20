# Wealth Advisory Workbench — Frontend

Frontend for the SIX · Noumena · NTT Data challenge **"The Next Generation of
Wealth Advisory"**. A dashboard for a **Wealth Manager (WM)** to understand a
client's investment identity, monitor their portfolio against live news and CIO
signals, and act on the right insight at the right time.

> **Status:** wired to the real workbench API (`../server`). Views are built
> from the UML use cases: a WM dashboard (clients, action queue, TLDR news), a
> client detail with Holdings (donut), Suggestions (apply/drop), History and
> Relationship · DNA tabs. The agent-driven inference (news + suggestions) is
> seeded server-side and will later come from the parallel multi-agent backend.
>
> Run the backend first (`cd ../server && npm run dev`); Vite proxies `/api` to
> `http://localhost:4000`.

## Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS v4** + **shadcn/ui**-style components (manually vendored under
  `src/components/ui`)
- **react-router-dom** for routing
- **lucide-react** for icons

## Prerequisites

Node **22.12+** (see `.nvmrc`). The repo's system Node 18 ships without npm, so
use nvm or a self-contained Node 22 install.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## Project structure

```
src/
  components/
    layout/            AppShell, Sidebar, Topbar
    ui/                shadcn-style primitives (button, card, badge)
    ClientAvatar, SuggestionCard, NewsCard, HoldingsDonut,
    AddClientData, PageState, theme-provider
  lib/
    api.ts             fetch wrappers for the workbench API
    api-types.ts       DTOs mirroring the UML entities
    queries.ts         react-query hooks (with mutation invalidation)
    format.ts          CHF / date / label helpers
    utils.ts           cn() helper
  pages/
    DashboardPage, ClientsPage, ClientDetailPage, AlertsPage
```

## Data flow

`lib/api.ts` calls the backend through the Vite `/api` proxy; `lib/queries.ts`
wraps those in react-query hooks. Mutations (apply/drop suggestion, add client
data) invalidate the `dashboard` and `customer` queries so the UI refetches.
