<div align="center">

<img src="docs/assets/banner.png" alt="dsh-terminal：右侧栏里的终端面板" width="100%">

# 🖥️ dsh-terminal

**终端就在对话旁边：本机、WSL、容器、远端，按工作区自动就位。**

dsh-terminal 把终端放进 DSH 右侧栏。开始页点一下「新建终端」，就在当前工作区拉起一个真实
PTY —— 不另开窗口，也不用离开会话去找命令行。收起侧栏、切换会话不会打断正在跑的命令。

[![npm version](https://img.shields.io/npm/v/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![npm downloads](https://img.shields.io/npm/dm/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f?style=flat-square)](https://github.com/topics/dsh-plugin)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](#版本与兼容性)

简体中文 · [English](./README.en.md)

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

</div>

> 主仓库：[github.com/Lylgj/dsh-terminal](https://github.com/Lylgj/dsh-terminal) · npm：[@lylgj/dsh-terminal](https://www.npmjs.com/package/@lylgj/dsh-terminal) · 许可证：[MIT](./LICENSE)

## 界面

<img src="docs/assets/screenshots/terminal.png" alt="右侧栏终端：状态点、工作目录、shell 下拉、后台终端计数与复制、清屏、重连按钮" width="632">

工具条第一行是状态点、连接状态、工作目录和「后台终端：N」，第二行是 shell 下拉与操作按钮；
下面是终端画面。切到「浮层」后也能拖左缘调整宽度。

## 安装

要求：DSH **0.2.2-rc.1 或更新版本**、Node.js **20 或更新版本**；WSL、容器、SSH 还需要本机具备对应运行时或客户端。

### ① 桌面版

打开 **插件 → 添加插件**，输入下面这行：

```text
@lylgj/dsh-terminal
```

若询问是否允许 `node-pty` 的构建脚本，确认包来源后允许。它用于准备终端所需的原生组件；主流平台通常直接使用预编译文件。

### ② 命令行

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

使用自定义 profile 时把 `web` 换成实际名称。若 pnpm 提示 `Ignored build scripts: node-pty`，在该 profile 的 `pnpm-workspace.yaml` 里合并下面这几行（保留已有条目），然后重跑一次安装命令：

```yaml
allowBuilds:
  node-pty: true
```

### ③ 从源码或本地目录

```sh
git clone https://github.com/Lylgj/dsh-terminal.git
cd dsh-terminal
pnpm install
dsh plugin --profile web add /绝对路径/dsh-terminal
```

最后一行用本地目录的绝对路径，Windows 下形如 `D:\path\to\dsh-terminal`。

### ④ 升级与卸载

升级到最新版用 `dsh plugin --profile web add @lylgj/dsh-terminal@latest`；桌面版在 **插件** 页面移除后重新添加即可。卸载用同一个 profile：

```sh
dsh plugin --profile web remove @lylgj/dsh-terminal
```

### ⑤ 装完必须重启

安装、升级或卸载之后，**完全退出 DSH 再启动**（包括托盘与后台进程）。只刷新页面不会加载新的插件代码；`dsh web` 请重启对应的实例。

## 第一次运行

- **入口**：右侧栏开始页的「新建终端」卡片，卡片角落标着快捷键 Ctrl+`。点开后成为「终端」页签，同一个会话只保留一个终端页。
- **首次打开**：状态点先显示「连接中…」，握手成功后变成「已连接」。正文顶部有一行灰色提示「已为工作区 … 启动常驻终端；切走后它继续运行」，下面是 shell 提示符。
- **默认 shell 怎么选**：按工作区目录自动判断 —— Docker 工作区进容器、WSL 路径进对应发行版、带远程标记的工作区走 SSH；Windows 本机用 cmd，macOS / Linux 用登录 shell（`-l`）。
- **最近使用**：手动选过的 shell 按工作区记在浏览器本地（`dsh.terminal.shells`），下次打开沿用；同一工作区在不同会话里共享同一个终端。

## 功能

### 环境识别

工作区目录决定默认环境（`local` / `wsl:<发行版>` / `docker:<容器>` / `ssh:<主机>`），「后台终端」只统计同一环境，本机与远端不会混在一起。shell 下拉实时探测：Windows 上是 cmd、PowerShell、pwsh 和已安装的 WSL 发行版，再加运行中的容器与 `~/.ssh/config` 主机别名（含通配符的条目跳过）；macOS / Linux 上是登录 shell、bash、zsh、fish。

识别依据是 Docker 工作区标记、`\\wsl$\...` / `\\wsl.localhost\...` 形式的路径、远程工作区标记。工作区在容器或远端时，选本地 shell 会自动交回工作区默认，因为本地 shell 进不去那个目录。

### 并排与浮层

工具条上的「并排 / 浮层」决定终端怎么占位：并排让 DSH 正文让出右侧宽度，浮层盖在界面上，默认并排。两种形态下都可以拖左缘调宽度，范围 280–1100 px，默认 460 px；宽度、布局与开合状态都记在浏览器本地。宿主没有右侧栏页签服务时，插件回退成浮层面板：右下角一个「终端」浮动按钮，Ctrl+` 开合，功能与页签形态一致。

### 常驻会话与后台终端

每个工作区一个常驻 PTY，连接与终端实例放在模块级，切换工作区只是隐藏再显示。收起侧栏或切换会话不会结束终端；关闭页签、或在「后台终端：N」里点「关闭」才会回收 shell，列表里还有「关闭其他终端」一次清掉同环境的后台会话。每个环境最多 10 个终端；终端服务进程所有环境合计最多 12 个 PTY，超了会返回明确错误。

### 后端选择与回退

浏览器先连终端服务进程（默认 `ws://127.0.0.1:3110/ws`），握手失败就立刻换同源路由 `/dsh-terminal/ws`；两个都连不上才进入 3 秒重试。终端服务进程的事件循环只服务 PTY，所以主进程在流式输出、压缩落盘时，按键回显不受影响。Windows 桌面版默认走同源回退（再拉起一个宿主实例代价更大）；需要终端服务进程时设 `DSH_TERMINAL_HELPER=1`。

### 复制粘贴与提示气泡

默认：Ctrl+C 在有选中内容时复制、没有选中时照常发 ^C；右键粘贴开；选中即复制关。「复制」按钮打开设置弹窗，三项可以任意组合；提示位置可选底部居中（默认）、底部靠左、顶部居中、跟随鼠标或关闭，1.2 秒后自动消失。

「选中即复制」在松手后等 150 ms 再写剪贴板，拖动过程中不会反复复制。浏览器只在 localhost 或 HTTPS 下提供剪贴板 API；用远端明文 HTTP 打开时复制可能失败。

### 主题清屏重连

浅色与暗色两套终端配色**跟随 DSH 界面主题**：宿主切到深色就自动用深底浅字，切回浅色就自动用白底深字，没有手动开关，也不写浏览器本地存储。判断依据是终端所在容器的实际背景色，所以面板嵌在哪里都能对上。「清屏」清掉更早的历史、保留当前提示符那一行，只作用于当前工作区的终端画面，不影响其他后台终端。「重连」会重建到后端的连接，后端因此新建一个 shell：当前画面里的输出还在，但原来的运行任务不会恢复；掉线后的自动重连同理。

## 配置

| 配置项 | 默认值 | 说明 |
|---|---|---|
| 面板宽度 | `460` | 拖左缘调整，范围 280–1100 px，存 `dsh.terminal.width` |
| 布局模式 | 并排 | `dock` / `overlay`，存 `dsh.terminal.mode` |
| 主题 | 跟随 DSH | 随界面主题自动切换，不持久化 |
| Ctrl+C 复制 | 开 | 有选区时复制，无选区时仍是 ^C |
| 右键粘贴 | 开 | 读取剪贴板需要 localhost 或 HTTPS |
| 选中即复制 | 关 | 松手后 150 ms 触发 |
| 提示位置 | 底部居中 | 底部居中 / 底部靠左 / 顶部居中 / 跟随鼠标 / 关闭 |
| 工作区 shell | 空 | 按工作区记住上次选择，存 `dsh.terminal.shells` |
| `DSH_TERMINAL_SHELL` | 空 | 覆盖本机默认 shell |
| `DSH_TERMINAL_CWD` | 宿主启动目录 | 前端没给工作区时的默认目录 |
| `DSH_TERMINAL_HOST` | `127.0.0.1` | 终端服务进程监听地址 |
| `DSH_TERMINAL_PORT` | `3110` | 终端服务进程端口 |
| `DSH_TERMINAL_HELPER` | 空 | 设为 `1` 时 Windows 也启动终端服务进程 |
| `DSH_TERMINAL_KEEP_PAGER` | 空 | 设为 `1` 时保留继承的 `PAGER=cat`，不清理 pager 变量 |

界面选项改完立即生效；环境变量在启动 DSH 前设置，重启后生效。

## 常见问题

**装完看不到「新建终端」卡片？** 先完全退出 DSH 再启动；桌面版还确认 `node-pty` 的构建脚本已放行。仍然不行就用原安装方式重装一次。

**提示 `node-pty` 加载失败？** 通常是原生组件没编译或架构不匹配。按[安装](#安装)里的 `allowBuilds` 放行后重装；没有预编译包的平台还需要本机构建工具。

**一直显示「连接中…」或「连接失败」？** 确认所选 shell 已安装，WSL 发行版、容器或 SSH 主机可用。断开后每 3 秒自动重试，也可以点「重连」；重连会新建 shell，不会恢复旧任务。

**提示终端数量已达上限？** 每个环境最多 10 个。点「后台终端：N」关掉不用的，或点「关闭其他终端」；收起侧栏不会释放终端。

**右键粘贴没反应？** 确认「右键粘贴」是开的，并且页面在 localhost 或 HTTPS 下打开；明文 HTTP 的远端地址拿不到剪贴板。

## 已知限制

- 关闭页签或在后台列表里关闭，会结束对应 shell；重新打开是新 shell。
- 「重连」和断线自动重连都只重建连接，不恢复正在运行的任务；刷新页面还会丢掉回滚记录。
- 每个环境最多 10 个终端，终端服务进程合计最多 12 个 PTY。
- Windows 桌面版默认用同源后端，按键回显与主进程共享事件循环，主进程重载时可能变慢。
- 容器里的目标目录不存在时回落到家目录；容器需处于运行状态，SSH 需要可用的本机客户端与认证。
- 主题只改终端画面配色，不改变 DSH 本身的主题。

## 安全

- 命令在所选目标上执行，权限就是那个 shell 的权限；执行前先看清工作区与 shell。
- 终端服务进程默认只监听 `127.0.0.1`；同源路由复用 DSH 自己的 WebSocket 服务。
- 不上传命令、输出或剪贴板内容；剪贴板只在浏览器本地读写。
- 不要把终端端口转发到公网；远程访问请走 SSH 隧道等受控方式。

## 版本与兼容性

当前版本 **0.1.2**，要求 Node.js **≥ 20**、DSH **≥ 0.2.2-rc.1**。

| DSH 版本 | 状态 |
|---|---|
| 0.2.2-alpha.3 | 不兼容 |
| 0.2.2-rc.1 | 兼容 |
| 0.2.2-rc.2 | 未验证 |

- Windows：cmd、PowerShell、pwsh、WSL 发行版、运行中的容器、SSH 主机。
- macOS / Linux：登录 shell、bash、zsh、fish、运行中的容器、SSH 主机。
- 终端服务进程在 macOS / Linux 上默认启用；Windows 桌面版默认走同源回退。

## 许可

MIT
