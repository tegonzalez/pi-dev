# Plan: Claude Code Subscription (not API) + pi for Swarm Implementation and Reviews

Source: `pi-ecosystem-index.md` (data verified 2026-09-17).

Key fact: **pi already has built-in OAuth for Anthropic (Claude Pro/Max)** — the main pi agent can run on the Claude subscription with zero extensions. Bridges are only needed when Claude should act as a *secondary* brain or when Claude Code's own agent loop should do the work.

## 1. Get Claude-sub inference into pi

- **Built-in Anthropic OAuth (pi core)** — primary route. No extension risk, always compatible.
- **[elidickinson/pi-claude-bridge](https://github.com/elidickinson/pi-claude-bridge)** (Activity 9, Utility 9) — leader among subscription bridges, via the Claude Agent SDK. Use when Claude should be a second provider alongside the main model (e.g. pi orchestrating on Codex while delegating hard tasks to Claude). The `@vanillagreen/pi-claude-bridge` derivative adds opt-in pi-context forwarding — matters for swarm work (workers see the parent's context).
- **luongnv89/pi-extensions → `claude-code-pi`** — spawns `claude -p` per turn, no SDK. Right tool when *Claude Code itself* (its tools, its agent loop) should be the worker rather than just Claude tokens. Slower per call, but each worker is a real Claude Code session on the sub.
- **[hjanuschka/pi-multi-pass](https://github.com/hjanuschka/pi-multi-pass)** — multiple OAuth accounts per built-in provider with rotation pools and fallback chains. Relevant for swarms, where parallel workers burn quota fast.

## 2. Swarm implementation (fan-out)

- **[can1357/oh-my-pi](https://github.com/can1357/oh-my-pi)** — the fork option. First-class subagents with worktree fan-out baked into the core, plus LSP/DAP for high-quality worker feedback. Most integrated swarm story, but it is a standalone CLI (`@oh-my-pi/pi-coding-agent`), not a pi package; configure its Anthropic provider with sub OAuth.
- **[QuintinShaw/pi-dynamic-workflows](https://github.com/QuintinShaw/pi-dynamic-workflows)** — the extension option: Claude Code–style dynamic workflows, fan-out across hundreds of code-mode subagents, **model routing** (route workers to the Claude provider), journaled resume, git-worktree isolation. Closest match to "swarm impl" on stock pi.
- **[nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)** (★3,626) — async delegation with artifacts, session sharing, and scripted multi-agent workflows. Most popular and safest subagent base; pair its scripted workflows with pi-claude-bridge as the worker provider.
- **[tintinweb/pi-subagents](https://github.com/tintinweb/pi-subagents)** (or the maintained `@gotgenes/pi-subagents` fork) — Claude Code–style parallel agents with live widget and worktree isolation; lighter-weight than dynamic-workflows.

## 3. Reviews

- **[mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)** (npm: `mitsupi`) — `/review` + `/end-review` for diffs/commits/PRs is the standout of that repo. Since pi runs on the Claude sub natively, reviews run on Claude automatically.
- **[tomsej/pi-ext](https://github.com/tomsej/pi-ext)** — multi-mode code review for more review shapes.
- Swarm-style reviews: dynamic-workflows fan-out (one reviewer per file/concern, worktree-isolated) with model routing pointing reviewers at Claude via pi-claude-bridge or the built-in OAuth.

## Suggested stack

| Role | Component |
|---|---|
| Base | upstream pi, built-in Anthropic OAuth (or **oh-my-pi** for the fork's native worktree fan-out) |
| Claude-as-worker | `pi-claude-bridge` (SDK) or `claude-code-pi` (full Claude Code sessions) |
| Quota headroom | `pi-multi-pass` |
| Swarm orchestration | `pi-dynamic-workflows` + `pi-subagents` (nicobailon) |
| Review | `mitsupi` `/review`, reviewer subagents routed to Claude |

## Cautions

- Keep pi ≥0.58.5 (CVE-2026-5556 extension-loader RCE fix).
- npm releases of pi-multi-pass and tintinweb's pi-subagents lag their repos — install from git if issues arise.
- Download counts on pi.dev/packages are rough signals (gameable); prefer Activity scores and repo inspection.
