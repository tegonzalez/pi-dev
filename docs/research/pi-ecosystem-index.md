# Pi Coding Agent Ecosystem Index

Curated index of forks, extensions, skills, and provider bridges for the [pi coding agent](https://pi.dev) ([earendil-works/pi](https://github.com/earendil-works/pi), formerly `badlogic/pi-mono`).

**Data verified:** 2026-09-17 (GitHub REST API: last push date, stars; npm: monthly downloads; pi.dev/packages catalog).

## Scoring rubric

Each project gets two scores out of 10:

- **Activity** — recency and cadence of development. 9–10 = commits within the last week; 7–8 = within ~1 month; 5–6 = within ~3 months; 3–4 = 3–6 months stale; 1–2 = effectively abandoned.
- **Utility** — practical value and adoption for a typical pi user. Weighs popularity (stars/downloads), breadth of use cases, maintenance risk, and uniqueness vs. built-in functionality. Utility is scored assuming the project still works with current pi; stale projects are penalized for compatibility risk.

---

## Reference: upstream

### [earendil-works/pi](https://github.com/earendil-works/pi)
- **Tag:** upstream, core
- **Latest commit:** 2026-09-17 · ★106,592
- **Activity:** 10 · **Utility:** 10
- **Summary:** The pi coding agent itself — CLI, unified LLM API, TUI/web UI libraries, extension system.
- **Notes:** Renamed from `badlogic/pi-mono` (old URL redirects). Ships 50+ officially maintained example extensions under `packages/coding-agent/examples/extensions` (plan mode, permission gates, sandboxing, SSH, subagents, Doom overlay) — the safest source of working extension code. Built-in OAuth providers for Anthropic (Claude Pro/Max), `openai-codex`, `github-copilot`, and `google-gemini-cli`. Known security history: CVE-2026-5556, RCE via auto-loaded project extensions, fixed after 0.58.4 — keep updated.

---

## Forks

### [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) (omp)
- **Tag:** fork, batteries-included, distribution
- **Latest commit:** 2026-09-17 · ★31,609
- **Activity:** 10 · **Utility:** 9
- **Summary:** The dominant pi fork. 60+ providers, 31 built-in tools, LSP (14 ops) and DAP debugger (28 ops) integration, ~80k lines of Rust core, first-class subagents with worktree fan-out, persistent Python/Bun kernels.
- **Notes:** Standalone CLI installed via omp.sh / Homebrew / Nix, published as `@oh-my-pi/pi-coding-agent` — **not** installable as a pi package. Commits daily. The awesome-pi list warns it is unrelated to an npm squat named `oh-my-pi`.

### [code-yeongyu/senpi](https://github.com/code-yeongyu/senpi)
- **Tag:** fork, extension-first, opinionated
- **Latest commit:** 2026-09-17 · ★434
- **Activity:** 10 · **Utility:** 7
- **Summary:** Opinionated "more sane pi" fork; ~18 builtin extensions including opencode-style permissions, dynamic system prompt with intent gate, advanced compaction, Codex-style `apply_patch` for GPT models, web search/fetch, todo tools.
- **Notes:** Rebases periodically on upstream; every core change documented in `changes.md` files. Runtime for Sisyphus Labs' "Dori" assistant. Self-flagged as experimental ("don't bet a production pipeline on it"). Also publishes individual extensions ported from oh-my-opencode (pi-lsp-client, pi-ast-grep, pi-websearch, pi-rules, sandbox).

### [october-dev/october-harness](https://github.com/october-dev/october-harness)
- **Tag:** fork, multiplayer, product
- **Latest commit:** 2026-09-11 · ★22
- **Activity:** 8 · **Utility:** 5
- **Summary:** October's "multiplayer-first" coding harness. Keeps pi's agent core/provider layer/TUI/session model; adds its own CLI (`@october-dev/october`), October inference + device-code auth, three permission modes (ask/accept-edits/bypass), and October Bus agent-to-agent messaging with durable inbox and shared tasks.
- **Notes:** Genuine product fork with explicit upstream-sync and attribution policy. Small community; utility depends on buying into October's platform.

### [lee101/pi-infinity](https://github.com/lee101/pi-infinity)
- **Tag:** fork, autonomous
- **Latest commit:** 2026-08-24 · ★25
- **Activity:** 7 · **Utility:** 4
- **Summary:** Adds autonomous-operation flags: `--auto-next-steps` (keeps completing follow-up tasks) and `--auto-next-idea` (brainstorms and implements improvements indefinitely).
- **Notes:** Published as `@codex-infinity/pi-infinity`, tracks current upstream core. Niche use case; modest adoption.

### [aryaniyaps/ultimate-pi](https://github.com/aryaniyaps/ultimate-pi)
- **Tag:** fork, workflow, beta
- **Latest commit:** 2026-08-09 · ★28
- **Activity:** 6 · **Utility:** 4
- **Summary:** Governed coding workflow on top of pi: repo bootstrap, evidence-based planning, gated execution.
- **Notes:** Beta; activity appears to be cooling since early August.

### [philo-groves/pire](https://github.com/philo-groves/pire) ⚠️ abandoned
- **Tag:** fork, reverse-engineering, abandoned
- **Latest commit:** 2026-05-02 · ★21
- **Activity:** 2 · **Utility:** 1
- **Summary:** Pi for Reverse Engineers.
- **Notes:** README banner: "This project has been superceded by Beale... will not be maintained." Listed for completeness only.

### [continua-ai/tinny-pi](https://github.com/continua-ai/tinny-pi) ⚠️ abandoned
- **Tag:** fork, ui-tweaks, abandoned
- **Latest commit:** 2026-02-06 · ★4
- **Activity:** 1 · **Utility:** 1
- **Summary:** Continua's pi fork with UI tweaks (output-only scroll, clickable headers, mouse tracking).
- **Notes:** Tracks the old `badlogic/pi-mono`, predates the earendil-works move. Appears abandoned.

**Special case — OpenClaw:** famously built on pi's SDK (pi-ai, pi-agent-core, pi-coding-agent session persistence, differential-rendering TUI) but absorbed the code into its own repo; not a maintained fork. `mitsuhiko/pi-mono` (★102) is just a stale migration copy from the pi-mono → earendil-works transition (Earendil is Armin Ronacher's company), not a divergent fork.

---

## Discovery: catalogs & curated lists

### [pi.dev/packages](https://pi.dev/packages)
- **Tag:** catalog, official
- **Latest commit:** continuously updated · ~5,430 packages
- **Activity:** 10 · **Utility:** 9
- **Summary:** Official package catalog — extensions, skills, prompt templates, themes published to npm with `pi-package` keywords; monthly download counts and `pi install npm:<pkg>` commands.
- **Notes:** Listing ≠ endorsement. Download counts appear gameable in places (some packages show 100k+ dl/mo with tiny star counts); a per-package "report" link exists. Treat numbers as rough signals.

### [BubblePtr/awesome-pi](https://github.com/BubblePtr/awesome-pi)
- **Tag:** awesome-list, curated
- **Latest commit:** 2026-09-17 · ★122
- **Activity:** 10 · **Utility:** 9
- **Summary:** Human-curated awesome list (English + Chinese): Web Access, MCP, Subagents, UI, Security, Memory, Context Mgmt, Themes, Editor Integration, Alternative Distributions.
- **Notes:** Best-organized single list; marks popular picks with 🔥; includes honest disclaimers (e.g. two unrelated `pi-memory` packages; oh-my-pi vs. npm squat warning).

### [awesome-pi.site](https://awesome-pi.site/)
- **Tag:** directory, auto-curated
- **Latest commit:** updated daily (2026-09-17) · ~10,611 resources
- **Activity:** 10 · **Utility:** 6
- **Summary:** Largest aggregation of pi resources (~7,987 extensions), auto-discovered and LLM-curated.
- **Notes:** Machine-curated, so quality varies — good for discovery, not vetting. Appears to be the rendered successor of the older `awesome-pi-agent` gitcode directory (now stale).

### [github.com/topics/pi-mono](https://github.com/topics/pi-mono)
- **Tag:** github-topic, discovery
- **Latest commit:** n/a · 105 repos
- **Activity:** 8 · **Utility:** 6
- **Summary:** GitHub topic page; useful for adjacent projects (web UIs, RPC clients, Nix flakes, forks).

---

## Extension collections

### [narumiruna/pi-extensions](https://github.com/narumiruna/pi-extensions)
- **Tag:** collection, monorepo
- **Latest commit:** 2026-09-17 · ★574
- **Activity:** 10 · **Utility:** 9
- **Summary:** The biggest community extension monorepo: statusline, plan-mode, worktree, lsp, firecrawl, goal, subagents, sync, btw, usage, accounts, caffeinate, plus the `@narumitw/pi-tui-kit` UI library (~106k dl/mo).
- **Notes:** Published as ~15 npm packages. Note its `pi-subagents` is one of three unrelated packages with that name (see naming-confusion note below).

### [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff) (npm: `mitsupi`)
- **Tag:** collection, review, skills, themes
- **Latest commit:** 2026-09-06 · ★3,138
- **Activity:** 9 · **Utility:** 8
- **Summary:** Armin Ronacher's agent config repo. pi subset: ~18 extensions (review, btw, goal, whimsical, notify, answer, subagent, todos, session-breakdown, unified-edit, uv…), ~18 skills, 3 themes. `/review` + `/end-review` for diffs/commits/PRs is the standout.
- **Notes:** High-profile author, npm-published with CI, Apache-2.0. Mostly Claude Code oriented; pi support is a subset. Author caveat: "tuned for my workflow… expect to adjust." Community-recommended in the pi discussions thread.

### [juicesharp/rpiv-mono](https://github.com/juicesharp/rpiv-mono)
- **Tag:** collection, monorepo, workflow
- **Latest commit:** 2026-09-17 · ★794
- **Activity:** 10 · **Utility:** 7
- **Summary:** The `rpiv-*` suite: rpiv-todo, rpiv-ask-user-question, rpiv-voice (local Whisper), rpiv-advisor, rpiv-workflow, rpiv-web-tools, rpiv-btw.
- **Notes:** Very heavy npm numbers (rpiv-todo ~148k dl/mo, rpiv-ask-user-question ~162k dl/mo) — treat with some skepticism given catalog gaming concerns, but the monorepo itself is active and well-organized (lockstep versions).

### [badlogic/pi-skills](https://github.com/badlogic/pi-skills)
- **Tag:** skills, first-party
- **Latest commit:** 2026-06-06 · ★2,537
- **Activity:** 5 · **Utility:** 8
- **Summary:** First-party skills from pi's author: youtube-transcript, brave-search, browser-tools, Google Calendar/Drive/Gmail CLIs, transcribe (Groq Whisper), vscode.
- **Notes:** Authoritative source, but untouched for ~3.5 months with 36 open issues. Skills are portable markdown, so staleness matters less than for code extensions.

### [tomsej/pi-ext](https://github.com/tomsej/pi-ext)
- **Tag:** collection, ui, workflow
- **Latest commit:** 2026-09-03 · ★76
- **Activity:** 9 · **Utility:** 7
- **Summary:** UI/workflow suite: leader-key panels, powerline footer, telescope fuzzy finder, semantic git, multi-mode code review.

### [luongnv89/pi-extensions](https://github.com/luongnv89/pi-extensions)
- **Tag:** collection, cli-bridges, providers
- **Latest commit:** 2026-09-11 · ★123
- **Activity:** 9 · **Utility:** 7
- **Summary:** 12-extension monorepo. CLI-backed bridges: `claude-code-pi` (spawns `claude -p` per turn, no SDK), `grok-pi`, `opencode-pi`, `agy-pi` (Antigravity CLI: Gemini/Sonnet/GPT-OSS), `cursor-pi`, plus themes.

### [jayshah5696/pi-agent-extensions](https://github.com/jayshah5696/pi-agent-extensions)
- **Tag:** collection, workflow
- **Latest commit:** 2026-08-22 · ★69
- **Activity:** 7 · **Utility:** 6
- **Summary:** 15+ extensions: sessions, ask_user, handoff, powerline-footer.

### [hjanuschka/shitty-extensions](https://github.com/hjanuschka/shitty-extensions) ⚠️ stale
- **Tag:** collection, hooks, stale
- **Latest commit:** 2026-05-18 · ★125
- **Activity:** 4 · **Utility:** 4
- **Summary:** Custom hooks for pi; credited as inspiration by other config repos.
- **Notes:** ~4 months without pushes — risky against pi's fast-moving extension API. Same author's pi-multi-pass (providers section) is actively maintained.

### [kcosr/pi-extensions](https://github.com/kcosr/pi-extensions) ⚠️ stale
- **Tag:** collection, security, stale
- **Latest commit:** 2026-02-23 · ★27
- **Activity:** 2 · **Utility:** 3
- **Summary:** codemap file browser, apply-patch tool, skill-picker, toolwatch (SQLite tool-call auditing/approval), assistant integration.
- **Notes:** No commits in ~7 months. `toolwatch` (auditing/approval of tool calls) is a notable idea, but the repo predates several extension-API changes.

---

## Popular individual extensions

### [nicobailon/pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)
- **Tag:** mcp, tools
- **Latest commit:** 2026-09-15 · ★1,489 · ~940k dl/mo
- **Activity:** 10 · **Utility:** 10
- **Summary:** #1 package in the catalog. Proxies MCP servers through ~200-token meta-tools instead of loading hundreds of tool definitions — big context savings.
- **Notes:** Author publishes on npm as `nicopreme`.

### [nicobailon/pi-web-access](https://github.com/nicobailon/pi-web-access)
- **Tag:** web, search, fetch
- **Latest commit:** 2026-09-15 · ★1,477 · ~435k dl/mo
- **Activity:** 10 · **Utility:** 9
- **Summary:** Web search, URL fetch, GitHub cloning, PDF extraction, YouTube understanding.

### [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)
- **Tag:** subagents, workflows
- **Latest commit:** 2026-09-15 · ★3,626 · ~429k dl/mo
- **Activity:** 10 · **Utility:** 9
- **Summary:** Async subagent delegation with truncation, artifacts, session sharing, and scripted multi-agent workflows.
- **Notes:** Highest-starred pi extension repo. Naming confusion: three unrelated `pi-subagents` implementations exist (nicobailon, tintinweb, narumitw).

### [apmantza/pi-lens](https://github.com/apmantza/pi-lens)
- **Tag:** lsp, lint, feedback
- **Latest commit:** 2026-09-17 · ★418 · ~89k dl/mo
- **Activity:** 10 · **Utility:** 9
- **Summary:** Real-time LSP/linter/formatter/type-check feedback for the agent: biome, ruff, ast-grep, knip, jscpd.

### [tintinweb/pi-subagents](https://github.com/tintinweb/pi-subagents)
- **Tag:** subagents, claude-code-style
- **Latest commit:** 2026-09-03 · ★1,179 · ~47k dl/mo
- **Activity:** 8 · **Utility:** 7
- **Summary:** Claude Code–style sub-agents: parallel execution, live widget, git-worktree isolation.
- **Notes:** npm releases lag the repo; `@gotgenes/pi-subagents` is a maintained friendly fork.

### [QuintinShaw/pi-dynamic-workflows](https://github.com/QuintinShaw/pi-dynamic-workflows)
- **Tag:** workflows, subagents, fan-out
- **Latest commit:** 2026-09-14 · ★530 · ~40k dl/mo
- **Activity:** 9 · **Utility:** 7
- **Summary:** Claude Code–style dynamic workflows: fan-out across hundreds of code-mode subagents, model routing, journaled resume, git-worktree isolation.

### [nicobailon/pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer)
- **Tag:** ui, statusbar
- **Latest commit:** 2026-09-10 · ★431 · ~31k dl/mo
- **Activity:** 9 · **Utility:** 7
- **Summary:** Powerline-style status bar.

### [@gotgenes/pi-permission-system](https://www.npmjs.com/package/@gotgenes/pi-permission-system)
- **Tag:** security, permissions
- **Latest commit:** repo archived 2026-05-16; moved to [gotgenes/pi-packages](https://github.com/gotgenes/pi-packages) · ~41k dl/mo
- **Activity:** 8 (npm v32, updated 2026-09-16) · **Utility:** 8
- **Summary:** allow/deny/ask permission enforcement with audit logging.
- **Notes:** Original repo archived with a pointer to the new monorepo; npm package is current.

### [@plannotator/pi-extension](https://www.npmjs.com/package/@plannotator/pi-extension) ⚠️ repo 404
- **Tag:** plan-review, ui
- **Latest commit:** npm active (~56k dl/mo); GitHub repo `plannotator/pi-extension` returns 404 as of 2026-09-17
- **Activity:** 7 · **Utility:** 7
- **Summary:** Interactive plan review/annotation — annotate agent plans visually and send feedback back to the agent.
- **Notes:** Closest live repo is [plannotator/plannotator-tui](https://github.com/plannotator/plannotator-tui) (★79, pushed 2026-09-16); third-party bridges exist (`CodeByPeete/plannotator-pi`, `Townk/pi-plannotator-bridge`). Verify source before installing.

### [prateekmedia/pi-hooks](https://github.com/prateekmedia/pi-hooks) ⚠️ stale
- **Tag:** permissions, checkpoint, lsp, stale
- **Latest commit:** 2026-05-16 · ★97
- **Activity:** 4 · **Utility:** 5
- **Summary:** Read-only-by-default sessions with once/always/never approval popups; four permission levels, `/permission` command. Also ships checkpoint (git-based rewind), lsp, ralph-loop, repeat, token-rate.
- **Notes:** Installable as `pi install npm:pi-hooks`. ~4 months stale with 7 open issues — community-liked idea, but test against current pi before relying on it. For permissions, prefer @gotgenes/pi-permission-system (active).

### [v2nic/pi-caveman](https://github.com/v2nic/pi-caveman) ⚠️ stale
- **Tag:** token-savings, prompts, stale
- **Latest commit:** 2026-04-07 · ★47
- **Activity:** 2 · **Utility:** 4
- **Summary:** Ultra-terse "caveman mode" responses via `/caveman lite|full|ultra`, claiming ~75% fewer output tokens; code blocks intact. Port of JuliusBrussee/caveman.
- **Notes:** Single-day repo, non-standard license (NOASSERTION). Interesting idea, unmaintained.

### [michalvavra/agents](https://github.com/michalvavra/agents)
- **Tag:** security, config, personal
- **Latest commit:** 2026-07-01 · ★16
- **Activity:** 5 · **Utility:** 4
- **Summary:** Personal multi-agent config repo; notable pi extensions: `filter-output.ts` (redacts secrets from tool output before it reaches the model) and `security.ts` (blocks dangerous commands pending approval).
- **Notes:** Reference material rather than a maintained package; issues disabled.

---

## Security: permissions, sandboxing & network egress

> Added 2026-09-17 from a focused follow-up search. Bottom line: for egress control, the mature path is a sandbox-runtime derivative — `@erichll/pi-sandbox`+`pi-auto-review` for per-connection model-approved grants, `pi-sandbox` (carderne) for static domain allowlists, or `pi-landstrip` for a hard network cut-off. For permissions, `@gotgenes/pi-permission-system` (above) and `@aliou/pi-guardrails` are the two actively maintained options. **No dedicated egress audit/logging extension exists** — that is a real gap in the ecosystem.

### [@erichll/pi-sandbox + @erichll/pi-auto-review](https://github.com/erichll/pi-packages)
- **Tag:** sandbox, egress, approval-broker
- **Latest commit:** npm 0.18.1, updated 2026-09-17 · ~4.1k dl/mo (auto-review ~4.9k)
- **Activity:** 10 · **Utility:** 9
- **Summary:** Strongest egress story in the ecosystem. Linux bubblewrap/seccomp + macOS Seatbelt process sandbox built on Anthropic's sandbox-runtime. Three-tier network policy: static deny → static allow → **dynamic review**, where each unmatched public hostname:port goes to `pi-auto-review`, a fail-closed model-backed approval broker issuing one-shot expiring grants per connection. Sandboxes main-agent bash *and* entire process-backed subagent trees, each with its own broker/proxy/policy. Write-denies `.env`, `secrets/` etc. by default.
- **Notes:** Install: `pi install npm:@erichll/pi-sandbox` (+ `@erichll/pi-auto-review`).

### [carderne/pi-sandbox](https://github.com/carderne/pi-sandbox)
- **Tag:** sandbox, egress, domain-allowlist
- **Latest commit:** 2026-09-17 · ★243 · ~4.0k dl/mo
- **Activity:** 10 · **Utility:** 8
- **Summary:** OS-level bash sandbox via `@carderne/sandbox-runtime` (maintained fork of `anthropic-experimental/sandbox-runtime`). `network.allowedDomains`/`deniedDomains` enforced by a domain-filtering proxy *inside* the sandbox — a true egress allowlist, not pattern matching. Blocked actions trigger interactive allow-once/allow-always prompts.
- **Notes:** Requires ripgrep on PATH. Install: `pi install npm:pi-sandbox`. Essentially the packaged successor of pi's in-repo `sandbox/` example.

### [pi-landstrip](https://github.com/landstrip/landstrip)
- **Tag:** sandbox, egress, cross-platform
- **Latest commit:** 2026-09-13 · ★75 · ~13.7k dl/mo
- **Activity:** 10 · **Utility:** 8
- **Summary:** Sandboxed bash/agents with native binaries for Linux/macOS/Windows, fail-closed. `network.allowNetwork: false` hard egress cut plus `sandbox.json` allowlists.
- **Notes:** Very high release cadence (159 npm versions; 0.19.2 on 2026-09-12). Only option with first-class Windows support. Install: `pi install npm:pi-landstrip`.

### [@senad-d/protectme](https://github.com/senad-d/ProtectMe)
- **Tag:** network-guard, allowlist, pattern-based
- **Latest commit:** 2026-08-17 · ★2 · ~71 dl/mo
- **Activity:** 7 · **Utility:** 4
- **Summary:** The only *dedicated* network-guard extension: intercepts `curl`/`wget`/`http`/`https` invocations from agent bash and user `!` commands against global + project allowlists (default-block mode), with prompted approvals and redacted blocked-attempt logging.
- **Notes:** Command-pattern based, not kernel-enforced — an agent can evade via other tools. Prefer a sandbox-runtime package for real enforcement.

### [pi-network-monitor](https://github.com/volh/pi-network-monitor) ⚠️ one-shot
- **Tag:** egress, monitoring-only, stale
- **Latest commit:** single npm release 2026-03-02 · ★1
- **Activity:** 2 · **Utility:** 3
- **Summary:** Live overlay showing all HTTP traffic the agent makes. Monitoring only, no blocking.

### [@cdexs/pi-httpproxy](https://github.com/Cdexs/pi-httpproxy)
- **Tag:** egress, proxy
- **Latest commit:** npm 0.2.1, 2026-09-02 · ~179 dl/mo
- **Activity:** 7 · **Utility:** 3
- **Summary:** Domain-whitelist global HTTP proxy router: whitelisted domains go through your proxy, the rest direct.
- **Notes:** You must supply the proxy yourself — inert without one. No standalone Squid-style egress proxy extension exists; sandbox-runtime packages embed their own filtering proxy but only inside the sandbox.

### [@agimon-ai/doompi-sandbox](https://github.com/AgiFlow/doompi)
- **Tag:** sandbox, container, whole-agent
- **Latest commit:** npm 0.0.1-alpha.72, 2026-09-16 · ~3.5k dl/mo
- **Activity:** 9 · **Utility:** 6
- **Summary:** Whole-agent container sandbox: agent + extensions run inside Docker/Podman, terminal stays on host.

### Remote sandbox vendors: @daytona/pi, @upstash/box-pi
- **Tag:** sandbox, remote, vendor
- **Latest commit:** active npm packages · ~959 / ~681 dl/mo
- **Activity:** 8 · **Utility:** 5
- **Summary:** First-party vendor extensions routing all tool calls into remote ephemeral sandboxes (Daytona / Upstash Box) while the agent runs locally.

### [@aliou/pi-guardrails](https://github.com/aliou/pi-guardrails)
- **Tag:** permissions, guardrails, file-protection
- **Latest commit:** 2026-09-17 · ★280 · ~4.0k dl/mo
- **Activity:** 10 · **Utility:** 8
- **Summary:** File-protection policies, outside-workspace path control, dangerous-command confirm/block with guided setup. The most active guardrails package after @gotgenes/pi-permission-system.
- **Notes:** Install: `pi install npm:@aliou/pi-guardrails`.

### [pi-verdict](https://github.com/jesset/pi-verdict)
- **Tag:** permissions, model-classifier
- **Latest commit:** npm 0.7.1, 2026-09-09 · ★2 · ~3.0k dl/mo
- **Activity:** 9 · **Utility:** 6
- **Summary:** Claude-Code-auto-mode-style gate: rules first, model classifier for uncertain calls, allow/ask/deny.
- **Notes:** Same author ships **pi-vetter** (Sep 2026) — supply-chain vetting of pi extensions themselves (OSV/sigstore/typosquat checks). Worth a look given catalog download-gaming and the CVE-2026-5556 history.

### [pi-permission-modes](https://github.com/wynainfo/pi-permission-modes) ⚠️ stale-ish
- **Tag:** permissions, sandbox, hybrid
- **Latest commit:** npm 2.2.0, 2026-07-19 · ★11 · ~1.1k dl/mo
- **Activity:** 5 · **Utility:** 5
- **Summary:** Hybrid: declarative permission modes + OS sandboxing (bubblewrap/sandbox-exec) + tree-sitter bash AST gating + tool hiding.

### Secret-leak prevention (model-context layer, not network)
- **Tag:** secrets, exfiltration-prevention
- **Summary:** `@uiyzzi/pi-shroud` and `@arvoretech/pi-secret-firewall` expose secrets as `$SECRET_*` shell vars the model can reference but never read; `@simplecyon/pi-safe-operation` advertises "secret egress guardrails"; [betterwright](https://github.com/BetterWright/betterwright) (very active, 77 versions) is policy-guarded Playwright with network controls and a credential vault for browser automation. `pi-safety-network-exfiltration` (npm-only, stale since 2026-03) is a good design doc but unmaintained and regex-based.

### Official examples: sandbox/ and gondolin/ (demos, not packages)
- **Tag:** official, sandbox, microvm, demo
- **Summary:** Both ship in `packages/coding-agent/examples/extensions/` with `"private": true` — copy the dir into `~/.pi/agent/extensions/` manually. `sandbox/` wraps `@anthropic-ai/sandbox-runtime` (sandbox-exec macOS / bubblewrap Linux) overriding the built-in bash tool, with a default network allowlist (npmjs/pypi/github) and `denyRead: ~/.ssh, ~/.aws, ~/.gnupg`, `denyWrite: .env, *.pem, *.key`. `gondolin/` routes *all* built-in tools into a QEMU-backed micro-VM (`@earendil-works/gondolin`), host cwd mounted at `/workspace` with write-through; needs Node ≥23.6 + QEMU. For real use, install carderne/pi-sandbox instead of the demo.

**Honest dead ends:** no dedicated egress logging/audit extension (closest: pi-network-monitor overlay, or stale toolwatch); no nftables/landlock-specific wrapper (Linux enforcement = bubblewrap+seccomp via sandbox-runtime derivatives or landstrip's native binary); no standalone egress proxy package.

---

## Provider & model-bridge extensions

> Context: pi ships built-in OAuth for Anthropic, ChatGPT Codex, GitHub Copilot, and Gemini CLI. Third-party providers cover subscription bridges, local inference, gateways, and vendors pi lacks.

### [elidickinson/pi-claude-bridge](https://github.com/elidickinson/pi-claude-bridge)
- **Tag:** provider, claude, subscription-bridge
- **Latest commit:** 2026-09-08 · ★396 · ~33.1k dl/mo
- **Activity:** 9 · **Utility:** 9
- **Summary:** Use a Claude Code Pro/Max subscription as a pi provider via the Claude Agent SDK. The clear leader among subscription bridges.
- **Notes:** Derivatives exist: `@vanillagreen/pi-claude-bridge` (adds opt-in pi-context forwarding, ~5.2k dl/mo, active) and `@fractaal/pi-claude-bridge` (~3.1k dl/mo). `thurstonsand/pi-doppelclaude` is a smaller fresh alternative. `prateekmedia/claude-agent-sdk-pi` (★117) is stalled since May — use pi-claude-bridge instead.

### [hjanuschka/pi-multi-pass](https://github.com/hjanuschka/pi-multi-pass)
- **Tag:** provider, oauth, rotation, quota
- **Latest commit:** 2026-09-06 · ★494 · ~614 dl/mo
- **Activity:** 9 · **Utility:** 8
- **Summary:** Multiple OAuth accounts per built-in provider (Claude, Codex/ChatGPT, Copilot, Gemini CLI, Antigravity) with rate-limit rotation pools, fallback chains, and quota checks. Not a provider itself — multiplies the built-in ones.
- **Notes:** Most-starred pi extension repo, though npm releases lag git (npm 1.3.0 is from April; repo active). Absorbed the use case of the abandoned `pi-antigravity-auth`.

### [huggingface/pi-llama](https://github.com/huggingface/pi-llama)
- **Tag:** provider, local, llama.cpp
- **Latest commit:** 2026-09-11 · ★105
- **Activity:** 9 · **Utility:** 7
- **Summary:** Official Hugging Face repo; auto-discovers models from a running llama.cpp server with context-window detection.
- **Notes:** Git-install only (not on npm). Best-in-class for local inference with pi.

### [apmantza/pi-free](https://github.com/apmantza/pi-free)
- **Tag:** provider, free-tier, bundle
- **Latest commit:** 2026-09-15 · ★131 · ~4.0k dl/mo
- **Activity:** 9 · **Utility:** 7
- **Summary:** All-in-one free/freemium bundle: ~20 providers (Kilo, Cline, LLM7, Ollama Cloud, SambaNova, StepFun, Venice…) plus OpenRouter/OpenCode catalog refresh, free-only filtering, auto-fallback.
- **Notes:** Its built-in Ollama Cloud support largely supersedes the standalone `pi-provider-ollama-cloud` package.

### [patlux/pi-commandcode-provider](https://github.com/patlux/pi-commandcode-provider)
- **Tag:** provider, gateway
- **Latest commit:** 2026-09-17 · ★165 · ~5.8k dl/mo
- **Activity:** 10 · **Utility:** 6
- **Summary:** Command Code API provider — 18 models (Claude, GPT, DeepSeek, GLM, MiniMax, Qwen).

### [mikeyobrien/pi-provider-kiro](https://github.com/mikeyobrien/pi-provider-kiro)
- **Tag:** provider, aws, kiro, oauth
- **Latest commit:** 2026-09-15 · ★96 · ~2.7k dl/mo
- **Activity:** 10 · **Utility:** 6
- **Summary:** Kiro API (AWS) — 17 verified models across 7 families, OAuth via AWS Builder ID / kiro-cli login.
- **Notes:** Very fresh (0.11.0). A related oh-my-pi plugin `ns-omp-provider-kiro` also exists.

### [xRyul/pi-nvidia-nim](https://github.com/xRyul/pi-nvidia-nim)
- **Tag:** provider, nvidia
- **Latest commit:** 2026-07-20 · ★48 · ~11.4k dl/mo
- **Activity:** 6 · **Utility:** 6
- **Summary:** NVIDIA NIM (build.nvidia.com) provider — 100+ models.
- **Notes:** High downloads; last release ~2 months ago, slightly aging.

### [BlockedPath/pi-xai-oauth](https://github.com/BlockedPath/pi-xai-oauth)
- **Tag:** provider, xai, grok, oauth
- **Latest commit:** 2026-09-12 · ★43 · ~4.0k dl/mo
- **Activity:** 9 · **Utility:** 6
- **Summary:** xAI/Grok with OAuth — reuse a SuperGrok subscription.

### [ttimasdf/pi-provider-newapi](https://github.com/ttimasdf/pi-provider-newapi)
- **Tag:** provider, gateway, self-hosted
- **Latest commit:** 2026-08-08 · ★59 · ~407 dl/mo
- **Activity:** 7 · **Utility:** 5
- **Summary:** Self-hosted NewAPI gateway provider with dynamic model discovery and cost calculation.
- **Notes:** Part of an active family of Chinese relay/gateway extensions (CLIProxyAPI, Sub2API, NewAPI), all updated within the last month.

### [pi-provider-litellm](https://www.npmjs.com/package/pi-provider-litellm)
- **Tag:** provider, litellm, proxy
- **Latest commit:** npm release 2026-09-17 · ~33.4k dl/mo
- **Activity:** 9 · **Utility:** 7
- **Summary:** LiteLLM proxy bridge — surprisingly the highest-download provider package.

### [liaowang11/pi-tokenrouter](https://github.com/liaowang11/pi-tokenrouter)
- **Tag:** provider, openrouter-compatible
- **Latest commit:** 2026-09-11 · ★0 · ~9.5k dl/mo
- **Activity:** 9 · **Utility:** 5
- **Summary:** TokenRouter/OpenRouter-compatible provider with dynamic model discovery.
- **Notes:** Zero GitHub stars but real npm usage.

### [synthetic-recon/pi-fusion](https://github.com/synthetic-recon/pi-fusion)
- **Tag:** multi-model, deliberation
- **Latest commit:** 2026-08-26 · ★55
- **Activity:** 7 · **Utility:** 5
- **Summary:** OpenRouter-Fusion-style multi-model deliberation.

### [HazAT/pi-openrouter](https://github.com/HazAT/pi-openrouter)
- **Tag:** openrouter, tools
- **Latest commit:** 2026-07-16 · ★15
- **Activity:** 5 · **Utility:** 4
- **Summary:** Exposes OpenRouter server tools (advisor, fusion, web search/fetch) as local pi tools.
- **Notes:** pi has native OpenRouter support, so this is an add-on, not a bridge.

**Routing/failover helpers:** `pi-pinball` (automatic provider failover on 429/quota/5xx, ~791 dl/mo), `pi-multikey` (one provider, many API keys with 429 rotation), `pi-provider-mux` (provider aliases for separate logins).

**⚠️ Abandoned / superseded providers:** `pi-provider-koji` (npm-deprecated, do not use), `pi-cursor-provider` (OAuth/gRPC approach stalled since April; superseded by SDK-based `pi-cursor-sdk`), `windowsrefundday/pi-antigravity-auth` (absorbed into pi-multi-pass), `pi-provider-ollama-cloud` (superseded by pi-free).

---

## Cross-agent skill collections (not pi-native)

These came up in community recommendations but target agents generally; skills are portable markdown.

- **[obra/superpowers](https://github.com/obra/superpowers)** — ★288k, pushed 2026-09-14. Agentic skills framework (test-driven-development, writing-plans, writing-skills). **Caveat:** recommender had not tested it in pi. Utility 6 (unverified with pi), Activity 10.
- **[github/awesome-copilot](https://github.com/github/awesome-copilot)** — ★39k, pushed 2026-09-17. Generic skills collection (`refactor`, `repo-story-time`). Utility 5, Activity 10.

---

## Quick picks

| Need | Install |
|---|---|
| MCP servers without context bloat | `pi install npm:pi-mcp-adapter` |
| Web search/fetch | `pi install npm:pi-web-access` |
| Subagents / parallel workflows | `pi install npm:pi-subagents` (nicobailon) |
| Live lint/type feedback | `pi install npm:pi-lens` |
| Permission gates + audit log | `pi install npm:@gotgenes/pi-permission-system` |
| Guardrails: file/path/command protection | `pi install npm:@aliou/pi-guardrails` |
| Egress: per-connection model-approved grants | `pi install npm:@erichll/pi-sandbox` + `npm:@erichll/pi-auto-review` |
| Egress: static domain allowlist sandbox | `pi install npm:pi-sandbox` (carderne) |
| Egress: hard network cut-off (Win/mac/Linux) | `pi install npm:pi-landstrip` |
| Whole-agent container sandbox | `pi install npm:@agimon-ai/doompi-sandbox` |
| Claude Pro/Max subscription in pi | `pi install npm:pi-claude-bridge` |
| Multiple OAuth accounts / quota rotation | `pi install npm:pi-multi-pass` |
| Local models (llama.cpp) | `pi -e` / git-install `huggingface/pi-llama` |
| Free-tier models bundle | `pi install npm:pi-free` |
| Batteries-included fork instead of pi | oh-my-pi via omp.sh |

*Caveats: download counts from pi.dev/packages are rough signals (catalog includes a per-package report link for gaming). Extension API moves fast — anything scored ≤4 on Activity should be tested against your pi version before use. Keep pi ≥0.58.5 for the CVE-2026-5556 extension-loader fix.*
