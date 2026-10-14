/**
 * Formats a date range for the exporters: "2022-03 - Present", "2018-06 - 2020-03",
 * or just the one date when only one end is known ("2018-05"). Empty when neither is.
 */
export function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  isCurrent: boolean
): string {
  const start = startDate ?? '';
  const end = isCurrent ? 'Present' : (endDate ?? '');

  return [start, end].filter(Boolean).join(' - ');
}
