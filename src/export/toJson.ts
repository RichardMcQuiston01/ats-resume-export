import type { Resume } from '../types';

/**
 * Serializes a resume to pretty-printed JSON. Round-trips losslessly
 * through `parseResume` — this is also the interchange format between tools
 * built on this package.
 */
export function exportResumeAsJson(resume: Resume): string {
  return JSON.stringify(resume, null, 2);
}
