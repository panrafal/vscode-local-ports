import * as vscode from "vscode";
import { ListeningPort, LsofError, scanNodePorts } from "../ports/scanner";
import { GroupTreeItem, PortTreeItem, TreeNode } from "./treeItems";

export class LocalPortsTreeDataProvider
  implements vscode.TreeDataProvider<TreeNode>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private rootNodes: GroupTreeItem[] = [];
  private errorShown = false;

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.rootNodes;
    }
    if (element instanceof GroupTreeItem) {
      return element.children;
    }
    return [];
  }

  findPortItem(pid: number, port: number): PortTreeItem | undefined {
    for (const group of this.rootNodes) {
      for (const child of group.children) {
        if (child.port.pid === pid && child.port.port === port) {
          return child;
        }
      }
    }
    return undefined;
  }

  async refresh(): Promise<void> {
    let ports: ListeningPort[] = [];
    try {
      ports = await scanNodePorts();
    } catch (err) {
      if (!this.errorShown) {
        this.errorShown = true;
        const msg = err instanceof LsofError ? err.message : String(err);
        vscode.window.showErrorMessage(`Local Ports: ${msg}`);
      }
      this.rootNodes = [];
      this._onDidChangeTreeData.fire();
      return;
    }
    this.rootNodes = groupPorts(ports);
    this._onDidChangeTreeData.fire();
  }
}

function groupPorts(ports: ListeningPort[]): GroupTreeItem[] {
  const byCommand = new Map<string, ListeningPort[]>();
  for (const p of ports) {
    const list = byCommand.get(p.command) ?? [];
    list.push(p);
    byCommand.set(p.command, list);
  }

  const groups: GroupTreeItem[] = [];
  for (const [command, list] of [...byCommand.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    list.sort((a, b) => a.port - b.port || a.pid - b.pid);
    const items = list.map((p) => new PortTreeItem(p));
    groups.push(new GroupTreeItem(command, items));
  }
  return groups;
}
