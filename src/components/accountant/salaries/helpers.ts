export const formatDateSafe = (dateString: string): string => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) { return '—'; }
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  } catch {
    return '—';
  }
};

export const formatCurrencySafe = (value: number): string => {
  if (!Number.isFinite(value)) { return '0.00'; }
  const fixed = value.toFixed(2);
  const [wholePart, fractionPart] = fixed.split('.');
  const lastThree = wholePart.slice(-3);
  const otherDigits = wholePart.slice(0, -3);
  const groupedWhole = otherDigits
    ? `${otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree;
  return `${groupedWhole}.${fractionPart}`;
};
