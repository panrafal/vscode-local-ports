import * as vscode from "vscode";
import { ListeningPort } from "../ports/scanner";

export type TreeNode = GroupTreeItem | PortTreeItem;

export class GroupTreeItem extends vscode.TreeItem {
  public readonly children: PortTreeItem[];

  constructor(command: string, children: PortTreeItem[]) {
    super(command, vscode.TreeItemCollapsibleState.Expanded);
    this.children = children;
    this.contextValue = "group";
    this.iconPath = new vscode.ThemeIcon("server-process");
    this.description = `${children.length} ${children.length === 1 ? "port" : "ports"}`;
    this.id = `group:${command}`;
  }
}

export class PortTreeItem extends vscode.TreeItem {
  public readonly port: ListeningPort;

  constructor(port: ListeningPort) {
    const label = port.groupLeader
      ? `:${port.port} · ${port.groupLeader.comm}`
      : `:${port.port}`;
    super(label, vscode.TreeItemCollapsibleState.None);
    this.port = port;
    this.contextValue = "port";
    this.iconPath = new vscode.ThemeIcon("plug");
    this.description = `${port.host} • pid ${port.pid}`;
    const lines = [
      `**${port.command}** (pid ${port.pid})`,
      "",
      `- Host: \`${port.host}\``,
      `- Port: \`${port.port}\``,
      `- URL: http://${port.host}:${port.port}`,
      `- lsof: \`${port.rawName}\``,
    ];
    if (port.groupLeader) {
      lines.push(
        `- Group: \`${port.groupLeader.comm}\` (pgid ${port.groupLeader.pid})`
      );
    }
    if (port.parents.length > 0) {
      lines.push("", "**Parent processes:**");
      for (const parent of port.parents) {
        lines.push(`- \`${parent.comm}\` (pid ${parent.pid})`);
      }
    }
    this.tooltip = new vscode.MarkdownString(lines.join("\n"));
    this.id = `port:${port.pid}:${port.host}:${port.port}`;
  }

  get url(): string {
    return `http://${this.port.host}:${this.port.port}`;
  }
}
