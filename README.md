# dsh-terminal

简体中文 | [English](./README.en.md)

> **终端就在对话旁边：本机、WSL、Docker、SSH，按工作区切换。**

[![npm](https://img.shields.io/npm/v/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

<img src="docs/assets/banner.png" alt="dsh-terminal 终端面板" width="100%">

DeepSeek Harness 的终端插件。在右侧栏点击 **新建终端**，即可在当前工作区运行命令，无需切换到外部终端窗口。

## 界面预览

<img src="docs/assets/screenshots/terminal.png" alt="右侧栏终端：环境选择、主题、复制、清屏和重连" width="62%">

## 功能

- **自动选择环境**：Windows 本机工作区使用 cmd，WSL 工作区进入对应发行版，Docker 工作区进入容器，SSH 工作区连接远程主机；macOS / Linux 使用登录 shell。
- **手动切换 shell**：支持 cmd、PowerShell、pwsh、WSL、运行中的 Docker 容器和 SSH，选择按工作区记住。
- **后台终端**：切换会话或收起侧栏时继续运行；同一工作区可复用终端，通过数量徽标管理后台终端。
- **复制与粘贴**：可配置 Ctrl+C 复制、选中即复制、右键粘贴。
- **常用操作**：浅色 / 暗色主题、清屏、重连，以及后台终端管理。

## 安装

要求：DSH **0.2.2-rc.1 或更新版本**、Node.js **20 或更新版本**。WSL、Docker、SSH 功能还需本机具备相应运行环境或客户端。

### DSH 桌面版

在应用内打开 **插件 → 添加插件**，输入：

```text
@lylgj/dsh-terminal
```

若询问是否允许 `node-pty` 的构建脚本，请在确认包来源后允许。它用于准备终端所需的原生组件；支持的平台通常可使用预编译文件，其他平台可能需要本机构建工具。

安装完成后完全退出并重新打开 DSH。

### dsh web / 自定义 profile

若使用的 pnpm 要求显式批准依赖脚本，先在对应 profile 的 `pnpm-workspace.yaml` 中合并以下配置，保留已有条目：

```yaml
allowBuilds:
  node-pty: true
```

通过 CLI 安装，然后重启对应 DSH 实例：

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

使用自定义 profile 时，将 `web` 换成实际 profile 名称。

## 快速开始

1. 打开右侧栏，在开始页点击 **新建终端**。
2. 插件按当前工作区选择环境；需要其他 shell 时，通过工具条下拉菜单切换。
3. 直接输入命令。点击终端数量徽标，可查看和管理后台终端。

## 注意

- 打开终端前，先确认远程目标可正常连接。Docker 容器需要处于运行状态；SSH 需要可用的本机 SSH 客户端、配置和认证。
- 仅收起侧栏或切换会话不会结束终端；关闭终端页签或在后台终端列表中关闭终端，会结束对应 shell。
- 切换 shell、点击 **重连** 或断线后自动重连都会新建 shell，不会恢复原来的运行任务。重连时当前页面的已有输出仍在，但刷新页面会丢失滚动记录并重建终端。长任务请使用目标环境中的 tmux 等会话管理工具。
- 开启 Ctrl+C 复制后，有选区时复制，没有选区时仍用于中断命令。
- 命令在所选目标上执行，请确认工作区和 shell 后再操作。
- 不要将本地终端服务直接暴露到公网。

## 常见问题

**安装后没有终端入口或提示原生组件加载失败？** 先完全退出并重新打开 DSH。若错误指向 `node-pty`，确认已批准其构建脚本，再通过原安装方式重新安装；需要本机构建的平台还需准备构建工具。

**终端一直连接失败？** 先确认所选 shell 已安装，WSL 发行版或 Docker 容器可用，SSH 能通过本机客户端正常登录。连接断开后会约每 3 秒自动重试，也可点击 **重连**；这会启动新 shell，而非恢复旧任务。

**提示终端数量已达上限？** 点击终端数量徽标，关闭不再使用的后台终端，再打开新终端。仅收起侧栏不会释放终端。

## 卸载

在 DSH 桌面版的 **插件** 页面找到本插件，选择 **卸载**，然后完全退出并重新打开 DSH。

使用 CLI 时，在安装插件的同一个 profile 中执行：

```sh
dsh plugin --profile web remove @lylgj/dsh-terminal
```

将 `web` 换成实际 profile 名称，然后重启对应 DSH 实例。

## 许可

[MIT](./LICENSE)。第三方组件说明见 [第三方声明](./THIRD-PARTY-NOTICES.md)。
