import { execFile } from "child_process";
import { promisify } from "util";
import {
  ProcessInfo,
  loadProcessTable,
  resolveGroupLeader,
  resolveParentChain,
} from "./processTable";

const execFileAsync = promisify(execFile);

export interface ListeningPort {
  pid: number;
  command: string;
  host: string;
  port: number;
  /** Raw `n` field from lsof, kept for tooltip/debug. */
  rawName: string;
  /** Immediate parent first, up to init. Empty if ps failed. */
  parents: ProcessInfo[];
  /** Process-group leader when this pid is not itself the leader. */
  groupLeader: ProcessInfo | null;
}

export class LsofError extends Error {}

export async function scanNodePorts(): Promise<ListeningPort[]> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      "lsof",
      ["-a", "-iTCP", "-sTCP:LISTEN", "-n", "-P", "-c", "node", "-F", "pcn"],
      { timeout: 5000 }
    );
    stdout = result.stdout;
  } catch (err: unknown) {
    // lsof exits non-zero when nothing matches `-c node`. Treat empty stdout as "no results".
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    if (typeof e.stdout === "string" && e.stdout.length === 0) {
      return [];
    }
    if (typeof e.stdout === "string" && e.stdout.length > 0) {
      stdout = e.stdout;
    } else {
      throw new LsofError(e.stderr?.trim() || e.message || "lsof failed");
    }
  }
  const ports = parseLsofF(stdout);
  if (ports.length === 0) {
    return ports;
  }

  let table: Map<number, ProcessInfo> | null = null;
  try {
    table = await loadProcessTable();
  } catch {
    // Non-fatal: tooltips just won't show the parent chain.
  }
  if (table) {
    for (const port of ports) {
      port.parents = resolveParentChain(port.pid, table);
      port.groupLeader = resolveGroupLeader(port.pid, table);
    }
  }
  return ports;
}

/**
 * Parse `lsof -F pcn` output. Fields appear per-record, each prefixed by a
 * single letter. `p` starts a new process block (pid + command); `n` lines
 * under it are per-socket. One `n` entry = one ListeningPort.
 */
export function parseLsofF(output: string): ListeningPort[] {
  const ports: ListeningPort[] = [];
  let pid: number | null = null;
  let command = "";

  for (const line of output.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    const tag = line[0];
    const value = line.slice(1);
    switch (tag) {
      case "p": {
        const parsed = Number(value);
        pid = Number.isFinite(parsed) ? parsed : null;
        command = "";
        break;
      }
      case "c":
        command = value;
        break;
      case "n": {
        if (pid === null) {
          break;
        }
        const parsed = parseNameField(value);
        if (parsed) {
          ports.push({
            pid,
            command,
            host: parsed.host,
            port: parsed.port,
            rawName: value,
            parents: [],
            groupLeader: null,
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return ports;
}

function parseNameField(name: string): { host: string; port: number } | null {
  // Drop "(LISTEN)" suffix if present (shouldn't be with -sTCP:LISTEN but be safe).
  const trimmed = name.replace(/\s*\(LISTEN\)\s*$/, "");
  // Forms: "*:3000", "127.0.0.1:5173", "[::1]:9323", "[::]:8080"
  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) {
    return null;
  }
  const hostRaw = trimmed.slice(0, lastColon);
  const portRaw = trimmed.slice(lastColon + 1);
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }
  const host = normalizeHost(hostRaw);
  return { host, port };
}

function normalizeHost(raw: string): string {
  // Strip IPv6 brackets
  let host = raw;
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  if (host === "*" || host === "::" || host === "::1" || host === "0.0.0.0") {
    return "localhost";
  }
  return host;
}
