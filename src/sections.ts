import { SECTION_KEYS, type Resume, type SectionKey } from './types';

/** Default order of the reorderable sections. */
export const DEFAULT_SECTION_ORDER: readonly SectionKey[] = SECTION_KEYS;

/**
 * Returns the order to render the reorderable sections in: the resume's
 * `sectionOrder` (ignoring unknown and duplicate keys), followed by any
 * sections it leaves out in their default order. Always returns a fresh array
 * containing every section exactly once.
 */
export function resolveSectionOrder(
  resume: Pick<Resume, 'sectionOrder'>
): SectionKey[] {
  const ordered: SectionKey[] = [];
  for (const key of resume.sectionOrder ?? []) {
    if (SECTION_KEYS.includes(key) && !ordered.includes(key)) {
      ordered.push(key);
    }
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!ordered.includes(key)) {
      ordered.push(key);
    }
  }
  return ordered;
}
