#!/usr/bin/env node
// vendor — manage the vendored package repos and build them into installable
// artifacts. vendor.json is the single manifest; the Makefile drives this.
//
// Each vendor/<name> is a plain git clone (origin = the upstream repo) with
// two local branches:
//
//   upstream  the pinned upstream commit (vendor.json "base"); only ever moves
//             fast-forward, never carries our commits
//   pi-dev    upstream + our commits; checked out, edited, and built
//
// Builds read the committed pi-dev tree (git archive / local clone), never
// the working tree, so uncommitted edits can't leak into an installed artifact.
//
// Commands:
//   sync              clone missing repos; check upstream == base and that
//                     pi-dev sits on top of upstream
//   status [--fetch]  pin, our commits, checkout/dirty state, upstream lag
//   check             fetch; compare each pin to its follow target
//                     (release = latest tag, same way pi asks pi.dev;
//                      head = origin/<track>, used by tegonzalez forks)
//   update name...    ff upstream to that target (or --to <ref>), re-pin, rebase
//   latest [name...]  update every stack package (skip reference-only clones)
//   build [id...]     build/<id> from pi-dev; rebuilds only when pi-dev moved
//   paths             absolute build paths of the extension stack, install order
//                     (extensions with "install": false are build-only inputs)
//   pi-bin            absolute path of the built pi CLI entry point

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "vendor.json");
const vendorDir = join(root, "vendor");
const buildDir = join(root, "build");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
const corePkg = manifest.packages.find((p) => p.core);
const piCli = join(buildDir, "pi", "cli");
const piBin = join(piCli, "node_modules", "@earendil-works", "pi-coding-agent", "dist", "bundle", "cli.js");

function die(msg) {
  console.error(`vendor: ${msg}`);
  process.exit(1);
}

function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function gitOk(repo, ...args) {
  return spawnSync("git", ["-C", repo, ...args], { stdio: "ignore" }).status === 0;
}

function run(cmd, cwd) {
  console.log(`   $ ${cmd}`);
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit" });
  if (r.status !== 0) die(`failed (${r.status}) in ${cwd}: ${cmd}`);
}

function repoDir(pkg) {
  return join(vendorDir, pkg.name);
}

function writeManifest() {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function select(names) {
  if (names.length === 0) return manifest.packages;
  return names.map((n) => manifest.packages.find((p) => p.name === n) ?? die(`unknown package: ${n}`));
}

function inStack(pkg) {
  return Boolean(pkg.core || (pkg.extensions ?? []).length > 0);
}

// tegonzalez forks follow origin/<track>. Everything else follows the newest
// release tag with the same prefix as the current pin (v1.2.3, name-v1.2.3,
// name@1.2.3). pi core asks https://pi.dev/api/latest-version first — the
// same endpoint `pi update` uses — then resolves that version to a tag.
function followKind(pkg) {
  if (pkg.follow === "head" || pkg.follow === "release") return pkg.follow;
  return /github\.com\/tegonzalez\//.test(pkg.url) ? "head" : "release";
}

function parseSemver(text) {
  const match = String(text).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function cmpSemver(left, right) {
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

function releasePrefix(version) {
  const match = String(version).match(/^(.*?)(\d+\.\d+\.\d+)$/);
  return match ? match[1] : "";
}

function latestReleaseTag(dir, version) {
  const prefix = releasePrefix(version);
  let best = null;
  let bestSemver = null;
  for (const tag of git(dir, "tag", "-l").split("\n").filter(Boolean)) {
    if (prefix ? !tag.startsWith(prefix) : tag.startsWith("v")) continue;
    const semver = parseSemver(prefix ? tag.slice(prefix.length) : tag);
    if (!semver) continue;
    if (!bestSemver || cmpSemver(semver, bestSemver) > 0) {
      best = tag;
      bestSemver = semver;
    }
  }
  return best;
}

function piApiVersion() {
  const r = spawnSync("curl", ["-fsS", "--max-time", "10", "https://pi.dev/api/latest-version"], { encoding: "utf-8" });
  if (r.status !== 0) return null;
  try {
    const version = JSON.parse(r.stdout).version;
    return typeof version === "string" && version.trim() ? version.trim() : null;
  } catch {
    return null;
  }
}

// Returns { label, sha } or { error }.
function followTarget(pkg, dir) {
  if (followKind(pkg) === "head") {
    const ref = `origin/${pkg.track}`;
    if (!gitOk(dir, "rev-parse", "-q", "--verify", `${ref}^{commit}`)) return { error: `no ${ref}` };
    return { label: ref, sha: git(dir, "rev-parse", `${ref}^{commit}`) };
  }
  if (pkg.core) {
    const version = piApiVersion();
    if (version) {
      const tag = gitOk(dir, "rev-parse", "-q", "--verify", `refs/tags/v${version}^{commit}`)
        ? `v${version}`
        : gitOk(dir, "rev-parse", "-q", "--verify", `refs/tags/${version}^{commit}`)
          ? version
          : null;
      if (tag) return { label: tag, sha: git(dir, "rev-parse", `${tag}^{commit}`) };
    }
  }
  const tag = latestReleaseTag(dir, pkg.version);
  if (!tag) return { error: "no release tag" };
  return { label: tag, sha: git(dir, "rev-parse", `${tag}^{commit}`) };
}

function extensions() {
  return manifest.packages.flatMap((pkg) => (pkg.extensions ?? []).map((ext) => ({ pkg, ext })));
}

// --- sync -----------------------------------------------------------------------

function sync(pkg) {
  const dir = repoDir(pkg);
  if (!existsSync(join(dir, ".git"))) {
    console.log(`>> clone ${pkg.name} (${pkg.url})`);
    mkdirSync(vendorDir, { recursive: true });
    execFileSync("git", ["clone", "-q", "--filter=blob:none", pkg.url, dir], { stdio: "inherit" });
    if (!gitOk(dir, "cat-file", "-e", `${pkg.base}^{commit}`)) git(dir, "fetch", "-q", "origin", pkg.base);
    const initial = git(dir, "symbolic-ref", "--short", "HEAD");
    git(dir, "branch", "-f", "upstream", pkg.base);
    git(dir, "branch", "--set-upstream-to", `origin/${pkg.track}`, "upstream");
    // Prefer a published pi-dev branch on the fork (our commits); otherwise start at the pin.
    const hasRemotePiDev = gitOk(dir, "fetch", "-q", "origin", "refs/heads/pi-dev:refs/remotes/origin/pi-dev");
    if (hasRemotePiDev) {
      git(dir, "checkout", "-q", "-B", "pi-dev", "origin/pi-dev");
      if (!gitOk(dir, "merge-base", "--is-ancestor", "upstream", "pi-dev")) {
        die(
          `vendor/${pkg.name}: origin/pi-dev is not on top of pin ${pkg.base.slice(0, 12)} — rebase it onto the pin and push`,
        );
      }
    } else {
      git(dir, "checkout", "-q", "-b", "pi-dev", "upstream");
    }
    if (initial !== "pi-dev" && gitOk(dir, "show-ref", "-q", `refs/heads/${initial}`)) {
      git(dir, "branch", "-q", "-D", initial);
    }
    return;
  }
  const upstream = gitOk(dir, "rev-parse", "-q", "--verify", "refs/heads/upstream") && git(dir, "rev-parse", "upstream");
  if (!upstream) die(`vendor/${pkg.name}: no 'upstream' branch`);
  if (!gitOk(dir, "rev-parse", "-q", "--verify", "refs/heads/pi-dev")) die(`vendor/${pkg.name}: no 'pi-dev' branch`);
  if (upstream !== pkg.base) {
    die(`vendor/${pkg.name}: upstream is ${upstream.slice(0, 12)} but vendor.json pins ${pkg.base.slice(0, 12)}`);
  }
  if (!gitOk(dir, "merge-base", "--is-ancestor", "upstream", "pi-dev")) {
    die(`vendor/${pkg.name}: pi-dev is not on top of upstream — finish the rebase (git -C vendor/${pkg.name} rebase upstream pi-dev)`);
  }
}

// --- status ---------------------------------------------------------------------

function status(fetch) {
  const rows = [["package", "pin", "ours", "head", "dirty", "upstream ahead"]];
  for (const pkg of manifest.packages) {
    const dir = repoDir(pkg);
    if (!existsSync(join(dir, ".git"))) {
      rows.push([pkg.name, pkg.version, "-", "MISSING", "-", "-"]);
      continue;
    }
    if (fetch) git(dir, "fetch", "-q", "--tags", "origin");
    const ours = git(dir, "rev-list", "--count", "upstream..pi-dev");
    const rebasing = ["rebase-merge", "rebase-apply"].some((d) => existsSync(join(dir, ".git", d)));
    const head = rebasing
      ? "REBASING"
      : gitOk(dir, "symbolic-ref", "-q", "HEAD")
        ? git(dir, "symbolic-ref", "--short", "HEAD")
        : "DETACHED";
    const dirty = git(dir, "status", "--porcelain", "--untracked-files=no") ? "yes" : "";
    const ahead = gitOk(dir, "rev-parse", "-q", "--verify", `origin/${pkg.track}`)
      ? git(dir, "rev-list", "--count", `upstream..origin/${pkg.track}`)
      : "?";
    const pinOk = git(dir, "rev-parse", "upstream") === pkg.base ? "" : " (!= vendor.json)";
    rows.push([pkg.name, pkg.version + pinOk, ours, head, dirty, ahead === "0" ? "" : ahead]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd());
  if (!fetch) console.log("\n(upstream ahead = last fetch; pass --fetch to refresh)");
}

// --- update ---------------------------------------------------------------------

function fetchOrigin(dir) {
  git(dir, "fetch", "-q", "--tags", "origin");
}

function relation(dir, from, to) {
  if (from === to) return "current";
  if (gitOk(dir, "merge-base", "--is-ancestor", from, to)) return "behind";
  if (gitOk(dir, "merge-base", "--is-ancestor", to, from)) return "ahead";
  return "diverged";
}

function check() {
  const rows = [["package", "follow", "pin", "latest", "state"]];
  for (const pkg of manifest.packages) {
    const dir = repoDir(pkg);
    const kind = followKind(pkg);
    if (!existsSync(join(dir, ".git"))) {
      rows.push([pkg.name, kind, pkg.version, "-", "MISSING"]);
      continue;
    }
    try {
      fetchOrigin(dir);
    } catch {
      rows.push([pkg.name, kind, pkg.version, "-", "fetch failed"]);
      continue;
    }
    const target = followTarget(pkg, dir);
    if (target.error) {
      rows.push([pkg.name, kind, pkg.version, "-", target.error]);
      continue;
    }
    const pin = gitOk(dir, "rev-parse", "-q", "--verify", "refs/heads/upstream")
      ? git(dir, "rev-parse", "upstream")
      : pkg.base;
    const state = relation(dir, pin, target.sha);
    const behind = state === "behind" ? `behind ${git(dir, "rev-list", "--count", `${pin}..${target.sha}`)}` : state;
    rows.push([pkg.name, kind, pkg.version, target.label, behind]);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd());
  const behind = rows.slice(1).filter((r) => r[4].startsWith("behind")).length;
  console.log(behind === 0 ? "\ndeps: every pin matches its follow target" : `\ndeps: ${behind} package(s) behind — make deps-update`);
}

function update(pkg, toRef) {
  const dir = repoDir(pkg);
  sync(pkg);
  if (git(dir, "symbolic-ref", "--short", "HEAD") !== "pi-dev") die(`vendor/${pkg.name}: check out pi-dev first`);
  if (git(dir, "status", "--porcelain", "--untracked-files=no")) die(`vendor/${pkg.name}: commit or stash changes first`);
  fetchOrigin(dir);
  const old = git(dir, "rev-parse", "upstream");
  const resolved = toRef
    ? { label: toRef, sha: git(dir, "rev-parse", `${toRef}^{commit}`) }
    : followTarget(pkg, dir);
  if (resolved.error) die(`vendor/${pkg.name}: ${resolved.error}`);
  const target = resolved.sha;
  if (target === old) {
    console.log(`${pkg.name}: up to date (${pkg.version})`);
    return;
  }
  if (!gitOk(dir, "merge-base", "--is-ancestor", old, target)) {
    die(`vendor/${pkg.name}: ${resolved.label} is not a fast-forward of upstream`);
  }
  git(dir, "update-ref", "refs/heads/upstream", target, old);
  pkg.base = target;
  pkg.version = followKind(pkg) === "release" && !toRef
    ? resolved.label
    : git(dir, "describe", "--tags", "--always", target);
  writeManifest();
  console.log(`${pkg.name}: upstream ${old.slice(0, 12)} -> ${target.slice(0, 12)} (${pkg.version}); rebasing pi-dev`);
  const r = spawnSync("git", ["-C", dir, "rebase", "-q", "--empty=drop", "--onto", "upstream", old, "pi-dev"], { stdio: "inherit" });
  if (r.status !== 0) {
    die(`vendor/${pkg.name}: rebase stopped on a conflict — resolve it, then git -C vendor/${pkg.name} rebase --continue`);
  }
  const ours = git(dir, "rev-list", "--count", "upstream..pi-dev");
  console.log(`${pkg.name}: pi-dev rebased (${ours} commit(s) on top)`);
}

// --- build ----------------------------------------------------------------------

function stampOk(dir, stamp) {
  try {
    return readFileSync(join(dir, ".built"), "utf-8").trim() === stamp;
  } catch {
    return false;
  }
}

function archive(pkg, path, dest) {
  const treeish = path ? `pi-dev:${path}` : "pi-dev";
  mkdirSync(dest, { recursive: true });
  run(`git -C '${repoDir(pkg)}' archive --format=tar '${treeish}' | tar -x -C '${dest}'`, root);
}

function npmInstall(dir, flags, ci = existsSync(join(dir, "package-lock.json"))) {
  run(`npm ${ci ? "ci" : "install"} --no-audit --no-fund ${flags}`.trim(), dir);
}

function buildExtension({ pkg, ext }) {
  const sha = git(repoDir(pkg), "rev-parse", "pi-dev");
  const stamp = `${sha}:${ext.path ?? ""}`;
  const out = join(buildDir, ext.id);
  if (stampOk(out, stamp)) return;
  console.log(`>> build ${ext.id} (${pkg.name}@${sha.slice(0, 12)}${ext.path ? ` ${ext.path}` : ""})`);
  const tmp = `${out}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  archive(pkg, ext.path, tmp);
  const pj = JSON.parse(readFileSync(join(tmp, "package.json"), "utf-8"));
  // "local": {dep: id} points registry deps at our own build/<id> instead.
  for (const [dep, id] of Object.entries(ext.local ?? {})) {
    if (!pj.dependencies?.[dep]) die(`${ext.id}: "local" names ${dep}, which is not a dependency`);
    pj.dependencies[dep] = `file:${join(buildDir, id)}`;
  }
  // Peer deps are omitted: pi aliases @earendil-works/* (and typebox) to its
  // own copies when loading extensions, so registry copies would only shadow.
  if (ext.local) writeFileSync(join(tmp, "package.json"), `${JSON.stringify(pj, null, 2)}\n`);
  if (ext.build) {
    npmInstall(tmp, "");
    if (typeof ext.build === "string") run(`npm run ${ext.build}`, tmp);
    run("npm prune --omit=dev --omit=peer --no-audit --no-fund", tmp);
  } else if (Object.keys(pj.dependencies ?? {}).length > 0) {
    // Nothing to compile, so devDependencies are dead weight — and in pnpm
    // monorepos they carry "catalog:" specs npm can't even parse.
    delete pj.devDependencies;
    writeFileSync(join(tmp, "package.json"), `${JSON.stringify(pj, null, 2)}\n`);
    npmInstall(tmp, "--omit=dev --omit=peer", !ext.local && existsSync(join(tmp, "package-lock.json")));
  }
  writeFileSync(join(tmp, ".built"), `${stamp}\n`);
  rmSync(out, { recursive: true, force: true });
  renameSync(tmp, out);
}

// pi core, the way upstream builds local release artifacts: install the
// monorepo, pack every public package into one artifact set (this hydrates
// provider model data over the network — it isn't committed), then install
// @earendil-works/pi-coding-agent into a consumer dir wired to that set, so
// every @earendil-works/* dependency is our build, none from the registry.
function buildCore() {
  const sha = git(repoDir(corePkg), "rev-parse", "pi-dev");
  const out = join(buildDir, "pi");
  if (stampOk(out, sha) && existsSync(piBin)) return;
  console.log(`>> build pi (${corePkg.name}@${sha.slice(0, 12)})`);
  rmSync(out, { recursive: true, force: true });
  const src = join(out, "src");
  const artifacts = join(out, "artifacts");
  // A local clone, not an archive: the packer records `git rev-parse HEAD`.
  run(`git clone -q --shared --branch pi-dev '${repoDir(corePkg)}' '${src}'`, root);
  run("npm ci --ignore-scripts --no-audit --no-fund", src);
  run(`npm run pack:packages -- --out '${artifacts}' --force`, src);
  mkdirSync(piCli, { recursive: true });
  writeFileSync(join(piCli, "package.json"), '{"private":true,"type":"module"}\n');
  run(
    `node scripts/use-local-packages.mjs --manifest '${join(artifacts, "manifest.json")}' --consumer '${piCli}' --package @earendil-works/pi-coding-agent`,
    src,
  );
  run("npm install --ignore-scripts --omit=dev --no-audit --no-fund", piCli);
  if (!existsSync(piBin)) die(`pi build produced no CLI at ${piBin}`);
  writeFileSync(join(out, ".built"), `${sha}\n`);
}

function build(ids) {
  for (const pkg of manifest.packages) sync(pkg);
  const all = extensions();
  const wantCore = ids.length === 0 || ids.includes("pi");
  const selected = ids.length === 0 ? all : ids.filter((id) => id !== "pi").map((id) => all.find((e) => e.ext.id === id) ?? die(`unknown extension: ${id}`));
  mkdirSync(buildDir, { recursive: true });
  if (wantCore) buildCore();
  for (const e of selected) buildExtension(e);
}

// --- main -----------------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const toIdx = rest.indexOf("--to");
const toRef = toIdx >= 0 ? rest.splice(toIdx, 2)[1] : undefined;
const args = rest.filter((a) => !a.startsWith("--"));

switch (cmd) {
  case "sync":
    for (const pkg of select(args)) sync(pkg);
    console.log("vendor: all repos present, pinned, and pi-dev on top of upstream");
    break;
  case "status":
    status(rest.includes("--fetch"));
    break;
  case "check":
    check();
    break;
  case "update":
    if (args.length === 0) die("update: name the package(s) — or use `latest` for the whole stack");
    if (toRef && args.length !== 1) die("--to needs exactly one package name");
    for (const pkg of select(args)) update(pkg, toRef);
    break;
  case "latest":
    if (toRef) die("latest does not take --to; use update <name> --to <ref>");
    for (const pkg of select(args).filter((pkg) => args.length > 0 || inStack(pkg))) update(pkg);
    break;
  case "build":
    build(args);
    break;
  case "paths":
    for (const { ext } of extensions().filter((e) => e.ext.install !== false)) console.log(join(buildDir, ext.id));
    break;
  case "pi-bin":
    console.log(piBin);
    break;
  default:
    die("usage: vendor.js sync|status [--fetch]|check|update name... [--to ref]|latest [name...]|build [id...]|paths|pi-bin");
}
