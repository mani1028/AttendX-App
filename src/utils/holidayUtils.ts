export const formatLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSunday = (value: Date | string): boolean => {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value;
  return !Number.isNaN(date.getTime()) && date.getDay() === 0;
};

export const getMonthSundayDates = (month: number, year: number): Date[] => {
  const sundays: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    if (current.getDay() === 0) {
      sundays.push(current);
    }
  }

  return sundays;
};
