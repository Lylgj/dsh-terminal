# dsh-terminal

[简体中文](./README.md) | English

> **A terminal beside your conversation: local, WSL, Docker, and SSH, matched to your workspace.**

[![npm](https://img.shields.io/npm/v/@lylgj/dsh-terminal?style=flat-square)](https://www.npmjs.com/package/@lylgj/dsh-terminal)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)

<img src="docs/assets/banner.png" alt="dsh-terminal terminal panel" width="100%">

A terminal plugin for DeepSeek Harness. Open **New Terminal** in the right sidebar to run commands in your current workspace without switching to an external terminal window.

## Preview

<img src="docs/assets/screenshots/terminal.png" alt="Sidebar terminal: environment selection, themes, copy, clear, and reconnect" width="62%">

## Features

- **Automatic environment selection:** cmd for local Windows workspaces, the matching distribution for WSL, the container for Docker, and the remote host for SSH; macOS / Linux use a login shell.
- **Manual shell selection:** cmd, PowerShell, pwsh, WSL, running Docker containers, and SSH. Your choice is remembered per workspace.
- **Background terminals:** keep running when you switch conversations or collapse the sidebar. Reuse terminals within a workspace and manage background terminals through the count badge.
- **Copy and paste:** configurable Ctrl+C copying, copy on selection, and right-click paste.
- **Everyday controls:** light / dark themes, clear, reconnect, and background terminal management.

## Installation

Requirements: DSH **0.2.2-rc.1 or later** and Node.js **20 or later**. WSL, Docker, and SSH features also require the corresponding local runtime or client.

### DSH Desktop

Open **Plugins → Add Plugin** in the app and enter:

```text
@lylgj/dsh-terminal
```

If prompted to approve the `node-pty` build script, allow it after verifying the package source. It prepares the native components needed by the terminal; supported platforms usually use prebuilt binaries, while others may require local build tools.

Fully quit and reopen DSH after installation.

### dsh web / custom profile

If your pnpm setup requires explicit approval for dependency scripts, merge the following into your profile's `pnpm-workspace.yaml`, preserving existing entries:

```yaml
allowBuilds:
  node-pty: true
```

Install with the CLI, then restart the corresponding DSH instance:

```sh
dsh plugin --profile web add @lylgj/dsh-terminal
```

Replace `web` with your actual profile name when using a custom profile.

## Quick start

1. Open the right sidebar and click **New Terminal** on its start page.
2. The plugin selects an environment for the current workspace. Use the toolbar dropdown to choose another shell.
3. Enter commands directly. Click the terminal count badge to view and manage background terminals.

## Notes

- Ensure remote targets are reachable before opening a terminal. Docker containers must be running; SSH requires a working local SSH client, configuration, and authentication.
- Collapsing the sidebar or switching conversations does not end a terminal. Closing its tab or closing it from the background terminal list ends the corresponding shell.
- Switching shells, clicking **Reconnect**, or reconnecting automatically after a disconnect starts a new shell; it does not restore running tasks. Existing output remains on the current page during reconnection, but refreshing the page loses scrollback and recreates the terminal. Use a session manager such as tmux on the target for long-running tasks.
- With Ctrl+C copying enabled, Ctrl+C copies when text is selected and interrupts commands otherwise.
- Commands run on the selected target. Check the workspace and shell before proceeding.
- Do not expose the local terminal service directly to the public internet.

## FAQ

**No terminal entry after installation, or a native component fails to load?** Fully quit and reopen DSH first. If the error names `node-pty`, check that its build script was approved, then reinstall using the same installation method. Platforms that require a local build also need build tools.

**The terminal cannot connect?** Check that the selected shell is installed, the WSL distribution or Docker container is available, and SSH login works through your local client. Disconnections trigger automatic retries approximately every 3 seconds; you can also click **Reconnect**. This starts a new shell rather than restoring an old task.

**The terminal limit has been reached?** Click the terminal count badge and close unused background terminals before opening a new one. Collapsing the sidebar does not release terminals.

## Uninstall

In DSH Desktop, find the plugin on the **Plugins** page, choose **Uninstall**, then fully quit and reopen DSH.

For CLI installations, remove it from the same profile used for installation:

```sh
dsh plugin --profile web remove @lylgj/dsh-terminal
```

Replace `web` with your actual profile name, then restart that DSH instance.

## License

[MIT](./LICENSE). See [Third-party notices](./THIRD-PARTY-NOTICES.md) for third-party components.
