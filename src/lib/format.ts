export const fmtMoney = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtMonth = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d + (d.length === 10 ? "T00:00:00" : ""));
  return dt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const num = (v: unknown) => Number(v ?? 0);

export const toCSV = (headers: string[], rows: (string | number | null | undefined)[][]) => {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
};

export const downloadCSV = (filename: string, csv: string) => {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
