import { describe, expect, it } from 'vitest';

import { DEFAULT_SECTION_ORDER, resolveSectionOrder } from './sections';
import type { SectionKey } from './types';

describe('resolveSectionOrder', () => {
  it('returns the default order when no order is set', () => {
    expect(resolveSectionOrder({})).toStrictEqual([...DEFAULT_SECTION_ORDER]);
  });

  it('uses a full custom order as given', () => {
    const order: SectionKey[] = [
      'projects',
      'skills',
      'education',
      'experience',
      'certifications',
    ];

    expect(resolveSectionOrder({ sectionOrder: order })).toStrictEqual(order);
  });

  it('appends sections a partial order leaves out, in default order', () => {
    expect(
      resolveSectionOrder({ sectionOrder: ['skills', 'projects'] })
    ).toStrictEqual([
      'skills',
      'projects',
      'experience',
      'education',
      'certifications',
    ]);
  });

  it('ignores duplicate and unknown keys', () => {
    const sectionOrder = [
      'education',
      'education',
      'hobbies',
    ] as unknown as SectionKey[];

    expect(resolveSectionOrder({ sectionOrder })).toStrictEqual([
      'education',
      'experience',
      'skills',
      'certifications',
      'projects',
    ]);
  });

  it('always returns a fresh array', () => {
    const resolved = resolveSectionOrder({});
    resolved.reverse();

    expect(resolveSectionOrder({})).toStrictEqual([...DEFAULT_SECTION_ORDER]);
  });
});
