<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Keep the Swift iOS plan aligned with web development

When adding, changing or removing a web feature, API contract, media option, upload limit, moderation behavior or roadmap item, update `ios_app/FEATURE_PLAN.md` and `ios_app/BACKLOG.md` in the same task. Follow `ios_app/SYNC.md`; preserve stable feature IDs and separate web readiness from native implementation status. Read actual source and tests rather than copying roadmap completion marks. Include the Swift experience, backend dependencies and acceptance criteria. Skip documentation churn for refactors with no feature or contract effect.

This trigger updates planning documents only. It does not authorize implementing Swift features, committing or deploying. The hourly Codex heartbeat is a fallback for changes made outside an agent task. Do not advance `ios_app/sync-state.json` unless all changed scoped inputs have been reconciled according to `ios_app/SYNC.md`.
