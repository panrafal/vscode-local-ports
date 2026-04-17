# Local Ports

A VS Code Explorer view that lists local TCP listeners, grouped by process name.

## Features

- Lists listening ports from `node` processes (more process kinds to follow).
- Inline actions per port:
  - Kill the owning process (SIGTERM, SIGKILL fallback after 2s).
  - Open `http://host:port` in the editor's Simple Browser.
  - Open `http://host:port` in the system browser.
- Title-bar refresh button.
- Auto-refresh whenever the view becomes visible.

## How it works

Runs `lsof -iTCP -sTCP:LISTEN -n -P -c node -F pcn` and parses the machine-readable output. No sudo required for processes owned by the current user.

## Installation

The extension is not published on the VS Code Marketplace. Install the latest `.vsix` from the [GitHub Releases page](https://github.com/panrafal/vscode-local-ports/releases):

1. Download `vscode-local-ports-<version>.vsix` from the [latest release](https://github.com/panrafal/vscode-local-ports/releases/latest).
2. Install it using either method below.

**From the Extensions view:**

Open the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`), click the `...` menu, choose **Install from VSIX...**, and select the downloaded file.

**From the command line:**

```sh
code --install-extension vscode-local-ports-<version>.vsix
```

## Development

```bash
pnpm install
pnpm compile
```

Open the folder in VS Code and press `F5` to launch an Extension Development Host.
