import { DateFilterPeriod } from '../types/utilities';

/**
 * Filter records by record date string (YYYY-MM-DD)
 * Uses local calendar date comparison to avoid UTC timezone shifts.
 */
export function isRecordInDatePeriod(dateStr: string, period: DateFilterPeriod): boolean {
  if (period === 'All') return true;
  if (!dateStr) return false;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  if (period === 'Day') {
    return dateStr === todayStr;
  }

  if (period === 'Month') {
    const currentMonthPrefix = `${year}-${month}`;
    return dateStr.startsWith(currentMonthPrefix);
  }

  if (period === 'Year') {
    const currentYearPrefix = `${year}`;
    return dateStr.startsWith(currentYearPrefix);
  }

  if (period === 'Week') {
    // Current week: Monday 00:00 to Sunday 23:59
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const recDate = new Date(`${dateStr}T12:00:00`);
    return recDate.getTime() >= monday.getTime() && recDate.getTime() <= sunday.getTime();
  }

  return true;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
