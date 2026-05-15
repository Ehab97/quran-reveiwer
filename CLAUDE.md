# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.


# CLAUDE.md

We're building the app described in @SPEC.MD. Read that file for general architectural tasks or to double-check the exact database structure, tech stack or application architecture.

Keep your replies extremely concise and focus on conveying the key information. No unnecessary fluff, no long code snippets.

Whenever working with any third-party library or something similar, you MUST look up the official documentation to ensure that you're working with up-to-date information.
Use the DocsExplorer subagent for efficient documentation lookup.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use `bun` as the runtime and package manager for all commands.

```bash
bun dev          # Start development server at localhost:3000
bun build        # Build production bundle
bun start        # Start production server
bun lint         # Run ESLint
```

## Architecture

This is a Next.js App Router application with Bun as the runtime. It implements a note-taking app with rich-text editing and public note sharing.

**Key architectural layers:**

- **Presentation:** Next.js server components for data fetching; client components where interactivity is needed (TipTap editor, share toggle, etc.)
- **API:** Next.js Route Handlers at `app/api/notes/` and `app/api/public-notes/`
- **Data Access:** Raw SQL via Bun's native SQLite client — no ORM. DB helper module at `lib/db.ts`, note repository at `lib/notes.ts`
- **Auth:** `better-auth` integrated via `lib/auth.ts`; session checked server-side in route handlers and server components

**Database:** Single SQLite file at `data/app.db`. Schema has two origins:

1. `better-auth` core tables (`user`, `session`, `account`, `verification`) — generated via `npx auth@latest generate`, then applied via `scripts/init-db.ts`
2. Custom `notes` table created in that same init script

**better-auth uses camelCase column names** (e.g. `userId`, `expiresAt`) while the custom `notes` table uses snake_case (e.g. `user_id`, `created_at`).

## Routes

| Route                               | Purpose                      |
| ----------------------------------- | ---------------------------- |
| `/`                                 | Landing page                 |
| `/dashboard`                        | Authenticated notes list     |
| `/notes/[id]`                       | Note editor (TipTap)         |
| `/p/[slug]`                         | Public read-only note viewer |
| `/(auth)/login`, `/(auth)/register` | Auth pages                   |

## Key Planned Files

| File                         | Purpose                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| `lib/db.ts`                  | Bun SQLite singleton + query helpers (`query<T>`, `get<T>`, `run`)    |
| `lib/auth.ts`                | better-auth config (email/password, Bun SQLite adapter)               |
| `lib/notes.ts`               | Note repository functions, all scoped by `userId`                     |
| `scripts/init-db.ts`         | One-time DB initialization: applies auth schema + creates notes table |
| `components/NoteEditor.tsx`  | TipTap client component with toolbar                                  |
| `components/NoteList.tsx`    | Notes list with links to editor                                       |
| `components/ShareToggle.tsx` | Public share toggle, shows URL when enabled                           |

## Notes Table Schema

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id)
);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_public_slug ON notes(public_slug);
CREATE INDEX idx_notes_is_public ON notes(is_public);
```

## TipTap

Content is stored as `JSON.stringify(editor.getJSON())` in `content_json`. When loading, `JSON.parse` and pass as `content` to `useEditor`. Use `StarterKit` with `heading: { levels: [1, 2, 3] }`, plus `Code` and `CodeBlock` extensions. For read-only rendering, use `EditorContent` with `editable: false`.

## Security

- All `/dashboard` and `/notes/[id]` routes must check auth server-side and redirect to login if unauthenticated
- Every note SQL query in an authenticated context must filter by `user_id` to prevent cross-user access
- Public note slugs should be 16+ chars (e.g. via `nanoid`)
- Do not use `dangerouslySetInnerHTML` with TipTap content — use TipTap's own rendering

## Spec

Full technical specification (API contracts, DB schema details, component descriptions, dev workflow) is in `spec.md`.
