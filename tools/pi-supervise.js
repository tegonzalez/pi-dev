#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const RIGHTS = new Set([
	"read_file", "write_file", "read_dir", "remove_dir", "remove_file",
	"make_dir", "make_reg", "make_sym", "refer", "truncate", "execute",
]);

function usage() {
	return [
		"Usage: node tools/pi-supervise.js [options] [-- pi-options]",
		"  --workspace <dir>          Workspace to confine (default: cwd)",
		"  --policy <file>            Landlock policy JSON",
		"  --permission-config <file> Permission-system config template",
		"  --judge-record <file>      Judge record JSON",
		"  --pi <executable>          Pi executable (default: pi on PATH)",
		"  --ll-pi <executable>       Landlock wrapper (default: build/ll-pi)",
		"  --agent-dir <dir>          Agent directory inside the workspace",
		"  --session-id <id>          Stable session id (default: landlock-rpc)",
		"  --extension <path>         Non-judge extension package; repeatable",
	].join("\n");
}

function parseArgs(argv) {
	const options = {
		workspace: process.cwd(),
		policy: path.join(ROOT, "config", "landlock-policy.json"),
		permissionConfig: path.join(ROOT, "config", "permission-system.json"),
		judgeRecord: path.join(ROOT, "config", "judge.json"),
		pi: "pi",
		llPi: path.join(ROOT, "build", "ll-pi"),
		agentDir: null,
		sessionId: "landlock-rpc",
		extensions: [],
		passthrough: [],
	};
	const valued = new Map([
		["--workspace", "workspace"], ["--policy", "policy"],
		["--permission-config", "permissionConfig"],
		["--judge-record", "judgeRecord"], ["--pi", "pi"],
		["--ll-pi", "llPi"], ["--agent-dir", "agentDir"],
		["--session-id", "sessionId"],
	]);
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--") {
			options.passthrough = argv.slice(i + 1);
			break;
		}
		if (arg === "--help" || arg === "-h") {
			options.help = true;
			continue;
		}
		if (arg === "--extension") {
			if (++i >= argv.length) throw new Error("--extension requires a path");
			options.extensions.push(argv[i]);
			continue;
		}
		const key = valued.get(arg);
		if (!key) throw new Error(`unknown supervisor option: ${arg}`);
		if (++i >= argv.length) throw new Error(`${arg} requires a value`);
		options[key] = argv[i];
	}
	return options;
}

function validatePassthrough(args) {
	const blocked = new Set([
		"--mode", "--session", "--session-id", "--session-dir", "--no-session",
		"--continue", "-c", "--resume", "-r", "--fork", "--extension", "-e",
		"--no-extensions", "-ne", "--approve", "-a", "--no-approve", "-na",
		"--print", "-p",
	]);
	const blockedPrefixes = ["--mode=", "--session=", "--session-id=", "--session-dir=", "--extension="];
	for (const arg of args) {
		if (blocked.has(arg) || blockedPrefixes.some((prefix) => arg.startsWith(prefix))) {
			throw new Error(`passthrough option conflicts with supervisor invariants: ${arg}`);
		}
	}
}

function resolveExecutable(name) {
	if (path.isAbsolute(name)) return name;
	for (const directory of (process.env.PATH || "").split(path.delimiter)) {
		if (!directory) continue;
		const candidate = path.join(directory, name);
		try {
			fs.accessSync(candidate, fs.constants.X_OK);
			return candidate;
		} catch {}
	}
	throw new Error(`executable not found on PATH: ${name}`);
}

function inside(parent, child) {
	const relative = path.relative(parent, child);
	return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function realDirectory(directory, label) {
	const resolved = fs.realpathSync(path.resolve(directory));
	if (!fs.statSync(resolved).isDirectory()) throw new Error(`${label} is not a directory: ${resolved}`);
	return resolved;
}

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, "utf8"));
}

function render(value, replacements) {
	if (typeof value === "string") {
		let result = value;
		for (const [key, replacement] of Object.entries(replacements)) {
			result = result.split(`{{${key}}}`).join(replacement);
		}
		const unresolved = result.match(/{{[A-Z][A-Z0-9_]*}}/);
		if (unresolved) throw new Error(`unresolved config placeholder: ${unresolved[0]}`);
		return result;
	}
	if (Array.isArray(value)) return value.map((item) => render(item, replacements));
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [
			render(key, replacements), render(item, replacements),
		]));
	}
	return value;
}

function writeAtomic(file, contents, mode = 0o600) {
	fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
	const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
	try {
		fs.writeFileSync(temporary, contents, { mode });
		fs.renameSync(temporary, file);
	} finally {
		if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
	}
}

function validateRights(list, label) {
	if (!Array.isArray(list) || list.length === 0) throw new Error(`${label} must be a non-empty array`);
	if (new Set(list).size !== list.length) throw new Error(`${label} contains duplicates`);
	for (const right of list) if (!RIGHTS.has(right)) throw new Error(`unknown Landlock right: ${right}`);
}

function validatePolicy(policy, workspace) {
	if (policy.version !== 1) throw new Error("Landlock policy version must be 1");
	validateRights(policy.handled, "handled");
	if (!Array.isArray(policy.rules) || policy.rules.length === 0) throw new Error("Landlock policy needs rules");
	const handled = new Set(policy.handled);
	const accountHome = fs.realpathSync(os.homedir());
	const accountAuthFile = path.join(accountHome, ".pi", "agent", "auth.json");
	for (const rule of policy.rules) {
		if (!path.isAbsolute(rule.path)) throw new Error(`policy path is not absolute: ${rule.path}`);
		rule.path = fs.realpathSync(rule.path);
		validateRights(rule.access, `access for ${rule.path}`);
		if (rule.access.some((right) => !handled.has(right))) throw new Error(`rule exceeds handled rights: ${rule.path}`);
		if (inside(rule.path, accountHome) || (!inside(workspace, rule.path) && inside(accountHome, rule.path))) {
			throw new Error(`policy rule is not allowed by the account home boundary: ${rule.path}`);
		}
		if (fs.statSync(rule.path).isDirectory() && inside(rule.path, accountAuthFile)) {
			throw new Error(`policy rule contains the account auth file: ${rule.path}`);
		}
	}
}

function validatePermission(config, linkName) {
	if (config.yoloMode !== false) throw new Error("permission config must set yoloMode false");
	if (JSON.stringify(config.authorizerChain) !== JSON.stringify([linkName])) {
		throw new Error(`permission config must use authorizerChain [${linkName}]`);
	}
	const permission = config.permission;
	if (!permission || permission["*"] !== "deny") throw new Error("permission fallback must be deny");
	if (permission.read !== "ask" || permission.bash !== "ask") throw new Error("read and bash must remain ask");
	if (permission.external_directory !== "deny") throw new Error("external_directory must be deny");
}

function readJudge(file) {
	const bytes = fs.readFileSync(file);
	const record = JSON.parse(bytes.toString("utf8"));
	const expected = ["configFile", "extension", "linkName"];
	const actual = record && typeof record === "object" && !Array.isArray(record) ? Object.keys(record).sort() : [];
	if (JSON.stringify(actual) !== JSON.stringify(expected) || expected.some((key) => typeof record[key] !== "string")) {
		throw new Error("judge record must have exactly three string fields: linkName, extension, configFile");
	}
	if (expected.some((key) => record[key].trim() === "")) {
		throw new Error("missing judge: linkName, extension, and configFile must be non-empty");
	}
	const base = path.dirname(file);
	try {
		const extension = fs.realpathSync(path.resolve(base, record.extension));
		const configFile = path.resolve(base, record.configFile);
		const configBytes = fs.readFileSync(configFile);
		return { ...record, bytes, extension, configFile, configBytes };
	} catch (error) {
		throw new Error(`missing judge ${record.linkName}: ${error.message}`);
	}
}

function copyPackage(source, destination) {
	fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
	const temporary = `${destination}.tmp-${process.pid}`;
	fs.rmSync(temporary, { recursive: true, force: true });
	try {
		fs.cpSync(source, temporary, {
			recursive: true,
			dereference: true,
			filter: (item) => path.basename(item) !== "auth.json",
		});
		fs.renameSync(temporary, destination);
	} finally {
		if (fs.existsSync(temporary)) fs.rmSync(temporary, { recursive: true, force: true });
	}
}

function preparePackages(agentDir, options, candidateId, judge) {
	const packages = [judge.extension, ...options.extensions.map((item) => fs.realpathSync(path.resolve(item)))];
	return [...new Set(packages)].map((source, index) => {
		const destination = path.join(agentDir, "runtime-extensions", `${candidateId}-${index}-${path.basename(source)}`);
		copyPackage(source, destination);
		return destination;
	});
}

function nodePrefix() {
	return path.dirname(path.dirname(fs.realpathSync(process.execPath)));
}

function piPackageRoot(piExecutable) {
	return path.dirname(path.dirname(path.dirname(piExecutable)));
}

function judgeEventCandidates(record) {
	if (!record || typeof record !== "object") return [];
	const candidates = [record];
	if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
		candidates.push({ ...record.data, type: record.event || record.name || record.method || record.type });
	}
	if (record.event && typeof record.event === "object" && !Array.isArray(record.event)) {
		candidates.push(record.event);
	}
	return candidates;
}

function registeredJudgeLink(record) {
	for (const candidate of judgeEventCandidates(record)) {
		const kind = [candidate.type, candidate.event, candidate.method, candidate.action].filter((item) => typeof item === "string").join(" ");
		if (!/(?:authorizer|judge|link)/i.test(kind) || !/(?:registered|registration|ready)/i.test(kind)) continue;
		if (candidate.registered === false || candidate.ready === false) continue;
		const link = [candidate.linkName, candidate.authorizerName, candidate.authorizer, candidate.link, candidate.name]
			.find((item) => typeof item === "string" && item.length > 0);
		if (link) return link;
	}
	return null;
}

function judgeFailure(record) {
	for (const candidate of judgeEventCandidates(record)) {
		const kind = [candidate.type, candidate.event, candidate.method, candidate.action, candidate.status]
			.filter((item) => typeof item === "string").join(" ");
		if (!/(?:authorizer|judge|link)/i.test(kind)) continue;
		if (/(?:deferred|timed[ _-]?out|timeout|unusable|missing|failed)/i.test(kind)) {
			return String(candidate.error || candidate.message || candidate.status || kind);
		}
	}
	return null;
}

function sessionFileFromState(data) {
	if (!data || typeof data !== "object") return null;
	for (const key of ["sessionFile", "sessionPath"]) if (typeof data[key] === "string") return data[key];
	if (data.session && typeof data.session === "object") {
		for (const key of ["file", "path", "sessionFile"]) if (typeof data.session[key] === "string") return data.session[key];
	}
	return null;
}

function findSessionFile(agent) {
	try {
		const sessionDir = path.join(agent.agentDir, "sessions");
		if (!fs.existsSync(sessionDir)) return null;
		const files = [];
		const walk = (directory) => {
			for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
				const file = path.join(directory, entry.name);
				if (entry.isDirectory()) walk(file);
				else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(file);
			}
		};
		walk(sessionDir);
		const expected = files.filter((file) => {
			const name = path.basename(file);
			return name === `${agent.sessionId}.jsonl` || name.endsWith(`_${agent.sessionId}.jsonl`);
		});
		const candidates = expected.length > 0 ? expected : files;
		if (candidates.length !== 1) return null;
		const canonical = fs.realpathSync(candidates[0]);
		if (!inside(fs.realpathSync(sessionDir), canonical)) throw new Error("session file resolves outside the agent session directory");
		return canonical;
	} catch (error) {
		if (error.code === "ENOENT") return null;
		throw error;
	}
}

function createLineReader(stream, onLine) {
	let buffer = "";
	stream.setEncoding("utf8");
	stream.on("data", (chunk) => {
		buffer += chunk;
		for (;;) {
			const newline = buffer.indexOf("\n");
			if (newline < 0) break;
			let line = buffer.slice(0, newline);
			buffer = buffer.slice(newline + 1);
			if (line.endsWith("\r")) line = line.slice(0, -1);
			onLine(line);
		}
	});
}

class Supervisor {
	constructor(options) {
		this.options = options;
		this.state = {
			workspace: realDirectory(options.workspace, "workspace"),
			policyPath: path.resolve(options.policy),
			judgeRecordPath: path.resolve(options.judgeRecord),
			agentDir: options.agentDir ? path.resolve(options.agentDir) : null,
			sessionId: options.sessionId,
		};
		this.current = null;
		this.nextId = 1;
		this.inputChain = Promise.resolve();
		this.rotationChain = Promise.resolve();
		this.shuttingDown = false;
	}

	log(message) {
		process.stderr.write(`pi-supervise: ${message}\n`);
	}

	status(agent = this.current) {
		if (agent && !agent.sessionFile) agent.sessionFile = findSessionFile(agent);
		return {
			supervisorPid: process.pid,
			agentPid: agent ? agent.child.pid : null,
			workspace: this.state.workspace,
			policyHash: agent ? agent.policyHash : null,
			sessionId: agent ? agent.sessionId : this.state.sessionId,
			sessionFile: agent ? agent.sessionFile : null,
			agentDir: agent ? agent.agentDir : null,
		};
	}

	clientResponse(id, command, success, data, error) {
		const response = { type: "response", command, success };
		if (id !== undefined) response.id = id;
		if (success) response.data = data;
		else response.error = error;
		process.stdout.write(`${JSON.stringify(response)}\n`);
	}

	prepareLaunch() {
		const workspace = this.state.workspace;
		const agentDir = this.state.agentDir || path.join(workspace, ".pi", "landlock-rpc");
		if (!inside(workspace, agentDir)) throw new Error("agent directory must be inside the workspace");
		const judge = readJudge(this.state.judgeRecordPath);
		const piExecutable = fs.realpathSync(this.options.pi);
		const accountHome = fs.realpathSync(os.homedir());
		if (inside(accountHome, piExecutable)) {
			throw new Error(`resolved pi executable is under the account home: ${piExecutable}`);
		}
		const replacements = {
			WORKSPACE: workspace,
			AGENT_DIR: agentDir,
			NODE_PREFIX: nodePrefix(),
			PI_EXECUTABLE: piExecutable,
			PI_PACKAGE_JSON: path.join(piPackageRoot(piExecutable), "package.json"),
			PI_CLI_RUNTIME: path.join(path.dirname(piExecutable), "cli-runtime.js"),
			JUDGE_LINK_NAME: judge.linkName,
		};
		const policy = render(readJson(this.state.policyPath), replacements);
		validatePolicy(policy, workspace);
		const permission = render(readJson(this.options.permissionConfig), replacements);
		validatePermission(permission, judge.linkName);
		const policyHash = crypto.createHash("sha256")
			.update(JSON.stringify({ policy, permission }))
			.update(judge.bytes)
			.digest("hex");
		return { workspace, agentDir, policy, policyHash, permission, judge };
	}

	async startCandidate() {
		const launch = this.prepareLaunch();
		if (this.current && this.current.policyHash === launch.policyHash &&
			this.current.workspace === launch.workspace && this.current.sessionId === this.state.sessionId) {
			return this.current;
		}
		const { agentDir, workspace } = launch;
		const resumeFile = this.current && this.current.workspace === workspace &&
			this.current.sessionId === this.state.sessionId
			? (this.current.sessionFile || findSessionFile(this.current)) : null;
		fs.mkdirSync(path.join(agentDir, "sessions"), { recursive: true, mode: 0o700 });
		if (!inside(workspace, fs.realpathSync(agentDir))) throw new Error("agent directory must resolve inside the workspace");
		writeAtomic(
			path.join(agentDir, "extensions", "pi-permission-system", "config.json"),
			`${JSON.stringify(launch.permission, null, 2)}\n`,
		);
		const extensionConfigRoot = path.join(agentDir, "extensions");
		const judgeConfig = path.resolve(extensionConfigRoot, launch.judge.linkName, "config.json");
		if (!inside(extensionConfigRoot, judgeConfig)) {
			throw new Error(`missing judge ${launch.judge.linkName}: linkName escapes the agent extension directory`);
		}
		writeAtomic(judgeConfig, launch.judge.configBytes);
		const candidateId = crypto.randomBytes(6).toString("hex");
		const packages = preparePackages(agentDir, this.options, candidateId, launch.judge);
		const args = ["--handled", launch.policy.handled.join(",")];
		for (const rule of launch.policy.rules) {
			args.push("--rule", rule.path, rule.access.join(","));
			this.log(`rule ${rule.path}`);
		}
		args.push(
			"--", this.options.pi, "--mode", "rpc", "--no-extensions", "--no-approve", "--no-context-files",
			"--session-dir", path.join(agentDir, "sessions"),
		);
		args.push(...(resumeFile ? ["--session", resumeFile] : ["--session-id", this.state.sessionId]));
		for (const packagePath of packages) args.push("--extension", packagePath);
		args.push(...this.options.passthrough);
		const env = {
			...process.env,
			PI_CODING_AGENT_DIR: agentDir,
			PI_CODING_AGENT_SESSION_DIR: path.join(agentDir, "sessions"),
		};
		const child = spawn(this.options.llPi, args, { cwd: workspace, env, stdio: ["pipe", "pipe", "pipe"] });
		const agent = {
			child, workspace, agentDir, policyHash: launch.policyHash, sessionId: this.state.sessionId,
			sessionFile: resumeFile, packagePaths: packages, pending: new Map(), registeredLinks: new Set(),
			judgeFailure: null, ready: false, expectedExit: false,
		};
		agent.exited = new Promise((resolve) => child.once("close", (code, signal) => resolve({ code, signal })));
		createLineReader(child.stdout, (line) => this.onAgentLine(agent, line));
		child.stderr.on("data", (chunk) => process.stderr.write(chunk));
		child.on("error", (error) => this.rejectPending(agent, error));
		child.on("exit", (code, signal) => {
			this.rejectPending(agent, new Error(`agent exited (${code === null ? signal : code})`));
			if (this.current === agent && !this.shuttingDown && !agent.expectedExit) {
				this.log(`agent ${child.pid} exited unexpectedly (${code === null ? signal : code})`);
				this.current = null;
				this.shutdown(1);
			}
		});
		try {
			const response = await this.request(agent, "get_state");
			if (!response.success) throw new Error(response.error || "get_state failed");
			if (!response.data || response.data.sessionId !== this.state.sessionId) {
				throw new Error("agent did not resume the required session id");
			}
			await this.waitForJudge(agent, launch.judge.linkName);
			const stateFile = sessionFileFromState(response.data);
			if (stateFile) {
				try {
					const canonical = fs.realpathSync(stateFile);
					if (!inside(fs.realpathSync(path.join(agentDir, "sessions")), canonical)) {
						throw new Error("agent session file is outside the workspace session directory");
					}
					agent.sessionFile = canonical;
				} catch (error) {
					if (error.code !== "ENOENT") throw error;
				}
			}
			if (!agent.sessionFile) agent.sessionFile = findSessionFile(agent);
			agent.ready = true;
			this.watchReviewLog(agent);
			return agent;
		} catch (error) {
			agent.expectedExit = true;
			child.kill("SIGKILL");
			await agent.exited;
			for (const packagePath of agent.packagePaths) fs.rmSync(packagePath, { recursive: true, force: true });
			if (error.message.includes("missing judge")) throw error;
			throw new Error(`missing judge ${launch.judge.linkName}: ${error.message}`);
		}
	}

	async waitForJudge(agent, linkName) {
		const deadline = Date.now() + 10000;
		while (!agent.registeredLinks.has(linkName)) {
			if (agent.judgeFailure) throw new Error(`missing judge ${linkName}: ${agent.judgeFailure}`);
			if (agent.child.exitCode !== null || agent.child.signalCode !== null) {
				throw new Error(`missing judge ${linkName}: agent exited before registration`);
			}
			if (Date.now() >= deadline) throw new Error(`missing judge ${linkName}: registration timed out`);
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}

	request(agent, type) {
		const id = `__supervisor_${this.nextId++}`;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				agent.pending.delete(id);
				reject(new Error(`${type} timed out`));
			}, 30000);
			agent.pending.set(id, { resolve, timer });
			agent.child.stdin.write(`${JSON.stringify({ id, type })}\n`, (error) => {
				if (error) {
					clearTimeout(timer);
					agent.pending.delete(id);
					reject(error);
				}
			});
		});
	}

	rejectPending(agent, error) {
		for (const { resolve, timer } of agent.pending.values()) {
			clearTimeout(timer);
			resolve({ success: false, error: error.message });
		}
		agent.pending.clear();
	}

	onAgentLine(agent, line) {
		if (!line) return;
		let record;
		try {
			record = JSON.parse(line);
		} catch {
			if (agent.ready && this.current === agent) process.stdout.write(`${line}\n`);
			return;
		}
		const registeredLink = registeredJudgeLink(record);
		if (registeredLink) agent.registeredLinks.add(registeredLink);
		const failure = judgeFailure(record);
		if (failure) agent.judgeFailure = failure;
		const pending = record.id && agent.pending.get(record.id);
		if (pending) {
			clearTimeout(pending.timer);
			agent.pending.delete(record.id);
			pending.resolve(record);
			return;
		}
		if (record.type === "extension_ui_request") {
			if (record.method === "setStatus") return;
			if (record.method === "notify") {
				this.log(`agent notification: ${String(record.message || record.title || "no message")}`);
				return;
			}
			this.log(`extension UI request method=${String(record.method || "unknown")} title=${String(record.title || "")}; refusing to forward it and stopping agent ${agent.child.pid}`);
			agent.expectedExit = true;
			agent.child.kill("SIGKILL");
			if (this.current === agent) {
				this.current = null;
				this.shutdown(1);
			}
			return;
		}
		if (agent.ready && this.current === agent) {
			if (!process.stdout.write(`${line}\n`)) {
				agent.child.stdout.pause();
				process.stdout.once("drain", () => agent.child.stdout.resume());
			}
		}
	}

	watchReviewLog(agent) {
		const file = path.join(agent.agentDir, "extensions", "pi-permission-system", "logs", "pi-permission-system-permission-review.jsonl");
		let offset = fs.existsSync(file) ? fs.statSync(file).size : 0;
		let buffer = "";
		agent.reviewLog = file;
		agent.reviewWatcher = () => {
			if (!fs.existsSync(file)) return;
			const size = fs.statSync(file).size;
			if (size < offset) { offset = 0; buffer = ""; }
			if (size === offset) return;
			const stream = fs.createReadStream(file, { start: offset, end: size - 1, encoding: "utf8" });
			stream.on("data", (chunk) => { buffer += chunk; });
			stream.on("end", () => {
				offset = size;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) this.logDenial(line);
			});
		};
		fs.watchFile(file, { interval: 250 }, agent.reviewWatcher);
	}

	logDenial(line) {
		let record;
		try { record = JSON.parse(line); } catch { return; }
		const text = JSON.stringify(record);
		if (!/"(?:decision|action|result)"\s*:\s*"den(?:y|ied)"/i.test(text)) return;
		const requestId = record.requestId || (record.ask && record.ask.requestId) || "unknown";
		const tool = record.tool || (record.ask && record.ask.tool) || "unknown";
		this.log(`permission denial requestId=${requestId} tool=${tool}`);
	}

	async rotate() {
		const candidate = await this.startCandidate();
		if (candidate === this.current) return this.status(candidate);
		const previous = this.current;
		this.current = candidate;
		this.log(`agent ready pid=${candidate.child.pid} policy=${candidate.policyHash.slice(0, 12)} workspace=${candidate.workspace}`);
		if (previous) await this.stopAgent(previous);
		return this.status(candidate);
	}

	async stopAgent(agent) {
		agent.expectedExit = true;
		if (agent.reviewLog) fs.unwatchFile(agent.reviewLog, agent.reviewWatcher);
		agent.child.stdin.end();
		const terminateTimer = setTimeout(() => agent.child.kill("SIGTERM"), 5000);
		const killTimer = setTimeout(() => agent.child.kill("SIGKILL"), 6000);
		try {
			await agent.exited;
		} finally {
			clearTimeout(terminateTimer);
			clearTimeout(killTimer);
		}
		for (const packagePath of agent.packagePaths || []) fs.rmSync(packagePath, { recursive: true, force: true });
		this.log(`agent exited pid=${agent.child.pid}`);
	}

	scheduleRotation() {
		const rotation = this.rotationChain.then(() => this.rotate());
		this.rotationChain = rotation.catch(() => {});
		return rotation;
	}

	watchedPaths() {
		return [this.state.policyPath, this.options.permissionConfig, this.state.judgeRecordPath];
	}

	watchPolicy() {
		for (const file of this.watchedPaths()) {
			fs.unwatchFile(file);
			fs.watchFile(file, { interval: 250 }, (current, previous) => {
				if (current.mtimeMs === previous.mtimeMs && current.size === previous.size) return;
				this.inputChain = this.inputChain.then(() => this.scheduleRotation()).catch((error) => {
					this.log(`policy reload failed: ${error.message}`);
					this.shutdown(1);
				});
			});
		}
	}

	async configure(record) {
		const saved = { ...this.state };
		try {
			if (record.workspace !== undefined) {
				this.state.workspace = realDirectory(record.workspace, "workspace");
				if (!saved.agentDir) this.state.agentDir = null;
			}
			if (record.policy !== undefined) this.state.policyPath = path.resolve(record.policy);
			if (record.sessionId !== undefined) {
				const sessionId = String(record.sessionId);
				if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sessionId)) throw new Error("invalid session id");
				this.state.sessionId = sessionId;
			}
			const status = await this.scheduleRotation();
			this.watchPolicy();
			this.clientResponse(record.id, "supervisor_configure", true, status);
		} catch (error) {
			this.state = saved;
			this.watchPolicy();
			this.clientResponse(record.id, "supervisor_configure", false, null, error.message);
		}
	}

	async onClientLine(line) {
		if (!line) return;
		let record;
		try { record = JSON.parse(line); } catch { record = null; }
		if (record && record.type === "supervisor_status") {
			this.clientResponse(record.id, "supervisor_status", true, this.status());
			return;
		}
		if (record && record.type === "supervisor_configure") {
			await this.configure(record);
			return;
		}
		if (!this.current || !this.current.ready) throw new Error("agent is not ready");
		if (!this.current.child.stdin.write(`${line}\n`)) {
			await new Promise((resolve) => this.current.child.stdin.once("drain", resolve));
		}
	}

	async start() {
		await this.rotate();
		this.watchPolicy();
		createLineReader(process.stdin, (line) => {
			this.inputChain = this.inputChain.then(() => this.onClientLine(line)).catch((error) => {
				this.log(error.message);
			});
		});
		process.stdin.on("end", () => this.shutdown(0));
		process.on("SIGINT", () => this.shutdown(0));
		process.on("SIGTERM", () => this.shutdown(0));
	}

	async shutdown(code) {
		if (this.shuttingDown) return;
		this.shuttingDown = true;
		for (const file of this.watchedPaths()) fs.unwatchFile(file);
		const agent = this.current;
		this.current = null;
		if (agent) await this.stopAgent(agent);
		process.exit(code);
	}
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		process.stdout.write(`${usage()}\n`);
		return;
	}
	validatePassthrough(options.passthrough);
	if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.sessionId)) throw new Error("invalid session id");
	options.judgeRecord = path.resolve(options.judgeRecord);
	readJudge(options.judgeRecord);
	options.pi = resolveExecutable(options.pi);
	options.llPi = resolveExecutable(options.llPi);
	options.permissionConfig = path.resolve(options.permissionConfig);
	const supervisor = new Supervisor(options);
	await supervisor.start();
}

main().catch((error) => {
	process.stderr.write(`pi-supervise: ${error.message}\n`);
	process.exit(1);
});
