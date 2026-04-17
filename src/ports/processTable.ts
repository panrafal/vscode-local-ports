import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProcessInfo {
  pid: number;
  ppid: number;
  pgid: number;
  comm: string;
}

export async function loadProcessTable(): Promise<Map<number, ProcessInfo>> {
  const { stdout } = await execFileAsync(
    "ps",
    ["-A", "-o", "pid=,ppid=,pgid=,comm="],
    { timeout: 5000, maxBuffer: 10 * 1024 * 1024 }
  );
  return parseProcessTable(stdout);
}

export function parseProcessTable(output: string): Map<number, ProcessInfo> {
  const map = new Map<number, ProcessInfo>();
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) {
      continue;
    }
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const pgid = Number(match[3]);
    if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !Number.isFinite(pgid)) {
      continue;
    }
    // ps -o comm= may emit the full executable path on macOS; basename is
    // friendlier in tooltips.
    const raw = match[4].trim();
    const comm = raw.split("/").pop() || raw;
    map.set(pid, { pid, ppid, pgid, comm });
  }
  return map;
}

/**
 * Returns the process-group leader's info when the given pid is NOT the
 * group leader itself. Returns null when the process is its own group leader
 * (pgid == pid), when pgid is missing, or when the leader's row isn't in the
 * table (e.g. it exited).
 */
export function resolveGroupLeader(
  pid: number,
  table: Map<number, ProcessInfo>
): ProcessInfo | null {
  const info = table.get(pid);
  if (!info) {
    return null;
  }
  if (info.pgid <= 0 || info.pgid === info.pid) {
    return null;
  }
  return table.get(info.pgid) ?? null;
}

export function resolveParentChain(
  pid: number,
  table: Map<number, ProcessInfo>
): ProcessInfo[] {
  const chain: ProcessInfo[] = [];
  const seen = new Set<number>([pid]);
  let current = table.get(pid);
  while (current && current.ppid > 0 && !seen.has(current.ppid)) {
    const parent = table.get(current.ppid);
    if (!parent) {
      break;
    }
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }
  return chain;
}
