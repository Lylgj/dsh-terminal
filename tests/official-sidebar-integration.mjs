/**
 * 验证「DSH 官方右侧栏（sidebar-right）接入」：
 * 1) 有 sidebarRightTabs 服务时，以 extension 档注册 kind = "terminal"，接管内置终端，
 *    不挂浮层面板；
 * 2) 类型描述符与 guide（开始页「新建终端」卡片）字段与内置终端一致；
 * 3) 正文槽位注册到正确的服务与 key，且不重复注册 kind 的关闭钩子（内置终端已占用）；
 * 4) 正文组件本体可以渲染，且 cwd 来自会话摘要。
 *
 * 不做真实 DOM 渲染：用最小桩。
 */
import { readFileSync } from "node:fs";

const code = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");

//#region 最小浏览器环境
/** 记录所有被创建的元素（只为让 ensureStyle 的 DOM 操作不崩）。 */
class El {
	constructor(tag) {
		this.tagName = String(tag).toUpperCase();
		this.children = [];
		this.style = {};
		this.className = "";
		this.textContent = "";
		this.id = "";
	}
	appendChild(child) {
		this.children.push(child);
		return child;
	}
	remove() {}
}
const head = new El("head");
const body = new El("body");
globalThis.document = {
	head,
	body,
	createElement: (tag) => new El(tag),
	getElementById: () => null,
	querySelector: () => null
};
globalThis.location = { protocol: "http:", host: "127.0.0.1:3080", hostname: "127.0.0.1" };
globalThis.localStorage = {
	store: new Map(),
	getItem(key) {
		return this.store.has(key) ? this.store.get(key) : null;
	},
	setItem(key, value) {
		this.store.set(key, String(value));
	}
};
//#endregion

//#region 加载插件
const react = {
	Fragment: Symbol("Fragment"),
	createElement: (type, props, ...kids) => ({ type, props: props ?? {}, kids }),
	useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
	useRef: (initial) => ({ current: initial }),
	useCallback: (fn) => fn,
	useEffect: () => {}
};
const reactDomStub = { createPortal: (children) => children };
let loaded = null;
globalThis.window = globalThis;
globalThis.__ModuleLoader__ = {
	load: (m) => {
		loaded = m;
	}
};
const requireStub = (name) => {
	if (name === "react") return react;
	if (name === "react-dom") return reactDomStub;
	throw new Error(`unexpected require(${name})`);
};
new Function("window", "require", code)(globalThis, requireStub);
const mod = loaded.factory(requireStub);
//#endregion

let pass = 0;
let fail = 0;
/**
 * 断言。
 * @param name - 用例名。
 * @param cond - 条件。
 * @param extra - 失败时的附加信息。
 * @returns 无返回值。
 */
function check(name, cond, extra = "") {
	if (cond) {
		pass++;
		console.log(`  ✅ ${name}`);
	} else {
		fail++;
		console.log(`  ❌ ${name}  ${extra}`);
	}
}

//#region 场景 1：有官方侧栏服务 → 接管内置 terminal 类型
console.log("场景 1：官方右侧栏可用 → 以 extension 档接管 kind=terminal");
/** 注册过的 tab 类型。 */
const typeRegistrations = [];
/** 注册过的槽位。 */
const slotRegistrations = [];
/** kind → 关闭钩子。 */
const closeHandlers = new Map();
/** 浮层槽位注册计数（应为 0）。 */
let overlayRegistrations = 0;

/** 内置终端（被接管）的图标组件：带一个可识别的标记，便于断言「原样复用」。 */
const builtinIcon = (props) => ({ type: "svg", props: { width: props?.size ?? 24, "data-builtin-icon": true } });
/** 内置终端的 locale（模拟官方 locale.bind("sidebarTerminal")）。 */
const builtinT = (key) => ({ title: "终端", new: "新建终端", description: "在会话工作区运行命令" })[key] ?? key;
/** 接管前注册表里已有的内置终端定义（官方 ui-sidebar-terminal 注册的那份）。 */
const builtinDefinition = {
	id: "@deepseek-ai/dsh-client-ui-sidebar-terminal",
	kind: "terminal",
	multiple: true,
	priority: "builtin",
	title: () => builtinT("title"),
	guide: [
		{
			id: "new",
			order: 20,
			title: () => builtinT("new"),
			description: () => builtinT("description"),
			icon: builtinIcon
		}
	]
};
const fakeTabs = {
	/**
	 * 内置定义读取（注册表 get）：返回接管前生效的内置终端。
	 * @param kind - tab kind。
	 * @returns 内置定义或 undefined。
	 */
	get: (kind) => (kind === "terminal" ? builtinDefinition : undefined),
	/**
	 * 记录 tab 类型。
	 * @param definition - 类型描述符。
	 * @returns 注销函数。
	 */
	register: (definition) => {
		typeRegistrations.push(definition);
		return () => {};
	}
};
const fakeRight = {
	/**
	 * 记录关闭钩子。
	 * @param kind - tab kind。
	 * @param handler - 关闭处理函数。
	 * @returns 注销函数。
	 */
	registerCloseHandler: (kind, handler) => {
		closeHandlers.set(kind, handler);
		return () => {};
	}
};
const sessionsStub = {
	list: {
		getSnapshot: () => ({ byId: { "session-a": { cwd: "C:\\work\\demo" } } }),
		subscribe: () => () => {}
	}
};
const ctx1 = {
	slots: {
		inject: (name, gen) => {
			if (name === "shell.overlay") overlayRegistrations++;
			gen()?.next?.();
			return () => {};
		},
		register: (descriptor, component) => {
			slotRegistrations.push({ descriptor, component });
			return () => {};
		}
	},
	/**
	 * 模拟 Cordis 的 ctx.effect：立即执行并返回清理函数。
	 * @param fn - 副作用函数。
	 * @returns 清理函数。
	 */
	effect: (fn) => {
		const dispose = fn();
		return typeof dispose === "function" ? dispose : () => {};
	},
	/**
	 * 取侧栏服务。
	 * @param name - 服务名。
	 * @returns 服务对象。
	 */
	get: (name) => {
		if (name === "sessions") return sessionsStub;
		if (name === "sidebarRightTabs") return fakeTabs;
		if (name === "sidebarRight") return fakeRight;
		return undefined;
	},
	inject: () => {},
	get sessions() {
		throw new Error("sessions 未声明为硬依赖，必须通过 ctx.get 获取");
	}
};
mod.apply(ctx1);
check("注册了 1 个官方 tab 类型", typeRegistrations.length === 1, `实际 ${typeRegistrations.length}`);
check("没有注册浮层面板", overlayRegistrations === 0, `实际 ${overlayRegistrations}`);
check("没有注册 shell.overlay 槽位", slotRegistrations.every((item) => item.descriptor.name !== "shell.overlay"));
//#endregion

//#region 场景 2：tab 类型描述符与 guide 卡片
console.log("\n场景 2：官方 tab 类型描述符");
const definition = typeRegistrations[0];
check("id = 包名（槽位 key 一致）", definition?.id === "dsh-terminal", definition?.id);
check("kind = terminal（接管内置终端）", definition?.kind === "terminal", definition?.kind);
check("multiple = false（同会话只开一个页签）", definition?.multiple === false);
check("keepMounted = true（切页签保留正文）", definition?.keepMounted === true);
check("priority = extension（扩展档接管 builtin）", definition?.priority === "extension");
check("title 是函数且返回「终端」", typeof definition?.title === "function" && definition.title() === "终端");
const guide = Array.isArray(definition?.guide) ? definition.guide : [];
check("guide 有 1 张卡片", guide.length === 1, `实际 ${guide.length}`);
check("guide id = new", guide[0]?.id === "new");
check("guide 排在内置终端之后（order 20）", guide[0]?.order === 20);
check("guide 绑定快捷键命令 terminal.new", guide[0]?.commandId === "terminal.new", guide[0]?.commandId);
check("guide 标题 = 新建终端", typeof guide[0]?.title === "function" && guide[0].title() === "新建终端");
check("guide 描述 = 在会话工作区运行命令", typeof guide[0]?.description === "function" && guide[0].description() === "在会话工作区运行命令");
check("guide icon 是组件", typeof guide[0]?.icon === "function");
const glyph = guide[0]?.icon?.({ size: 22 });
check("guide icon 渲染 svg", glyph?.type === "svg" && glyph?.props?.width === 22, JSON.stringify(glyph?.props?.width));
check("标题原样复用内置定义的 thunk（与原生同一份文案）", definition?.title === builtinDefinition.title);
check("guide 图标原样复用内置组件（与原生同一个图标）", guide[0]?.icon === builtinIcon);
check("guide 标题原样复用内置 thunk（跟随官方 locale）", guide[0]?.title === builtinDefinition.guide[0].title);
check("guide 描述原样复用内置 thunk", guide[0]?.description === builtinDefinition.guide[0].description);
//#endregion

//#region 场景 3：正文槽位与关闭钩子
console.log("\n场景 3：正文槽位与关闭钩子");
const bodySlot = slotRegistrations.find((item) => item.descriptor.name === "sidebar.right.pane.tab");
check("注册了 sidebar.right.pane.tab 正文槽", bodySlot !== undefined);
check("槽位 key = 类型 id", bodySlot?.descriptor?.key === "dsh-terminal", bodySlot?.descriptor?.key);
check("正文组件是函数", typeof bodySlot?.component === "function");
const injected = bodySlot?.descriptor?.inject?.("session-a");
check("inject 工厂返回 sessionId", injected?.sessionId === "session-a");
check("inject 工厂可解析 cwd", injected?.cwdOf?.() === "C:\\work\\demo", injected?.cwdOf?.());
check("inject 工厂提供 subscribeSessions", typeof injected?.subscribeSessions === "function");
check("不重复注册关闭钩子（内置终端已占用 kind terminal）", closeHandlers.size === 0, `实际 ${[...closeHandlers.keys()].join(",")}`);
//#endregion

//#region 场景 4：正文组件实际渲染
console.log("\n场景 4：正文组件渲染");
let rendered = null;
let renderError = null;
try {
	// 正文槽注册的组件本体就是 OfficialTerminalTab，直接调用即可拿到根 vnode。
	rendered = bodySlot.component(injected);
} catch (error) {
	renderError = error;
}
check("正文组件渲染不抛错", renderError === null, String(renderError));
check("渲染结果带官方页签标记", rendered?.props?.["data-dsh-terminal-embed"] === "official", rendered?.props?.["data-dsh-terminal-embed"]);
check("渲染出紧凑工具条", Array.isArray(rendered?.kids) && rendered.kids.length > 0);
//#endregion

//#region 场景 5：读不到内置定义时的回退（注册顺序更早 / 服务不支持 get）
console.log("\n场景 5：读不到内置定义 → 退回本插件文案与图标");
// 重新加载一遍模块，拿到干净的注册状态。
new Function("window", "require", code)(globalThis, requireStub);
const mod2 = loaded.factory(requireStub);
const fallbackTypes = [];
const fakeTabs2 = {
	/**
	 * 不带 get：模拟读不到内置定义。
	 * @returns undefined。
	 */
	get: () => undefined,
	/**
	 * 记录 tab 类型。
	 * @param definition - 类型描述符。
	 * @returns 注销函数。
	 */
	register: (definition) => {
		fallbackTypes.push(definition);
		return () => {};
	}
};
/**
 * 场景 5 的客户端上下文。
 * @returns 服务集合。
 */
const ctx2 = {
	slots: {
		inject: () => () => {},
		register: () => () => {}
	},
	effect: (fn) => {
		const dispose = fn();
		return typeof dispose === "function" ? dispose : () => {};
	},
	get: (name) => {
		if (name === "sidebarTabs") return undefined;
		if (name === "sessions") return sessionsStub;
		if (name === "sidebarRightTabs") return fakeTabs2;
		return undefined;
	},
	inject: () => {}
};
mod2.apply(ctx2);
const fallback = fallbackTypes[0];
check("回退：仍以 extension 档接管 kind=terminal", fallback?.kind === "terminal" && fallback?.priority === "extension");
check("回退：标题 = 终端", fallback?.title?.() === "终端", fallback?.title?.());
check("回退：guide 标题 = 新建终端", fallback?.guide?.[0]?.title?.() === "新建终端");
check("回退：guide icon 渲染自带 svg", fallback?.guide?.[0]?.icon?.({ size: 22 })?.props?.width === 22);
check("回退：primitives 种子不可用时用自带图形", fallback?.guide?.[0]?.icon({ size: 22 })?.props?.["stroke-width"] !== undefined);
//#endregion

//#region 场景 6：读不到内置定义、但官方 primitives 种子模块可用 → 用官方图形
console.log("\n场景 6：读不到内置定义 → 仍用官方 PluginArtworkTerminal 图形");
/** 官方 primitives 里的终端图形组件（测试桩）。 */
const seedIcon = (props) => ({ type: "svg", props: { width: props?.size ?? 24, "data-seed-artwork": true } });
const requireWithSeed = (name) => {
	if (name === "react") return react;
	if (name === "react-dom") return reactDomStub;
	if (name === "@deepseek-ai/dsh-client-ui-primitives") return { PluginArtworkTerminal: seedIcon };
	throw new Error(`unexpected require(${name})`);
};
new Function("window", "require", code)(globalThis, requireWithSeed);
const mod3 = loaded.factory(requireWithSeed);
const seedTypes = [];
const ctx3 = {
	slots: {
		inject: () => () => {},
		register: () => () => {}
	},
	effect: (fn) => {
		const dispose = fn();
		return typeof dispose === "function" ? dispose : () => {};
	},
	get: (name) => {
		if (name === "sessions") return sessionsStub;
		if (name === "sidebarRightTabs") {
			return {
				get: () => undefined,
				register: (definition) => {
					seedTypes.push(definition);
					return () => {};
				}
			};
		}
		return undefined;
	},
	inject: () => {}
};
mod3.apply(ctx3);
check("种子可用：guide 图标就是官方 PluginArtworkTerminal", seedTypes[0]?.guide?.[0]?.icon === seedIcon);
//#endregion

console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
// 显式退出：client.js 里的消息合批通道（MessageChannel）在 Node 下会保持事件循环。
process.exit(fail === 0 ? 0 : 1);
