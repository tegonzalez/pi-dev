# AGENTS.md

## What this repo is

Makefile-driven, reproducible setup for the pi coding agent plus a curated
extension stack, built entirely from local repos. The Makefile is the only
entry point (`make help`).

- `vendor.json` — the manifest: every package, upstream URL, tracked branch, pin
- `vendor/`     — one plain git clone per package (gitignored, not submodules)
- `build/`      — generated from committed `pi-dev` trees; pi installs these
- `tools/`      — standalone node scripts, no new dependencies
- `docs/`       — stack evaluation and research notes

Every package — pi core included — is potentially a fork. There is no separate
"forks" or "upstream" area: each `vendor/<name>` repo has

- `origin`   — the upstream repo
- `upstream` — local branch at the pinned commit (`vendor.json` `base`);
  moves fast-forward only, never carries our commits
- `pi-dev`   — `upstream` + our commits; the checked-out branch, the one built

## Working policy (non-negotiable)

1. **Work on top of upstream, never defer to it.** Every change is a commit on
   a `pi-dev` branch, against the real upstream source, structured so it
   *could* be submitted as a PR later. Whether or when to submit is the user's
   decision and is never part of the task. "Upstream it" is not a deliverable.
2. **Commits, not patch files.** No patch lanes, no build-time diffs. Builds
   read the committed `pi-dev` tree, so uncommitted work is never installed.
3. **Updating = ff + rebase.** Pins track a follow target, not the clone-time
   commit. `make deps` reports drift. `make deps-update` (or
   `make vendor-update PKG=<name>`) fast-forwards `upstream` to that target —
   newest release tag, or `origin/<track>` when `"follow": "head"` — re-pins
   `vendor.json`, and rebases `pi-dev` onto it. `TO=<ref>` overrides one
   package. Never merge upstream into `pi-dev`; never move `upstream`
   non-fast-forward.
4. **Change the layer that owns the behavior.** Core CLI/TUI behavior goes in
   `vendor/pi`; provider quirks go in the owning provider extension's repo;
   diagnostics/automation go in `tools/`. Never route around the owning layer
   because another layer is easier to modify.
5. **Verify against the installed artifact.** Claims about pi behavior come
   from the actually installed build (`readlink -f $(command -v pi)`,
   `pi --version`, `pi list`) and the vendored source — not from memory.

## Promotion to submodules

`vendor/` is gitignored, so `pi-dev` commits live only in the local clones.
When a package carries commits worth keeping (`make vendor-status`, column
`ours` > 0), it is a candidate to be pushed to a fork remote and promoted to a
git submodule — that is the user's call, flag it rather than doing it.
