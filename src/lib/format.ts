export function money(v: number | null | undefined): string {
  if (v == null) return "—";
  const s = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  return `${s}$${a.toFixed(2)}`;
}

export const price = (v: number | null | undefined) =>
  v == null ? "—" : `$${v.toFixed(2)}`;

export const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export const range = (lo: number | null | undefined, hi: number | null | undefined) =>
  lo == null || hi == null ? "—" : `${price(lo)} – ${price(hi)}`;

export function timeOf(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
