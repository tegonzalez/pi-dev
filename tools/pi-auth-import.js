#!/usr/bin/env node
// pi-auth-import — seed pi's credential store (~/.pi/agent/auth.json) from
// external auth artifacts, so pi never needs its interactive /login:
//
//   openai-codex  <- ~/.codex/auth.json (tokens.access_token / refresh_token / account_id)
//   anthropic     <- nothing to do: pi-claude-bridge's Agent SDK honors
//                    CLAUDE_CODE_OAUTH_TOKEN / ~/.claude/.credentials.json itself
//
// Idempotent: an existing entry is only replaced when the source token expires
// later (fresher). Writes are atomic (tmp + rename) with 0600 perms, mirroring
// pi's own auth-storage conventions. Run any time a vendor CLI re-auths.

import { mkdirSync, readFileSync, renameSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
const authPath = join(agentDir, "auth.json");

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function jwtExpiresMs(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const sources = [
  {
    provider: "openai-codex",
    read() {
      const path = join(homedir(), ".codex", "auth.json");
      const data = readJson(path);
      if (!data?.tokens) return { skip: "no ~/.codex/auth.json tokens (run codex login once)" };
      const { access_token, refresh_token, account_id } = data.tokens;
      if (!access_token || !refresh_token) return { skip: "~/.codex/auth.json: missing tokens" };
      const expires = jwtExpiresMs(access_token);
      if (!expires) return { skip: "~/.codex/auth.json: cannot read exp from access token" };
      return {
        credential: {
          type: "oauth",
          access: access_token,
          refresh: refresh_token,
          expires,
          ...(account_id ? { accountId: account_id } : {}),
        },
        from: path,
      };
    },
  },
];

function main() {
  let store = readJson(authPath);
  if (typeof store !== "object" || store === null || Array.isArray(store)) store = {};

  let changed = false;
  for (const { provider, read } of sources) {
    const result = read();
    if (result.skip) {
      console.log(`skip  ${provider}: ${result.skip}`);
      continue;
    }
    const existing = store[provider];
    if (
      existing?.type === "oauth" &&
      typeof existing.expires === "number" &&
      existing.expires >= result.credential.expires
    ) {
      console.log(`keep  ${provider}: existing credential is as fresh or fresher`);
      continue;
    }
    store[provider] = result.credential;
    changed = true;
    const mins = Math.round((result.credential.expires - Date.now()) / 60000);
    console.log(`import ${provider}: from ${result.from} (access token valid ~${mins} min)`);
  }

  if (changed) {
    mkdirSync(dirname(authPath), { recursive: true, mode: 0o700 });
    const tmp = `${authPath}.tmp-${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });
    renameSync(tmp, authPath);
    chmodSync(authPath, 0o600);
    console.log(`wrote ${authPath}`);
  }
  console.log("note  anthropic: no import needed — pi-claude-bridge honors CLAUDE_CODE_OAUTH_TOKEN automatically");
}

main();
