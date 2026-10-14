import { describe, expect, it } from 'vitest';

import { parseMarkdownRuns, stripMarkdownRuns } from './richText';

describe('parseMarkdownRuns', () => {
  it('returns one plain run when there is no markup', () => {
    expect(parseMarkdownRuns('plain text')).toStrictEqual([
      { text: 'plain text', bold: false, italic: false },
    ]);
  });

  it('splits bold and italic markup into styled runs', () => {
    expect(parseMarkdownRuns('a **b** c *d* e')).toStrictEqual([
      { text: 'a ', bold: false, italic: false },
      { text: 'b', bold: true, italic: false },
      { text: ' c ', bold: false, italic: false },
      { text: 'd', bold: false, italic: true },
      { text: ' e', bold: false, italic: false },
    ]);
  });

  it('leaves an unmatched marker as plain text', () => {
    expect(parseMarkdownRuns('5 * 3 = 15')).toStrictEqual([
      { text: '5 * 3 = 15', bold: false, italic: false },
    ]);
  });

  it('returns a single empty run for an empty string', () => {
    expect(parseMarkdownRuns('')).toStrictEqual([
      { text: '', bold: false, italic: false },
    ]);
  });

  it('can be called repeatedly (no shared regex state)', () => {
    expect(parseMarkdownRuns('**a**')).toStrictEqual(
      parseMarkdownRuns('**a**')
    );
  });
});

describe('stripMarkdownRuns', () => {
  it('removes the markers and keeps the text', () => {
    expect(stripMarkdownRuns('Cut costs by **30%** using *caching*')).toBe(
      'Cut costs by 30% using caching'
    );
  });

  it('keeps text that touches a marker attached', () => {
    expect(stripMarkdownRuns('**30%**!')).toBe('30%!');
  });
});
