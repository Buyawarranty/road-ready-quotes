export type ActivitySeries = 'Quotes' | 'Warranties' | 'Claims' | 'Customers';
export interface DashboardEvent {
  id: string;
  date: string;
  series: ActivitySeries;
  title: string;
  detail: string;
  to: string;
}

export function monthlyActivity(events: DashboardEvent[], from: Date, to: Date) {
  const first = new Date(Date.UTC(from.getFullYear(), from.getMonth(), 1));
  const last = Date.UTC(to.getFullYear(), to.getMonth(), 1);
  const result: { month: string; Quotes: number; Warranties: number; Claims: number; Customers: number }[] = [];
  const startDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const endDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) + 86400000;
  while (first.getTime() <= last) {
    const month = first.toISOString().slice(0, 7);
    const counts = { month, Quotes: 0, Warranties: 0, Claims: 0, Customers: 0 };
    events.forEach(event => {
      const time = new Date(event.date).getTime();
      if (time >= startDay && time < endDay && event.date.slice(0, 7) === month) counts[event.series]++;
    });
    result.push(counts);
    first.setUTCDate(1);
    first.setUTCMonth(first.getUTCMonth() + 1);
  }
  return result;
}

export function monthChange(dates: string[], now = new Date()) {
  const current = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const previous = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1);
  const count = (from: number, to: number) => dates.filter(date => {
    const time = new Date(date).getTime();
    return time >= from && time < to;
  }).length;
  const before = count(previous, current);
  return before ? Math.round((count(current, now.getTime() + 1) - before) / before * 100) : null;
}