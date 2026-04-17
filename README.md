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

## Development

```bash
pnpm install
pnpm compile
```

Open the folder in VS Code and press `F5` to launch an Extension Development Host.
