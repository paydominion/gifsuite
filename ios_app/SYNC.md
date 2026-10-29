# Web → iOS planning trigger

## Scope

The user selected automatic updates to the iOS feature plan and implementation backlog only. Do not implement Swift features, modify web behavior, commit, deploy or release as part of this trigger.

Two mechanisms keep the documents current:

1. **During agent-assisted development:** the root `AGENTS.md` requires the web feature author to update this plan/backlog in the same task when user-visible behavior or contracts change.
2. **Hourly fallback:** a Codex chat heartbeat checks the local working tree, including uncommitted and new files, for changes missed by the first mechanism. This is scheduled polling, not an operating-system file watcher. It depends on the machine and desktop app being available. Manage its schedule in the app.

## Inputs and baseline

Read root `AGENTS.md`, `ROADMAP.md`, `lib/tools.ts`, changed routes/components/services and relevant tests. Inspect native `Sources/` and `project.yml` to distinguish implemented functionality from placeholders. Source and test evidence outrank stale README/roadmap text; code presence does not prove tests passed or a deployment is live.

`sync-state.json` stores SHA-256 hashes keyed by repository-relative path, plus the baseline commit and review date. This records file content, not just Git HEAD, so uncommitted edits are detected too. It contains no source contents or secrets.

Enumerate tracked and nonignored untracked files using `git ls-files --cached --others --exclude-standard -z` from the repo root, deduplicate paths, and hash existing regular files in these scopes:

- `app/`, `components/`, `lib/`, `db/`, `processor/`, `migrations/`, `tests/`, `content/blog/`
- `ios_app/Sources/`
- `ROADMAP.md`, `README.md`, `TESTING.md`, `DEPLOY.md`, `package.json`, `wrangler.jsonc`, `worker.ts`, `proxy.ts`, `next.config.ts`, `ios_app/project.yml`

Exclude `app/fonts/`, `lib/blog/posts.generated.json`, symlinks and ignored/generated build output. The planning documents and snapshot are excluded to prevent self-triggering. Compare path sets as well as hashes so added, deleted and renamed files are noticed. Never read `.env*`, `.dev.vars*` or credential files for this task. Baseline commit is context only; a branch switch or rebase still requires content comparison.

## Each run

1. Capture the current hashes without writing the baseline. Compare with `sync-state.json`. If the baseline is missing/corrupt, perform a full scoped review before recreating it. If no source hashes differ, make no changes.
2. Read changed feature-related source and its dependent contracts/tests; use Git diff as supplementary context. Distinguish functional changes, draft work, planned work, refactors and deletions. A test file is coverage intent unless an actual passing run is recorded.
3. Update `FEATURE_PLAN.md` and `BACKLOG.md` only where evidence changes: web status, Swift UX translation, source references, API contract, dependencies, priority, acceptance criteria and native status. Preserve existing IDs, manual notes and completion evidence. Add a new stable ID for a new feature; mark removals/deprecations explicitly instead of silently deleting history. Backend-only or web-only changes should be identified as such.
4. Promote blocked work to ready only when the required implemented API/behavior exists. Do not implement the feature. Do not mark native work verified from a web change or from a placeholder. Capture breaking contract changes and their affected Swift files as backlog work.
5. Append a dated change-log entry for substantive plan/backlog changes using Africa/Lagos dates. Do not rewrite the documents or append entries for timestamp-only changes or refactors with no feature effect.
6. Before saving, re-read the documents and re-hash source inputs. Preserve concurrent document edits. If sources changed during the review, do not advance their hashes; defer/review them on the next run. Only record reviewed, stable content. Write the snapshot atomically after successful reconciliation; nonfunctional reviewed changes may advance it without document edits.
7. Stay quiet on unchanged or non-actionable runs. Notify only when a meaningful plan/backlog update is complete, a breaking change/dependency requires the user, or the sync fails. Do not repeatedly announce the same blocker.

## Manual invocation

Ask: “Sync the iOS feature plan and backlog from the current web code using `ios_app/SYNC.md`.” This follows the same process and does not require commits or a running web server.

The initial baseline was reviewed from source on 2026-09-30. No Swift implementation or runtime tests were performed by this documentation sync.
