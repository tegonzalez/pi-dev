# Makefile — pi-dev: build pi and its extension stack from our local vendor/
# repos and install them. Credentials are reused at runtime (no pi /login).
#
# Layout:
#   vendor.json — the manifest: every package, its upstream URL, and pin
#   vendor/     — one plain git clone per package (gitignored), branches
#                 `upstream` (pinned, ff-only) and `pi-dev` (upstream + ours)
#   build/      — generated from committed pi-dev trees; pi installs these
#   tools/      — node scripts the targets below call (no extra dependencies)
#
# Requires Node >= 22, npm, and git on PATH.
#
# Quick start:
#   make                # clone + build + install pi and the stack + codex import
#   pi                  # all configured providers just work
#   make test           # full uninstall/install cycle + verification

.DEFAULT_GOAL := all

NPM     ?= npm
CC      ?= cc
CFLAGS  ?= -O2 -Wall -Wextra -Wpedantic
VENDOR  := node $(CURDIR)/tools/vendor.js
PI_HOME := $(HOME)/.pi
# Where the built pi CLI is linked; must be on PATH.
BIN_DIR ?= $(HOME)/.local/bin
PI      := $(BIN_DIR)/pi
LL_PI   := $(CURDIR)/build/ll-pi

# Minimum supported core version: >= 0.82 baseline for the provider stack,
# >= 0.58.5 mandatory for the CVE-2026-5556 extension-loader fix.
MIN_PI_VERSION := 0.82.0

# Extension build paths, in install order (vendor.json order; providers last so
# a provider failure can't leave the core stack uninstalled). Absolute: pi
# records the source verbatim, and verify/uninstall match on that string.
EXTENSIONS = $(shell $(VENDOR) paths)

.PHONY: all help vendor vendor-status deps deps-update vendor-update build buildclean install-pi \
        install models auth-import auth-status setup verify \
        uninstall purge clean distclean reinstall test list

all: install auth-import ## Default: clone + build + install + codex credential import

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-14s %s\n", $$1, $$2}'

# --- vendor: local package repos --------------------------------------------------

vendor: ## Clone missing vendor/ repos; check pins and pi-dev branches
	@$(VENDOR) sync

vendor-status: ## Pin, our commits, dirty state, and upstream lag per package
	@$(VENDOR) status --fetch

deps: ## Compare every pin to latest release (tegonzalez forks: origin HEAD or pi-dev)
	@$(VENDOR) check

# PKG="a b" limits the set. Reference-only clones are skipped unless named.
# Then: make install.
deps-update: ## Move stack pins to latest release or fork HEAD, rebase pi-dev; pull fork pi-dev
	@$(VENDOR) latest $(PKG)

# PKG="a b" names the packages (required); TO=<ref> (with one PKG) overrides
# the follow target. Default target is the latest release tag, origin/<track>
# for packages with "follow": "head", or origin/pi-dev with "follow": "pi-dev"
# (pi-dev fast-forwards to it; origin/<track> is not pulled). Then: make install.
vendor-update: ## Fast-forward one pin to its follow target (PKG=.. [TO=..])
	@$(VENDOR) update $(PKG) $(if $(TO),--to $(TO))

# --- build ------------------------------------------------------------------------

build: $(LL_PI) ## Build pi + every extension from committed pi-dev trees (incremental)
	@$(VENDOR) build

$(LL_PI): $(CURDIR)/tools/ll-pi.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -std=c11 -o $@ $<

buildclean: ## Delete build artifacts (next make rebuilds everything)
	rm -rf $(CURDIR)/build

# --- install ----------------------------------------------------------------------

# The built CLI replaces any registry install: an npm-global pi would shadow
# ours on PATH and `pi update self` would pull upstream code over it.
install-pi: build ## Link the built pi CLI into BIN_DIR
	@if $(NPM) ls -g --depth=0 @earendil-works/pi-coding-agent >/dev/null 2>&1; then \
		echo ">> removing registry pi (npm -g) in favor of the local build"; \
		$(NPM) uninstall -g @earendil-works/pi-coding-agent; \
	fi
	@mkdir -p $(BIN_DIR)
	@ln -sfn "$$($(VENDOR) pi-bin)" $(PI)
	@echo "pi -> $$(readlink $(PI))"

install: install-pi ## Build + install pi and the full extension stack
	@for ext in $(EXTENSIONS); do \
		echo ">> pi install $$ext"; \
		$(PI) install "$$ext" || exit 1; \
	done
	@$(MAKE) --no-print-directory verify

models: ## Refresh pi's model catalogs (data only; code moves via vendor-update)
	$(PI) update --models

auth-import: ## Seed pi credentials from ~/.codex (no /login)
	@node tools/pi-auth-import.js

auth-status: ## Show which credential sources exist per provider (no secrets)
	@node tools/pi-auth-status.js

setup: verify ## Verify install and show post-install steps
	@echo ""
	@echo "Auth (no pi /login needed):"
	@echo "  openai-codex: 'make auth-import' converts ~/.codex/auth.json (run 'codex login' once first)"
	@echo "  anthropic   : pi-claude-bridge runs Claude Code on its own login (claude /login once) — nothing to seed"
	@echo ""
	@echo "Then:"
	@echo "  pi --list-models        # confirm models are visible"
	@echo "  /sandbox                # needs bubblewrap (bwrap) on Linux; see docs/stack.md"
	@echo "  Multi-account: /subs add, /subs limits, /pool create (pi-multi-pass)"

verify: ## Check pi is our build, its version, and that the full stack is installed
	@onpath=$$(command -v pi || true); \
	if [ "$$(readlink -f "$$onpath")" != "$$(readlink -f "$$($(VENDOR) pi-bin)")" ]; then \
		echo "pi on PATH ($${onpath:-none}) is not the local build — put $(BIN_DIR) first on PATH"; exit 1; \
	fi
	@v=$$($(PI) --version); \
	[ "$$(printf '%s\n%s\n' "$(MIN_PI_VERSION)" "$$v" | sort -V | head -1)" = "$(MIN_PI_VERSION)" ] \
		|| { echo "pi $$v < $(MIN_PI_VERSION)"; exit 1; }; \
	echo "pi $$v OK (local build, >= $(MIN_PI_VERSION))"
	@installed=$$($(PI) list); \
	for ext in $(EXTENSIONS); do \
		echo "$$installed" | grep -qF "$$ext" \
			|| { echo "MISSING: $$ext"; exit 1; }; \
	done
	@echo "verify: all stack extensions present"

list: ## List installed extensions
	@$(PI) list

uninstall: ## Remove the extension stack (idempotent)
	@[ -x $(PI) ] || { echo "uninstall: no pi at $(PI)"; exit 0; }; \
	installed=$$($(PI) list); \
	for ext in $(EXTENSIONS); do \
		if echo "$$installed" | grep -qF "$$ext"; then \
			echo ">> pi remove $$ext"; \
			$(PI) remove "$$ext" || exit 1; \
		fi; \
	done; \
	echo "uninstall: done"

purge: ## Remove ALL installed pi packages (any source)
	@$(PI) list | grep -oE '^  (npm|git|https?|ssh|\.|/)[^ ]*' | while read -r src; do \
		echo ">> pi remove $$src"; \
		$(PI) remove "$$src" || exit 1; \
	done
	@$(PI) list

clean: uninstall ## Uninstall the stack + unlink pi (keeps ~/.pi config/auth)
	rm -f $(PI)
	@echo "Config and auth kept under $(PI_HOME) — use 'make distclean' to wipe."

distclean: uninstall ## Full wipe: extensions, pi link, and ~/.pi
	rm -f $(PI)
	rm -rf $(PI_HOME)
	@echo "Wiped $(PI_HOME)."

reinstall: uninstall install ## Cycle: remove the stack, reinstall, verify

test: ## Glitch check: 2x uninstall/install cycles + verify
	@$(MAKE) --no-print-directory reinstall
	@$(MAKE) --no-print-directory reinstall
	@$(MAKE) --no-print-directory verify
	@echo "test: uninstall/install cycles clean"
