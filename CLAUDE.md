# CLAUDE.md v5

**YOU MUST** load @AGENTS.md at the start of every task before exploring or editing this repository. It defines stack, layout, the `docs/context/` domain table, and where tests run. This file adds style, test commands, and agent behavior only.

## Stack (summary — full detail in @AGENTS.md)
- **server/** — Go 1.25 HTTP API (stdlib `net/http`). Schema via migrations (goose); data access with `pgx` + `sqlc` serving the dashboard's REST endpoints. CORS enabled.
- **client/** — Expo 56 app (React Native 0.85 + React 19, TypeScript) — iOS, Android and Web. Dashboard in `client/src/`, wired to the API via React Query (calls isolated in `src/api`).
- **Postgres 16** — via `docker-compose.yml`.

## Planning
- Plan only when asked. No code until told to proceed.
- Interview me on non-trivial features (3+ steps) before writing code.
- Max 5 files per phase. Verify, get approval, then continue. If the user cannot reply, summarize completed work and pending steps, then stop—do not expand the phase unilaterally.

## Code Style — general
- Functions: 4–20 lines. Files: under 500 lines. One responsibility each.
- Names: specific, unique. Avoid `data`, `handler`, `Manager`, `util`. Prefer names that return <5 grep hits in the codebase.
- No duplication. Extract shared logic.
- Early returns over nested ifs. Max 2 indentation levels.
- Error messages must include the offending value and the expected shape.

## Code Style — Go (server/)
- Explicit types on exported signatures. No `interface{}`/`any` except at a real boundary (e.g. raw JSON).
- Handle every `error`: wrap with context via `fmt.Errorf("...: %w", err)`. Never discard with `_` without a documented reason.
- No `panic` in normal flow — only on unrecoverable init.
- `gofmt` and `go vet` clean before you finish. Idiomatic error strings: lowercase, no trailing punctuation.
- Money: `NUMERIC` in the DB, a decimal type in Go. **Never** float for monetary values (see docs/context/money.md).

## Code Style — TypeScript (client/)
- `strict` on. No `any` — use `unknown` + narrowing, or explicit types. No untyped functions.
- Function components + hooks. No class components.
- Server state lives in a dedicated typed data layer (`src/api`), not scattered across screens.
- Before using any Expo/React Native API, confirm it against the versioned v56 docs (see client/AGENTS.md).

## Comments
- Default: no comments. Only write WHY, never WHAT.
- Don't strip existing comments on refactors — they carry intent.
- Doc comment on public functions: intent + one usage example. (Go: the comment starts with the function name.)
- Reference issue numbers/SHAs when a line exists due to a specific bug.

## Tests (TDD)
- **Test-first, always.** Write the failing test → watch it fail (red) → make it pass (green) → refactor. No production code without a test that demanded it. Bug fixes start with a failing regression test that reproduces the bug.
- Every new function/component gets a test. F.I.R.S.T: fast, independent, repeatable, self-validating, timely.
- Mock external I/O (DB, HTTP, clock) with named fakes (struct/class), not inline stubs.
- **Run:** `npm test` at the root runs both packages; per package: `npm run test:server` / `npm run test:client`.
- **server (Go):** unit tests live beside each package as black-box `package <pkg>_test` files — test the exported API only (drives small, well-designed packages). Cross-package integration/e2e tests live in `server/test/`. Prefer table-driven tests. Never dump a giant `main_test.go` at the server root.
- **client (Expo):** Jest + `jest-expo` + `@testing-library/react-native`. Tests live in `__tests__/` folders, never loose beside source. `render` is async (RNTL 14): `await render(...)` + query via `screen.*` (see docs/context/gotchas.md).

## Dependencies & Structure
- Inject dependencies via parameter/constructor. Never a global singleton.
- Wrap third-party libs behind a thin project-owned interface.
- **No monoliths.** One responsibility per file/package. A file nearing 500 lines or a function over 20 must be split before merging.
- **Go layout:** binaries in `cmd/<name>/` (thin `main`, wiring only); domain logic in small `internal/<domain>/` packages (`health`, `router`, later `account`, `money`, `store`…), each a single concern. Flow per domain: `handler` (HTTP) → `service` (rules) → `store` (pgx/sqlc). Versioned migrations.
- **Client layout:** `src/components`, `src/hooks`, `src/screens`, `src/api`. One component per file; pull logic into hooks. Small focused modules.

## Formatting & Logging
- Go: `gofmt`. TS: `prettier`. Don't discuss style beyond that.
- Structured JSON for debug/observability. Plain text for CLI output.

## Agent Behavior
- **Always** read the relevant `docs/context/<area>.md` **before** opening any source file. This is the primary way to understand the domain — reading source first wastes tokens and misses intent.
- After any change that affects a domain's API contract, data model, endpoints, DTOs, or component behavior: update the corresponding `docs/context/<area>.md` to reflect the new state. The doc is the source of truth for future tasks.
- Re-read files before editing after 10+ messages (compaction risk).
- Files >500 LOC: read in chunks with offset/limit.
- On rename/signature change: grep for calls, types, imports, re-exports.
- Never delete a file without verifying no references exist.
- If a fix fails twice: stop, re-read the full section, state the wrong assumption.
- After correction: log the pattern to `docs/context/gotchas.md`.
- "yes" / "do it" / "pode ir" → execute. Don't restate the plan.
- Work from raw error data. If no output provided, ask for it.
