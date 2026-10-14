import { describe, expect, it } from 'vitest';

import { formatDateRange } from './formatDateRange';

describe('formatDateRange', () => {
  it('joins a start and an end date', () => {
    expect(formatDateRange('2018-06', '2020-03', false)).toBe(
      '2018-06 - 2020-03'
    );
  });

  it('ends a current entry with Present', () => {
    expect(formatDateRange('2022-03', undefined, true)).toBe(
      '2022-03 - Present'
    );
  });

  it('prefers Present over a leftover end date for a current entry', () => {
    expect(formatDateRange('2022-03', '2023-01', true)).toBe(
      '2022-03 - Present'
    );
  });

  it('shows just the end date when there is no start date', () => {
    expect(formatDateRange(undefined, '2018-05', false)).toBe('2018-05');
    expect(formatDateRange('', '2018-05', false)).toBe('2018-05');
  });

  it('shows just the start date when there is no end date and it is not current', () => {
    expect(formatDateRange('2018-06', undefined, false)).toBe('2018-06');
  });

  it('is empty when there are no dates', () => {
    expect(formatDateRange(undefined, undefined, false)).toBe('');
  });

  it('never leaves a dangling separator', () => {
    for (const range of [
      formatDateRange(undefined, '2018-05', false),
      formatDateRange('2018-06', undefined, false),
    ]) {
      expect(range).not.toMatch(/^ - | - $/);
    }
  });
});
