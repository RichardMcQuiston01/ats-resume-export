import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { resumeFileBaseName } from './fileNames';

describe('resumeFileBaseName', () => {
  it('slugifies the full name', () => {
    const resume = createFixtureResume();
    resume.contact.fullName = 'Jordan Rivera';

    expect(resumeFileBaseName(resume)).toBe('jordan-rivera-resume');
  });

  it('strips special characters and collapses separators', () => {
    const resume = createFixtureResume();
    resume.contact.fullName = "  Jordan   O'Rivera-Smith, Jr.  ";

    expect(resumeFileBaseName(resume)).toBe('jordan-o-rivera-smith-jr-resume');
  });

  it('falls back to "resume" when there is no name yet', () => {
    expect(resumeFileBaseName(createBlankResume())).toBe('resume');
  });
});
