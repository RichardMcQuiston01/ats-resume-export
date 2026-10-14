import { describe, expect, it } from 'vitest';

import { entryHeading } from './entryHeading';

describe('entryHeading', () => {
  it('joins the name parts with the separator', () => {
    expect(entryHeading(['Engineer', 'Acme'], undefined)).toBe(
      'Engineer — Acme'
    );
    expect(entryHeading(['Engineer', 'Acme'], undefined, ' - ')).toBe(
      'Engineer - Acme'
    );
  });

  it('adds the location after a comma', () => {
    expect(entryHeading(['Engineer', 'Acme'], 'Remote')).toBe(
      'Engineer — Acme, Remote'
    );
  });

  it('leaves the heading alone for a blank or whitespace location', () => {
    expect(entryHeading(['Engineer', 'Acme'], '')).toBe('Engineer — Acme');
    expect(entryHeading(['Engineer', 'Acme'], '   ')).toBe('Engineer — Acme');
  });

  it('skips empty name parts', () => {
    expect(entryHeading(['', 'Acme'], 'Remote')).toBe('Acme, Remote');
    expect(entryHeading([undefined, undefined], undefined)).toBe('');
  });

  it('uses the location alone when there is no name', () => {
    expect(entryHeading([], 'Remote')).toBe('Remote');
  });
});
