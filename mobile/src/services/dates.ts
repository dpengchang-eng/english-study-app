const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export function asDate(ms: number): Date {
  return new Date(ms);
}

export function dateKey(ms: number): string {
  const d = asDate(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function formatFeedStamp(ms: number): string {
  const d = asDate(ms);
  const h = d.getUTCHours();
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${hour12}:${min} ${ampm}`;
}

export function formatDetailStamp(ms: number): string {
  const d = asDate(ms);
  const h = d.getUTCHours();
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hour12}:${min} ${ampm}`;
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

export function startOfUtcDay(ms: number): number {
  const d = asDate(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function todayKey(now = Date.now()): string {
  return dateKey(now);
}

export function yesterdayKey(now = Date.now()): string {
  return dateKey(now - 24 * 60 * 60 * 1000);
}

export function inRange(ms: number, range: "week" | "month" | "quarter" | "year" | "all", now = Date.now()): boolean {
  if (range === "all") return true;
  const d = asDate(ms);
  const n = asDate(now);
  if (range === "year") return d.getUTCFullYear() === n.getUTCFullYear();
  if (range === "month") {
    return d.getUTCFullYear() === n.getUTCFullYear() && d.getUTCMonth() === n.getUTCMonth();
  }
  if (range === "week") return now - ms <= 7 * 24 * 60 * 60 * 1000;
  const q = Math.floor(n.getUTCMonth() / 3);
  return d.getUTCFullYear() === n.getUTCFullYear() && Math.floor(d.getUTCMonth() / 3) === q;
}

export function monthCells(year: number, monthIndex: number): Array<{ day: number | null; key: string | null }> {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const startPad = first.getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < startPad; i += 1) cells.push({ day: null, key: null });
  for (let day = 1; day <= days; day += 1) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, key });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, key: null });
  return cells;
}

export function yearMonths(year: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
}
