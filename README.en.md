<div align="center">

<img src="docs/assets/banner.png" alt="dsh-terminal: a terminal panel in the right sidebar" width="100%">

# 🖥️ dsh-terminal

**A terminal right beside the conversation: local, WSL, containers, and remote hosts, picked per workspace.**

dsh-terminal puts a terminal in the DSH right sidebar. Click **New Terminal** on the start page and a
real PTY starts in the current workspace — no extra window, no leaving the conversation. Collapsing
the sidebar or switching conversations does not interrupt running commands.

[![npm version](https://img.shields.io/npm/v/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![npm downloads](https://img.shields.io/npm/dm/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![topic: dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-2ea44f?style=flat-square)](https://github.com/topics/dsh-plugin)
[![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)](#versions--compatibility)

[简体中文](./README.md) · English

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

</div>

> Repository: [github.com/Lylgj/dsh-terminal](https://github.com/Lylgj/dsh-terminal) · npm: [@lylgj/dsh-terminal](https://www.npmjs.com/package/@lylgj/dsh-terminal) · License: [MIT](./LICENSE)

## Interface

<img src="docs/assets/screenshots/terminal.png" alt="Sidebar terminal: status dot, working directory, shell dropdown, background terminal count, copy, clear, and reconnect buttons" width="632">

The first toolbar row shows the status dot, connection state, working directory, and **Background
terminals: N**; the second row holds the shell dropdown and action buttons. The terminal view sits
below. In overlay mode you can also drag the left edge to resize.

## Installation

Requirements: DSH **0.2.2-rc.1 or later** and Node.js **20 or later**; WSL, containers, and SSH also need the matching local runtime or client.

### ① Desktop app

Open **Plugins → Add plugin** and enter:

```text
@lylgj/dsh-terminal
```

If you are asked to approve the `node-pty` build script, allow it after checking the package source. It prepares the native components for the terminal; common platforms use prebuilt binaries.

### ② Command line

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

Replace `web` with your profile name if you use a custom one. If pnpm reports `Ignored build scripts: node-pty`, merge the following into that profile's `pnpm-workspace.yaml` (keep existing entries), then run the install command again:

```yaml
allowBuilds:
  node-pty: true
```

### ③ From source or a local directory

```sh
git clone https://github.com/Lylgj/dsh-terminal.git
cd dsh-terminal
pnpm install
dsh plugin --profile web add /absolute/path/to/dsh-terminal
```

Use an absolute path on the last line; on Windows that looks like `D:\path\to\dsh-terminal`.

### ④ Upgrade and uninstall

Upgrade with `dsh plugin --profile web add @lylgj/dsh-terminal@latest`; in the desktop app, remove the plugin on the **Plugins** page and add it again. To uninstall from the same profile:

```sh
dsh plugin --profile web remove @lylgj/dsh-terminal
```

### ⑤ Restart after installing

After installing, upgrading, or uninstalling, **fully quit and relaunch DSH** (including the tray and background processes). Refreshing the page does not load the new plugin code; for `dsh web`, restart that instance.

## First run

- **Entry point**: the **New Terminal** card on the sidebar start page; its shortcut, Ctrl+`, is shown in the card corner. It opens as a **Terminal** tab, and a conversation keeps only one terminal tab.
- **What you see**: the status dot reads "Connecting…" and then "Connected". A gray line at the top says the persistent terminal has started for this workspace and keeps running when you switch away; the shell prompt follows.
- **How the default shell is chosen**: from the workspace directory — a Docker workspace enters the container, a WSL path enters that distribution, a workspace with a remote marker uses SSH; Windows uses cmd locally, macOS / Linux use the login shell (`-l`).
- **Recent choice**: a shell you pick manually is remembered per workspace in browser storage (`dsh.terminal.shells`) and reused next time; conversations in the same workspace share one terminal.

## Features

### Environment detection

The workspace directory decides the default environment (`local` / `wsl:<distro>` / `docker:<container>` / `ssh:<host>`), and the background terminal list only includes sessions in the same environment. The shell dropdown is probed live: on Windows it offers cmd, PowerShell, pwsh, installed WSL distributions, running containers, and host aliases from `~/.ssh/config` (wildcard entries are skipped); on macOS / Linux it offers the login shell, bash, zsh, fish. Detection uses the Docker workspace marker, `\\wsl$\...` / `\\wsl.localhost\...` paths, and remote workspace markers. If the workspace is inside a container or on a remote host, choosing a local shell falls back to the workspace default, because a local shell cannot enter that directory.

### Side by side and overlay

The **Side by side / Overlay** button decides how the terminal takes space: side by side gives the DSH content area less width on the right, overlay covers the interface; side by side is the default. In either mode, drag the left edge to resize between 280 and 1100 px (default 460 px), and width, layout, and open state are stored in browser storage. When the host provides no sidebar tab service, the plugin falls back to a floating panel: a **Terminal** button in the lower-right corner and Ctrl+` to toggle it, with the same behavior.

### Persistent sessions and background terminals

Each workspace has one persistent PTY, and the connection and terminal instance live at module scope, so switching workspaces only hides and shows them. Collapsing the sidebar or switching conversations does not end a terminal; closing the tab or choosing **Close** under **Background terminals: N** reclaims the shell, and the same list offers **Close others** to clear background sessions in that environment at once. Each environment allows at most 10 terminals; the terminal service process allows at most 12 PTYs across all environments and returns an explicit error beyond that.

### Backend selection and fallback

The browser first connects to the terminal service process (default `ws://127.0.0.1:3110/ws`) and switches to the same-origin route `/dsh-terminal/ws` as soon as the handshake fails; only when both fail does it retry every 3 seconds. The service process runs an event loop that serves only PTYs, so keystroke echo stays responsive while the main process is streaming output or compressing to disk. The Windows desktop build uses the same-origin fallback by default (spawning another host instance is the more expensive option); set `DSH_TERMINAL_HELPER=1` to force the service process.

### Copy, paste, and toasts

Defaults: Ctrl+C copies when text is selected and still sends ^C when nothing is selected; right-click paste is on; copy-on-select is off. The **Copy** button opens the settings menu, where the three switches combine freely; toast position can be bottom center (default), bottom left, top center, follow the pointer, or off, and toasts disappear after 1.2 seconds.

Copy-on-select writes the clipboard 150 ms after you release the mouse, so dragging does not copy repeatedly. Browsers expose the clipboard API only on localhost or HTTPS; copying may fail over plain HTTP on a remote address.

### Theme, clear, reconnect

Two terminal palettes, light and dark, that **follow the DSH interface theme**: switch DSH to dark and the terminal turns dark-on-light automatically, switch back and it returns to dark text on white. There is no manual toggle and nothing is written to browser storage. The palette is picked from the actual background colour of the container holding the terminal, so it matches wherever the panel is mounted. **Clear** affects only the current workspace's terminal view and leaves other background terminals alone. **Reconnect** rebuilds the connection to the backend, which therefore starts a new shell: output already on screen stays, but running tasks do not resume; automatic reconnection after a drop behaves the same.

## Configuration

| Setting | Default | Notes |
|---|---|---|
| Panel width | `460` | Drag the left edge, 280–1100 px; stored as `dsh.terminal.width` |
| Layout | Side by side | `dock` / `overlay`; stored as `dsh.terminal.mode` |
| Theme | Follows DSH | Switches with the interface theme; nothing persisted |
| Ctrl+C copy | On | Copies with a selection, otherwise still sends ^C |
| Right-click paste | On | Reading the clipboard requires localhost or HTTPS |
| Copy on select | Off | Fires 150 ms after the mouse is released |
| Toast position | Bottom center | Bottom center / bottom left / top center / pointer / off |
| Workspace shell | Empty | Remembers the last choice per workspace as `dsh.terminal.shells` |
| `DSH_TERMINAL_SHELL` | Empty | Overrides the local default shell |
| `DSH_TERMINAL_CWD` | Host launch directory | Default directory when the frontend sends no workspace |
| `DSH_TERMINAL_HOST` | `127.0.0.1` | Listen address of the terminal service process |
| `DSH_TERMINAL_PORT` | `3110` | Port of the terminal service process |
| `DSH_TERMINAL_HELPER` | Empty | Set to `1` to start the service process on Windows too |
| `DSH_TERMINAL_KEEP_PAGER` | Empty | Set to `1` to keep inherited `PAGER=cat`; pager variables are left alone |

Interface options apply immediately; environment variables are read when DSH starts, so set them before launching it.

## FAQ

**No New Terminal card after installing?** Fully quit and relaunch DSH first; in the desktop app, also check that the `node-pty` build script was approved. If it still fails, reinstall the same way.

**`node-pty` fails to load?** Usually the native component was not built or the architecture does not match. Approve it via `allowBuilds` as shown in [Installation](#installation) and reinstall; platforms without prebuilt binaries also need local build tools.

**It stays on "Connecting…" or "Connection failed".** Check that the selected shell is installed and that the WSL distribution, container, or SSH host is reachable. After a drop it retries every 3 seconds; you can also click **Reconnect**, which starts a new shell rather than restoring the old task.

**The terminal limit was reached.** Each environment allows 10. Close unused ones under **Background terminals: N**, or use **Close others**; collapsing the sidebar does not release terminals.

**Right-click paste does nothing.** Make sure **Right-click paste** is on and the page is served from localhost or HTTPS; a plain-HTTP remote address has no clipboard access.

## Known limitations

- Closing the tab or closing from the background list ends that shell; reopening starts a new one.
- **Reconnect** and automatic reconnection only rebuild the connection, not running tasks; refreshing the page also drops scrollback.
- Each environment allows 10 terminals, and the service process allows 12 PTYs in total.
- The Windows desktop build uses the same-origin backend by default, so keystroke echo shares the main process event loop and may slow down while it is loaded.
- When the target directory inside a container does not exist, the shell falls back to the home directory; containers must be running, and SSH needs a working local client and authentication.
- The theme follows the DSH interface theme; it is not a separate terminal-only setting.

## Security

- Commands run on the selected target with that shell's privileges; check the workspace and shell first.
- The terminal service process listens on `127.0.0.1` by default; the same-origin route reuses DSH's own WebSocket service.
- Commands, output, and clipboard contents are never uploaded; the clipboard is read and written only in the browser.
- Do not forward the terminal port to the public internet; use a controlled path such as an SSH tunnel for remote access.

## Versions & compatibility

Current version **0.1.2**, requiring Node.js **≥ 20** and DSH **≥ 0.2.2-rc.1**.

| DSH version | Status |
|---|---|
| 0.2.2-alpha.3 | Incompatible |
| 0.2.2-rc.1 | Compatible |
| 0.2.2-rc.2 | Unverified |

- Windows: cmd, PowerShell, pwsh, WSL distributions, running containers, SSH hosts.
- macOS / Linux: login shell, bash, zsh, fish, running containers, SSH hosts.
- The terminal service process is enabled by default on macOS / Linux; the Windows desktop build uses the same-origin fallback by default.

## License

MIT
