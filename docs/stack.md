# Stack evaluation

How the stock stack was chosen where packages overlap, and what the losing
side has that is worth porting into the winner. Evaluated 2026-10-13 against
pi v1.1.0 and the pins in `vendor.json`; all file references are relative to
`vendor/`.

## Verdicts

| Role | In the stack | Not in the stack | Why |
|---|---|---|---|
| Subagent delegation | **pi-better-subagents** (via the pi-better-harness umbrella) | nicobailon `pi-subagents` (reference clone), gotgenes `pi-subagents` (in `pi-packages`, not built) | Children are detached `pi -p --mode json` processes using only public CLI flags (all present in v1.1.0), start `--no-extensions` + explicit `-e`, are kernel-confined by default, and are supervised through a durable registry (pgid + start time, deadlines, process-group stop). nicobailon runs foreground children in-process and its background runner depends on loader tricks (jiti aliases, `PI_PACKAGE_DIR` overrides); ~108k lines vs ~22k. Both register `/subagents`, so they cannot coexist cleanly. |
| Background shell tasks | **pi-better-background-tasks** | — | Complementary: processes (dev servers, watchers), not agents. `bg_task_*` tools, no collisions. |
| Scripted fan-out | (none — `subagent_spawn_batch` covers batch fan-out) | `pi-dynamic-workflows` (Michaelliv, reference clone) | See below — not the package our docs described, and broken against v1.1.0. |
| Goal / plan | **pi-better-goal**, **pi-better-plan** | — | Different role from delegation: objective tracking across drains, and a per-session checklist. pi-better-goal's `/workflow` is about skill ownership, not fan-out. |
| Policy (allow/ask/deny) | **@gotgenes/pi-permission-system** | — | Complementary to the sandbox; first `tool_call` block wins (`pi/packages/coding-agent/src/core/extensions/runner.ts`), and it gates the sandbox's replacement tools by name like any other. |
| OS confinement | **pi-better-sandbox** | — | Kernel-level (bubblewrap / Seatbelt) write + network confinement; permission-system is userland only. |
| Backlog todos vs session plan | mitsupi `todo` **and** pi-better-plan | — | Cross-session file-backed backlog vs live per-session checklist; no name clash. Say which to use in prompts. |
| Tool/editor overrides | pi-better-sandbox's guarded `edit`/`bash`, pi-better-goal, the pi-better navigator | mitsupi `unified-edit.ts`, `uv.ts`, `goal.ts`, `prompt-editor.ts` | Duplicate tools fail extension load (`edit`, `bash`, `get_goal`, `update_goal`). Excluded in `agent-stuff` `pi-dev` via `!` patterns in `package.json`. |

### pi-dynamic-workflows is not what the docs said

`docs/research/` (and the old README) describe *QuintinShaw/pi-dynamic-workflows*
"3.x": fleet agents, `workflow_control`, journaled resume, worktree isolation,
`~/.pi/workflows/model-tiers.json` tiers. That repo is gone (404), and the npm
name `pi-dynamic-workflows` only ever published Michaelliv's 1.0.0/1.0.1 — which
is what `npm:pi-dynamic-workflows` actually installed. It has none of those
features: `isolation:"worktree"` and per-agent `model` are prompt text only
(`pi-dynamic-workflows/src/workflow.ts:446-449`), nothing reads
`model-tiers.json`, its peer range `^0.78.0` excludes 1.1.0, it passes the
removed `modelRegistry` option (`src/workflow-tool.ts:100`), and its children
receive raw coding tools that bypass both the permission system and the sandbox.
The old model-tiers setup target wrote a file nothing reads; it is gone.

## Prerequisites the stack now has

- **bubblewrap** (`bwrap` in `/usr/bin` or `/bin`) on Linux. Without it the
  sandbox reports `inactive`, and pi-better-subagents refuses confined launches
  ("Cannot enforce sandbox permissions") until the `/sandbox` Subagents profile
  is set to unrestricted. Not installed on this host as of this evaluation.
- **Extension providers in subagents**: children start with `--no-extensions`,
  so claude-bridge models need `providerExtensions` set in
  pi-better-subagents config (`pi-better-harness/packages/pi-better-subagents/extensions.mjs:120-124`).

## Known gaps in the chosen stack

- pi-permission-system rules do not reach pi-better-subagents children (the
  permission extension isn't loaded there); only the OS sandbox and the
  `/sandbox` Subagents profile apply.
- pi-better-sandbox's network-off rule is a tool-name list
  (`pi-better-harness/packages/pi-better-sandbox/index.ts:88`) that misses
  pi-web-access `fetch_content` / `get_search_content` / `source_check`.
- pi-claude-bridge AskClaude `full` mode uses the Agent SDK's
  `bypassPermissions` (`pi-claude-bridge/src/index.ts:2308`); neither governance
  layer sees it. Opt-in, off by default.
- minimal-output (`/tool-output minimal`, off by default per session) patches
  pi's Tool/CustomMessage/Compaction component prototypes globally; it affects
  every extension's renderer (pi-lens compact line, etc.).

## Port backlog (ideas from the losing side)

Each would be a commit on the owning package's `pi-dev` branch.

**Into pi-better-subagents** (`vendor/pi-better-harness`)

1. Permission-system bridge — emit gotgenes' `subagents:child:*` lifecycle
   events (`pi-packages/packages/pi-subagents/src/.../child-lifecycle.ts`) or
   auto-inject the permission extension like nicobailon
   (`pi-subagents/src/runs/shared/child-tool-plan.ts:239`). Closes the biggest gap.
2. Context handoff — `inherit_context` (gotgenes `agent-tool.ts:254`,
   `session/context.ts`) and fork / pruned-fork (nicobailon
   `src/shared/fork-context.ts`, `pruned-fork.ts`).
3. Model-facing steering and resume — `steer_subagent` (gotgenes
   `steer-tool.ts:84`), `resume` (`agent-tool.ts:248`).
4. Turn/depth budgets — `max_turns` (gotgenes `lifecycle/turn-limits.ts`),
   `PI_SUBAGENT_MAX_DEPTH` / `maxSubagentSpawnsPerRun` (nicobailon).
5. Blocking `bg_wait` with timeout (nicobailon `src/runs/background/wait-tool.ts:50`).
6. Capability ceilings and acceptance gates (nicobailon
   `src/api/capability-ceiling.ts`, `src/runs/shared/acceptance.ts`).
7. `/subagents-doctor`-style diagnostics for provider-extension mapping
   (nicobailon `src/extension/doctor.ts`).
8. Schema-validated results via a terminating `structured_output` tool
   (pi-dynamic-workflows `src/structured-output.ts:16-30`).
9. Phase-grouped live progress and a token `budget` tracker
   (pi-dynamic-workflows `src/display.ts`, `src/workflow.ts`).
10. Workspace-provider interface with rescue branches / preserved worktrees
    (`pi-packages/packages/pi-subagents-worktrees`), and worktree
    `node_modules` linking (nicobailon `worktree.ts:753`).
11. Fix its own task-runtime typecheck against v1.1.0
    (`child-incidents.ts:113`, `ExtensionContext` vs `ExtensionToolContext`).

**Into pi-better-sandbox**

12. Cover the network tools listed under *Known gaps*.

**Into pi-permission-system** (`vendor/pi-packages`)

13. Tool-provenance check, so a re-registered `bash` can't bypass rules
    (pi-better-sandbox `shared-task-sandbox.ts:256-259`).

## Not evaluated at runtime

Static analysis plus typechecks against v1.1.0 and an RPC-mode load of the
installed stack (all extensions load, no duplicate commands). Not exercised:
actual subagent runs, sandbox enforcement (needs bubblewrap), permission
prompts in children.
