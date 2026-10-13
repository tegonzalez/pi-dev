# Using a Codex CLI (ChatGPT Plus/Pro) Account with Pi

Plan and recommendations, based on ecosystem research verified 2026-09-17.

**TL;DR:** You don't need any extension to use a Codex/ChatGPT account with pi — it's built in. Extensions become relevant for multi-account rotation, quota management, and Codex-specific tooling.

## 1. Baseline: pi's built-in `openai-codex` provider (no extension)

Pi ships first-class OAuth for ChatGPT Plus/Pro subscriptions. In the pi TUI:

```
/login    →  choose "ChatGPT Plus/Pro (Codex)"  →  browser OAuth
```

Gotchas (from [pi.dev providers docs](https://pi.dev/docs/latest/providers) and [community setup guide](https://www.superpig.win/blog/pi-openai-codex-setup)):

- It's the **`openai-codex`** provider, not the plain `openai` API-key provider — different auth paths.
- Verify with `pi --list-models openai`. If `/model` shows nothing after login, check whether an `enabledModels` filter in your config is hiding the codex models.

This covers single-account use. The model catalog refreshes from pi.dev's remote overlay, so new Codex models appear without a pi upgrade.

## 2. pi-multi-pass — the main extension to consider

[hjanuschka/pi-multi-pass](https://github.com/hjanuschka/pi-multi-pass) (★494, actively maintained) is the strongest Codex-specific companion, especially if you hit ChatGPT's 5-hour/7-day subscription windows:

- **Multiple Codex accounts** — `/subs add` extra `openai-codex` accounts (work/personal), auto-rotate on rate limits mid-turn.
- **Codex-aware quota checks** — `/subs limits` has a built-in Codex checker (queries ChatGPT's usage endpoint, summarizes 5h and 7d windows); the `quota-first` pool strategy uses it to fail over to the account with the most headroom instead of blind round-robin.
- **Project affinity** — `.pi/multi-pass.json` can restrict a work repo to your work Codex account only.
- **Model presets** — named cross-provider routing (e.g. `coding-budget` starting on a cheap Codex mini model with fallback).

**Caveat:** npm releases lag the repo (npm 1.3.0 is from April; repo active through September). Install from git for the current version:

```
pi install git:github.com/hjanuschka/pi-multi-pass
```

Lighter-weight alternatives if multi-pass is overkill:

- [`@narumitw/pi-codex-accounts`](https://pi.dev/packages/@narumitw/pi-codex-accounts) (narumiruna) — switch self-managed Codex accounts without touching `/login`.
- [`pi-multi-account`](https://pi.dev/packages/pi-multi-account) — numbered account slots inside `/login` itself.

## 3. Codex-specific tooling

- **[pi-codex-image-tool](https://npmx.dev/package/pi-codex-image-tool)** (ross-jill-ws) — exposes Codex's hosted image generation as a `codex_image` tool, and adds an OpenAI `service_tier` selector (footer display + hotkey cycling) applied to every Codex request. Useful for controlling priority/flex tiering on subscription traffic.

## 4. Forks worth considering for a Codex-centric setup

- **[senpi](https://github.com/code-yeongyu/senpi)** (★434, active) — the most Codex-relevant fork: ships **Codex-style `apply_patch` for GPT models** plus per-model prompt presets, materially improving edit reliability with GPT models. Actively maintained but self-flagged experimental — consider it if committing to pi as a daily driver with Codex, not for a first try.
- **[oh-my-pi](https://github.com/can1357/oh-my-pi)** (★31.6k) — 60+ providers including Codex, plus LSP/DAP and built-in subagents. For *Codex utilization specifically* it adds nothing over upstream pi's built-in provider; choose it for the batteries, not the auth.

## 5. What to skip

CLI-bridge extensions that shell out to `codex -p` per turn (the pattern luongnv89's monorepo uses for Claude/Grok). For Codex there's no reason to: pi talks to the ChatGPT OAuth endpoint natively with full streaming and tool-call support.

## Recommended setups

| Situation | Setup |
|---|---|
| One ChatGPT Plus/Pro account, normal use | Stock pi + `/login` → Codex. Nothing else. |
| Hitting 5h/7d rate limits, or 2+ accounts | + pi-multi-pass (git install), quota-first pool, `/subs limits` |
| Want cheap-model subagents to save quota | + `pi-subagents` — run exploration/implementation on mini models, keep the big Codex model for planning |
| Heavy GPT-model editing, want apply_patch | Evaluate the senpi fork |

## Quick command reference

```
pi                                          # start pi
/login                                      # → ChatGPT Plus/Pro (Codex)
pi --list-models openai                     # verify codex models visible
pi install git:github.com/hjanuschka/pi-multi-pass
/subs add                                   # add extra Codex accounts
/subs limits                                # check 5h / 7d quota per account
/pool create                                # rotation pool (strategy: quota-first)
/pool project                               # per-project account restrictions
/mp-preset create                           # named model-routing presets
```
