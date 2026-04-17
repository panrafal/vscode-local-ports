import * as vscode from "vscode";
import { LocalPortsTreeDataProvider } from "./tree/treeDataProvider";
import { PortTreeItem } from "./tree/treeItems";
import { scanNodePorts } from "./ports/scanner";

export function activate(context: vscode.ExtensionContext) {
  const provider = new LocalPortsTreeDataProvider();

  const treeView = vscode.window.createTreeView("localPorts.view", {
    treeDataProvider: provider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);

  context.subscriptions.push(
    treeView.onDidChangeVisibility((e) => {
      if (e.visible) {
        void provider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("localPorts.refresh", () =>
      provider.refresh()
    ),
    vscode.commands.registerCommand(
      "localPorts.kill",
      async (item: PortTreeItem | undefined) => {
        if (!item) {
          return;
        }
        await killPid(item.port.pid);
        await provider.refresh();
      }
    ),
    vscode.commands.registerCommand(
      "localPorts.openSimpleBrowser",
      async (item: PortTreeItem | undefined) => {
        if (!item) {
          return;
        }
        await vscode.commands.executeCommand("simpleBrowser.show", item.url);
      }
    ),
    vscode.commands.registerCommand(
      "localPorts.openExternal",
      async (item: PortTreeItem | undefined) => {
        if (!item) {
          return;
        }
        await vscode.env.openExternal(vscode.Uri.parse(item.url));
      }
    )
  );

  void provider.refresh();
}

export function deactivate() {}

async function killPid(pid: number): Promise<void> {
  try {
    process.kill(pid, "SIGTERM");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return;
    }
    vscode.window.showErrorMessage(
      `Local Ports: failed to SIGTERM pid ${pid}: ${(err as Error).message}`
    );
    return;
  }

  await new Promise((r) => setTimeout(r, 2000));

  if (!(await pidStillListening(pid))) {
    return;
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return;
    }
    vscode.window.showErrorMessage(
      `Local Ports: failed to SIGKILL pid ${pid}: ${(err as Error).message}`
    );
  }
}

async function pidStillListening(pid: number): Promise<boolean> {
  try {
    const ports = await scanNodePorts();
    return ports.some((p) => p.pid === pid);
  } catch {
    return false;
  }
}
