import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "data/cache.sqlite";
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    fetched_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tickers (
    ticker      TEXT PRIMARY KEY,
    cik         TEXT NOT NULL,
    name        TEXT,
    updated_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS company_facts (
    cik              TEXT PRIMARY KEY,
    facts_json       TEXT NOT NULL,
    latest_accession TEXT,
    fetched_at       INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    ticker        TEXT PRIMARY KEY,
    snapshot_json TEXT NOT NULL,
    quote_ts      INTEGER,
    accession     TEXT,
    created_at    INTEGER NOT NULL
  );
`);

/** Generic TTL cache backed by the `kv` table. Returns null if missing or stale. */
export function cacheGet<T>(key: string, ttlMs: number): T | null {
  const row = db
    .query<{ value: string; fetched_at: number }, [string]>(
      "SELECT value, fetched_at FROM kv WHERE key = ?",
    )
    .get(key);
  if (!row) return null;
  if (Date.now() - row.fetched_at > ttlMs) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  db.query(
    "INSERT OR REPLACE INTO kv (key, value, fetched_at) VALUES (?, ?, ?)",
  ).run(key, JSON.stringify(value), Date.now());
}
