/**
 * 远端工作区标记识别的单元测试（lib/remote-workspace.js）。
 *
 * 覆盖：~/.ssh/config 解析、remote-suite state.json 兜底、`.dsh-remote.json`
 * 镜像标记的向上查找、远端落点换算，以及拼出来的 ssh 启动参数。
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  REMOTE_SSH_MARKER,
  REMOTE_SUITE_MARKER,
  defaultRemoteSuiteStatePath,
  defaultSshConfigPath,
  expandHomePath,
  findRemoteSshWorkspace,
  findRemoteSuiteWorkspace,
  loadSshProfile,
  parseSshConfigBlocks,
  profileFromBlocks,
  remotePathOf,
  remoteSuiteShellSpec,
  windowsPathToWsl,
  workspaceSshSpec,
  wslUncShellSpec,
} from "../lib/remote-workspace.js";

let passed = 0;
let failed = 0;

/**
 * 执行一条断言，只统计结果，不中断后续用例。
 * @param name - 用例名。
 * @param fn - 断言函数，抛错即失败。
 * @returns 无返回值。
 */
function check(name, fn) {
	try {
		fn();
		passed += 1;
		console.log(`  ok   ${name}`);
	} catch (error) {
		failed += 1;
		console.log(`  FAIL ${name}\n       ${error instanceof Error ? error.message : String(error)}`);
	}
}

const SSHDIR = mkdtempSync(join(tmpdir(), "dsh-term-ssh-"));
const CONFIG_TEXT = `# 本机测试配置
Host 192.168.81.77
  HostName 192.168.81.77
  User liguojin
  IdentityFile ~/.ssh/dsh_remote_ed25519

Host prod
  HostName 10.0.0.9
  User deploy
  Port 2222
  ProxyJump bastion
  IdentityFile "/c/keys/prod.pem"

Host *
  User nobody

Match host 10.0.0.9
  User ignored
`;
const CONFIG_PATH = join(SSHDIR, "config");
writeFileSync(CONFIG_PATH, CONFIG_TEXT, "utf8");

const STATE_DIR = join(SSHDIR, "remote-suite");
mkdirSync(STATE_DIR, { recursive: true });
const STATE_PATH = join(STATE_DIR, "state.json");
writeFileSync(
	STATE_PATH,
	JSON.stringify({
		version: 1,
		workspaces: [],
		mirrors: [],
		profiles: [{ alias: "panel-only", hostname: "10.1.1.1", user: "ubuntu", port: 2200, identityFiles: ["/home/u/.ssh/id_ed25519"] }],
	}),
	"utf8",
);

const blocks = parseSshConfigBlocks(CONFIG_TEXT);

check("parseSshConfigBlocks 认 Host 行并跳过通配符", () => {
	assert.equal(blocks.length, 3);
	assert.deepEqual(blocks[0].aliases, ["192.168.81.77"]);
	assert.deepEqual(blocks[2].aliases, []);
});

check("profileFromBlocks 展开 ~ 与引号", () => {
	const profile = profileFromBlocks(blocks, "prod", SSHDIR);
	assert.equal(profile.host, "10.0.0.9");
	assert.equal(profile.user, "deploy");
	assert.equal(profile.port, 2222);
	assert.equal(profile.proxyJump, "bastion");
	assert.equal(profile.keyPath, "/c/keys/prod.pem");
});

check("expandHomePath 处理 ~ 前缀", () => {
	assert.equal(expandHomePath("~/.ssh/x", SSHDIR), join(SSHDIR, ".ssh", "x"));
	assert.equal(expandHomePath("/abs/x", SSHDIR), "/abs/x");
});

check("loadSshProfile 先查 ssh config", () => {
	const profile = loadSshProfile("192.168.81.77", { configPath: CONFIG_PATH, statePath: STATE_PATH, home: SSHDIR });
	assert.equal(profile.user, "liguojin");
	assert.equal(profile.keyPath, join(SSHDIR, ".ssh", "dsh_remote_ed25519"));
});

check("loadSshProfile 读不到 config 时回落到 state.json", () => {
	const profile = loadSshProfile("panel-only", { configPath: join(SSHDIR, "nope"), statePath: STATE_PATH, home: SSHDIR });
	assert.equal(profile.host, "10.1.1.1");
	assert.equal(profile.port, 2200);
	assert.equal(profile.keyPath, "/home/u/.ssh/id_ed25519");
});

check("loadSshProfile 查不到时返回 null", () => {
	assert.equal(loadSshProfile("ghost", { configPath: CONFIG_PATH, statePath: STATE_PATH, home: SSHDIR }), null);
});

const MIRROR = join(SSHDIR, "mirrors", "ssh-192-168-81-77-057ec71c", "ws-td380");
mkdirSync(join(MIRROR, "src"), { recursive: true });
writeFileSync(join(MIRROR, REMOTE_SUITE_MARKER), JSON.stringify({ targetId: "ssh:192.168.81.77", path: "~/lgj/td/td380" }), "utf8");

check("findRemoteSuiteWorkspace 从子目录向上找到标记", () => {
	const remote = findRemoteSuiteWorkspace(join(MIRROR, "src"));
	assert.ok(remote !== null);
	assert.equal(remote.root, MIRROR);
	assert.equal(remote.info.targetId, "ssh:192.168.81.77");
});

check("findRemoteSuiteWorkspace 忽略非 ssh 目标", () => {
	const dir = join(SSHDIR, "docker-mirror");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, REMOTE_SUITE_MARKER), JSON.stringify({ targetId: "docker:web", path: "/srv" }), "utf8");
	assert.equal(findRemoteSuiteWorkspace(dir), null);
});

check("remotePathOf 把子目录拼到远端路径后面", () => {
	const remote = findRemoteSuiteWorkspace(MIRROR);
	assert.equal(remotePathOf(remote.info, remote.root, MIRROR), "~/lgj/td/td380");
	assert.equal(remotePathOf(remote.info, remote.root, join(MIRROR, "src")), "~/lgj/td/td380/src");
});

check("remoteSuiteShellSpec 拼出完整 ssh 参数", () => {
	const remote = findRemoteSuiteWorkspace(MIRROR);
	const spec = remoteSuiteShellSpec(remote, MIRROR, {
		ssh: "ssh.exe",
		profile: { host: "192.168.81.77", user: "liguojin", port: 0, keyPath: "C:/keys/id", proxyJump: "" },
	});
	assert.equal(spec.kind, "ssh");
	assert.equal(spec.command, "ssh.exe");
	assert.deepEqual(spec.args.slice(0, 5), ["-tt", "-o", "StrictHostKeyChecking=no", "-o", "ExitOnForwardFailure=no"]);
	assert.deepEqual(spec.args.slice(5, 7), ["-i", "C:/keys/id"]);
	assert.equal(spec.args[7], "liguojin@192.168.81.77");
	assert.ok(spec.args[8].includes('cd "$HOME/lgj/td/td380"'));
	assert.ok(spec.args[8].includes("exec"));
});

check("remoteSuiteShellSpec 带上端口与跳板", () => {
	const remote = findRemoteSuiteWorkspace(MIRROR);
	const spec = remoteSuiteShellSpec(remote, MIRROR, {
		ssh: "ssh",
		profile: { host: "10.0.0.9", user: "deploy", port: 2222, keyPath: "", proxyJump: "bastion" },
	});
	assert.deepEqual(spec.args.slice(5, 9), ["-J", "bastion", "-p", "2222"]);
	assert.equal(spec.args[9], "deploy@10.0.0.9");
});

check("remoteSuiteShellSpec 查不到主机时返回 null", () => {
	const remote = findRemoteSuiteWorkspace(MIRROR);
	assert.equal(remoteSuiteShellSpec(remote, MIRROR, { ssh: "ssh", profile: null }), null);
});

const DIRECT = join(SSHDIR, "remote-workspaces", "wmvt-test");
mkdirSync(DIRECT, { recursive: true });
writeFileSync(
	join(DIRECT, REMOTE_SSH_MARKER),
	JSON.stringify({
		host: "192.168.81.77",
		port: 22,
		user: "liguojin",
		keyPath: "C:/Users/u/.ssh/id_ed25519",
		proxyJump: "",
		remotePath: "~",
	}),
	"utf8",
);

check("findRemoteSshWorkspace 找到 dsh-remote-ssh 标记", () => {
	const remote = findRemoteSshWorkspace(DIRECT);
	assert.ok(remote !== null);
	assert.equal(remote.root, DIRECT);
	assert.equal(remote.info.user, "liguojin");
});

check("workspaceSshSpec 按 dsh-remote-ssh 标记起 ssh 会话", () => {
	const spec = workspaceSshSpec(DIRECT, { ssh: "ssh.exe" });
	assert.equal(spec.kind, "ssh");
	assert.equal(spec.command, "ssh.exe");
	const target = spec.args.indexOf("liguojin@192.168.81.77");
	assert.ok(target > 0);
	assert.ok(spec.args.includes("-i"));
	assert.ok(spec.args[target + 1].includes('cd "$HOME"'));
});

check("workspaceSshSpec 认 remote-suite 镜像标记", () => {
	const spec = workspaceSshSpec(MIRROR, { ssh: "ssh.exe" });
	assert.equal(spec.kind, "ssh");
	assert.equal(spec.args[7], "liguojin@192.168.81.77");
});

check("workspaceSshSpec 普通目录返回 null", () => {
	const plain = join(SSHDIR, "plain");
	mkdirSync(plain, { recursive: true });
	assert.equal(workspaceSshSpec(plain), null);
});

check("windowsPathToWsl 换盘符路径", () => {
	assert.equal(windowsPathToWsl("D:\\work\\demo"), "/mnt/d/work/demo");
	assert.equal(windowsPathToWsl("\\\\wsl.localhost\\Ubuntu\\home"), "");
});

check("wslUncShellSpec 只认 WSL UNC 路径", () => {
	assert.equal(wslUncShellSpec("D:\\work"), null);
	if (process.platform === "win32") {
		const spec = wslUncShellSpec("\\\\wsl.localhost\\Ubuntu\\home\\u");
		assert.equal(spec.command, "wsl.exe");
		assert.deepEqual(spec.args, ["-d", "Ubuntu", "--cd", "/home/u", "-e", "bash", "-l"]);
	}
});

check("默认路径按 DSH_HOME / 用户目录推导", () => {	const previous = process.env.DSH_HOME;
	process.env.DSH_HOME = join(SSHDIR, "dshhome");
	try {
		assert.equal(defaultRemoteSuiteStatePath(SSHDIR), join(SSHDIR, "dshhome", "remote-suite", "state.json"));
	} finally {
		if (previous === undefined) delete process.env.DSH_HOME;
		else process.env.DSH_HOME = previous;
	}
	assert.equal(defaultSshConfigPath(SSHDIR), join(SSHDIR, ".ssh", "config"));
});

rmSync(SSHDIR, { recursive: true, force: true });

console.log(`\n结果：通过 ${passed}，失败 ${failed}`);
process.exitCode = failed === 0 ? 0 : 1;
