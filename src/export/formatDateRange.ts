/** Formats a date range for plain-text export contexts (TXT/HTML/DOCX/PDF). */
export function formatDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  isCurrent: boolean
): string {
  const start = startDate ?? '';
  const end = isCurrent ? 'Present' : (endDate ?? '');

  if (!start && !end) {
    return '';
  }

  return `${start} - ${end}`;
}
