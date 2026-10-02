# Desk

Customer support workspace — frontend only. This phase covers the agent ticket workflow:

- `/tickets` — ticket listing (views, search, filters, sort, pagination)
- `/tickets/[ticketId]` — ticket detail (conversation, reply / internal note, properties, SLA, customer context, activity)

There is no backend: data comes from an in-memory mock API and resets on page reload.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint
npm run build
```

## Structure

```
app/                     routes (App Router) — / redirects to /tickets
components/
  layout/                sidebar, header, global search, notifications, user menu
  tickets/               list + detail components, badges, action menus
  shared/desk-ui.tsx     Desk port of the ServiceOps UI kit (page header, KPI tiles, filter bar,
                         pills, detail tabs/cards, fields, next-step strip, side drawer)
  shared/                avatars, empty/error states, time labels
  ui/                    shadcn/ui primitives
hooks/                   TanStack Query hooks, URL query state, shared clock
lib/
  api/tickets.ts         mock API — the only file to replace when a backend exists
  mock-data/             teams, agents, customers, contacts, ticket seeds
  schemas/ticket.ts      Zod: list query (URL), composer, tags, new ticket
  types/ticket.ts        domain types
  sla.ts, format.ts      SLA evaluation and formatting helpers
  ticket-meta.ts         labels and visual tones for status / priority / SLA
```

## Notes

- The UI follows the ServiceOps app (layout, header, sidebar, tables, cards, filters, drawers, typography); only the palette is Desk's. Tokens live in `app/globals.css`.
- List state (view, search, filters, sort, page) lives in the URL, so views are shareable and survive refresh.
- SLA clocks are evaluated at read time; Pending and On Hold pause the resolution clock. Countdowns tick every 30 s.
- Replies, notes, assignments, status/priority/tag changes, merges and new tickets update local state only and are recorded in the ticket's Activity. No email is sent.
- Navigation items for future modules (Inbox, Customers, Knowledge Base, Reports, Admin) are shown as disabled "Soon" items — no placeholder pages.
- Keyboard: `Ctrl/⌘ K` or `/` opens search; on a ticket, `R` replies and `N` adds an internal note; `Ctrl/⌘ Enter` sends.
- White text on `--desk` (#0D9488) is ~3.7:1, below WCAG AA for body-size text. Buttons and links use it as specified; if AA is required, darken the button fill (e.g. #0B7A70).
