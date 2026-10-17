# pi-dev

A Makefile-driven setup for the [pi coding agent](https://github.com/earendil-works/pi)
and a curated extension stack — **built entirely from local repos**. pi itself
and every extension are cloned into `vendor/`, carry our changes as commits on
a `pi-dev` branch, and are built and installed from there. Nothing is installed
from the npm registry by name (third-party *dependencies* of those packages
still come from npm).

```sh
make             # clone + build + install pi and the stack + codex credential import
pi               # all configured providers just work — no /login
```

Requires Node ≥ 22, npm, git, and `~/.local/bin` on PATH (override with
`BIN_DIR=`). On Linux, install **bubblewrap** for the sandbox (see
[docs/stack.md](docs/stack.md#prerequisites-the-stack-now-has)).

## Layout

```
pi-dev/
├── Makefile        the only entry point — make help
├── vendor.json     the manifest: package → upstream URL, tracked branch, pin, build
├── vendor/         one plain git clone per package (gitignored)
├── build/          generated from committed pi-dev trees; pi installs these
├── tools/          vendor.js (sync/status/update/build), pi-auth-import/-status
└── docs/           stack.md (evaluation + port backlog), research/ (original notes)
```

Every package is potentially a fork; there is no separate forks/upstream area.
Each `vendor/<name>` has:

| ref | what it is |
|---|---|
| `origin` | the upstream repo |
| `upstream` | local branch at the pinned commit (`vendor.json` `base`); fast-forward only |
| `pi-dev` | `upstream` + our commits — checked out, edited, built |

`vendor/` is gitignored for now: `pi-dev` commits live only in the local clones.
Packages that accumulate commits worth keeping get pushed to a fork remote and
promoted to submodules (`make vendor-status`, column `ours`).

## Workflow

```sh
make vendor-status                     # pins, our commits, dirty, upstream lag
make deps                              # pin vs latest release (forks: origin HEAD)
cd vendor/<name> && <edit> && git commit   # on pi-dev — builds use commits only
make install                           # incremental rebuild + reinstall + verify

make deps-update                       # move every stack pin to its follow target
make vendor-update PKG=<name>          # one package: latest release, or fork HEAD
make vendor-update PKG=<name> TO=v1.2.0   # …or a specific tag/commit
make install
```

Pins do not stay at the commit `make` first cloned. `make deps` fetches and
compares each package to its follow target: the newest release tag with the
same prefix as the current pin (pi core asks `https://pi.dev/api/latest-version`,
the same endpoint `pi update` uses), or `origin/<track>` when `vendor.json`
sets `"follow": "head"` (the tegonzalez forks). `deps-update` /
`vendor-update` move `upstream` fast-forward only, write the new pin into
`vendor.json` (commit that), then rebase `pi-dev` (`--empty=drop`, so a patch
already in the release disappears). On a conflict it stops inside the rebase;
resolve, `git rebase --continue`, `make install`.

## Build model

`tools/vendor.js build` builds from the **committed** `pi-dev` tree
(`git archive`), so uncommitted edits never reach an installed artifact; each
output is stamped with its source commit and only rebuilt when that moves.

- **pi core** (`vendor/pi`) — built the way upstream makes local releases:
  `npm ci`, `npm run pack:packages` (hydrates provider model data over the
  network), then `@earendil-works/pi-coding-agent` is installed into
  `build/pi/cli` wired to that artifact set, so every `@earendil-works/*`
  package is ours. `make install` links it to `~/.local/bin/pi` and removes an
  npm-global pi if one exists (it would shadow ours, and `pi update self` would
  pull registry code over it).
- **Extensions** — `build/<id>` = archived package (a subdirectory for
  monorepos) + production deps. Peer deps are skipped: pi aliases
  `@earendil-works/*` to its own copies for extensions. `"build": true` runs the
  package's own build (pi-lens compiles `dist/`). `"local": {dep: id}` wires a
  registry dependency to our own `build/<id>` instead (the pi-better-harness
  umbrella → its sibling packages). `"install": false` marks build-only inputs.

## The stack

Chosen where packages overlap in [docs/stack.md](docs/stack.md), which also
lists ideas from the losing side worth porting.

| Extension | Source (`vendor/`) | Role |
|---|---|---|
| `@gotgenes/pi-permission-system` | `pi-packages/packages/pi-permission-system` | allow/ask/deny policy with audit log |
| `pi-better-harness` | `pi-better-harness` (umbrella + 6 sibling packages) | sandbox (bubblewrap/Seatbelt), detached sandboxed subagents, background shell tasks, SSH, goals, plans, minimal tool output, `/harness-settings` |
| `pi-web-access` | `pi-web-access` | web search, fetch, GitHub/PDF/YouTube extraction |
| `pi-mcp-adapter` | `pi-mcp-adapter` | MCP servers through ~200-token meta-tools (turns off pi's built-in MCP) |
| `pi-lens` | `pi-lens` | live LSP/lint/format/type feedback |
| `pi-claude-bridge` | `pi-claude-bridge` | Claude Pro/Max via the Agent SDK |
| `pi-multi-pass` | `pi-multi-pass` | multi-account OAuth, rotation pools, `/subs limits` |
| `mitsupi` | `agent-stuff` | `/review`, todos, notify, btw, … |

Reference clones, not built: `pi-subagents` (nicobailon) and
`pi-dynamic-workflows` (Michaelliv) — superseded, kept as sources of ideas.

### Our commits (`pi-dev` branches)

Published on forks under `tegonzalez/` (see `vendor.json` `url`). Fresh
`make vendor` clones those forks and checks out `origin/pi-dev` when present.

| Package | Fork | Commit |
|---|---|---|
| `pi` | upstream pin (local `pi-dev`) | allow `google-generative-ai` in OpenCode Go so live model-catalog hydration typechecks on the v1.1.0 pin |
| `pi-multi-pass` | [tegonzalez/pi-multi-pass](https://github.com/tegonzalez/pi-multi-pass) | Claude usage checkers for `/subs limits` (usage API, inference-probe fallback for inference-scoped tokens) |
| `agent-stuff` | [tegonzalez/agent-stuff](https://github.com/tegonzalez/agent-stuff) | exclude `goal.ts`, `unified-edit.ts`, `uv.ts`, and `prompt-editor.ts` (duplicate `get_goal`/`update_goal`, `edit`, `bash`, and editor that pi-better-harness owns) |

`make vendor-status` is the live list.

## Authentication — no `pi /login`

| Provider | Source artifact | Mechanism |
|---|---|---|
| Claude (`pi-claude-bridge`) | `CLAUDE_CODE_OAUTH_TOKEN` or `~/.claude.json` / `~/.claude/.credentials.json` | nothing to seed — the Agent SDK honors it natively |
| `openai-codex` | `~/.codex/auth.json` (`codex login` once) | `make auth-import` (run by bare `make`) converts tokens (incl. `accountId`) into `~/.pi/agent/auth.json`; pi refreshes under its cross-process lock |

The codex importer ([`tools/pi-auth-import.js`](tools/pi-auth-import.js)) is idempotent and freshness-aware. Codex caveat: alternating the
codex CLI and pi means the last refresher wins — re-run the importer.
`make auth-status` shows which sources exist (no secrets).

Subagents start with `--no-extensions`: for claude-bridge models
in pi-better-subagents children, set `providerExtensions` in its config.

## Other targets

`make help` lists everything — `verify` (pi on PATH is our build + full stack
present), `list`, `models` (refresh model catalogs), `setup`, `uninstall`,
`purge`, `clean` (keeps `~/.pi`), `distclean`, `reinstall`, `test` (2×
uninstall/install cycle), `buildclean`.
