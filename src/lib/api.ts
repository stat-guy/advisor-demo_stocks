import type { Snapshot, SnapshotError } from "@shared/types";

export type SnapshotResult = Snapshot | SnapshotError;

export function isError(r: SnapshotResult): r is SnapshotError {
  return "error" in r;
}

export async function fetchSnapshot(ticker: string): Promise<SnapshotResult> {
  const res = await fetch(`/api/snapshot?ticker=${encodeURIComponent(ticker)}`);
  return (await res.json()) as SnapshotResult;
}
