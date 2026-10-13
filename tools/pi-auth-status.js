#!/usr/bin/env node
// pi-auth-status — show which credential sources exist per provider, without
// printing any secret values. Diagnostic companion to pi-auth-import.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const home = homedir();

function claudeAiOauth(path) {
  try {
    const oauth = JSON.parse(readFileSync(path, "utf-8"))?.claudeAiOauth;
    return oauth?.accessToken ? "has accessToken (full scopes)" : "no claudeAiOauth section";
  } catch {
    return "absent";
  }
}

function piCheck(provider) {
  try {
    return execFileSync("pi", ["auth", "check", "--provider", provider], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "not ready";
  }
}

console.log("openai-codex:");
const codexAuth = join(home, ".codex", "auth.json");
console.log(`  file: ${existsSync(codexAuth) ? codexAuth : "none"}`);
console.log(`  pi:   ${piCheck("openai-codex")}`);

console.log("anthropic (claude):");
for (const p of [join(home, ".claude.json"), join(home, ".claude", ".credentials.json")]) {
  console.log(`  file: ${p} — ${claudeAiOauth(p)}`);
}
console.log(
  `  env:  CLAUDE_CODE_OAUTH_TOKEN ${process.env.CLAUDE_CODE_OAUTH_TOKEN ? "set (inference-scoped — cannot read usage)" : "not set"}`,
);
