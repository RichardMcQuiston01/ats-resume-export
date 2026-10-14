import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { checkResumeStructure } from './structuralCheck';

describe('checkResumeStructure', () => {
  it('reports no findings for the fully valid fixture resume', () => {
    expect(checkResumeStructure(createFixtureResume())).toStrictEqual([]);
  });

  it('reports a friendly error for an invalid email', () => {
    const resume = createFixtureResume();
    resume.contact.email = 'not-an-email';

    const findings = checkResumeStructure(resume);

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: 'contact.email',
        severity: 'error',
        message: expect.stringContaining('Contact — Email'),
      })
    );
  });

  it('labels a nested array field with its entry number', () => {
    const resume = createFixtureResume();
    const [firstJob] = resume.experience;
    if (!firstJob) {
      throw new Error('Fixture resume must have at least one job.');
    }
    resume.experience = [{ ...firstJob, startDate: 'not-a-date' }];

    const findings = checkResumeStructure(resume);

    expect(findings).toContainEqual(
      expect.objectContaining({
        id: 'experience.0.startDate',
        message: expect.stringContaining('Experience #1 — Start date'),
      })
    );
  });

  it('warns when the resume has no experience or education', () => {
    const findings = checkResumeStructure(createBlankResume());

    expect(findings).toContainEqual(
      expect.objectContaining({ id: 'content.empty', severity: 'warning' })
    );
  });

  it('notes a missing summary as informational', () => {
    const findings = checkResumeStructure(createBlankResume());

    expect(findings).toContainEqual(
      expect.objectContaining({ id: 'summary.missing', severity: 'info' })
    );
  });

  it('flags a highlight that still has a leading bullet character', () => {
    const resume = createFixtureResume();
    const [firstJob] = resume.experience;
    if (!firstJob) {
      throw new Error('Fixture resume must have at least one job.');
    }
    resume.experience = [
      {
        ...firstJob,
        highlights: ['- Led the checkout service migration to TypeScript.'],
      },
    ];

    const findings = checkResumeStructure(resume);

    expect(findings).toContainEqual(
      expect.objectContaining({ id: 'experience.0.highlights.0.bullet' })
    );
  });

  it('flags a highlight that looks too short', () => {
    const resume = createFixtureResume();
    const [firstJob] = resume.experience;
    if (!firstJob) {
      throw new Error('Fixture resume must have at least one job.');
    }
    resume.experience = [{ ...firstJob, highlights: ['Wrote code.'] }];

    const findings = checkResumeStructure(resume);

    expect(findings).toContainEqual(
      expect.objectContaining({ id: 'experience.0.highlights.0.short' })
    );
  });
});
