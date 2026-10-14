import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { exportResumeAsPlainText } from './toPlainText';

describe('exportResumeAsPlainText', () => {
  it('includes the name, contact info, and every section for the fixture resume', () => {
    const text = exportResumeAsPlainText(createFixtureResume());

    expect(text).toContain('Jordan Rivera');
    expect(text).toContain('jordan.rivera@example.com');
    expect(text).toContain('SUMMARY');
    expect(text).toContain('EXPERIENCE');
    expect(text).toContain('Acme Corp');
    expect(text).toContain(
      '- Led migration of the checkout service to TypeScript, cutting production incidents by 40%.'
    );
    expect(text).toContain('EDUCATION');
    expect(text).toContain('SKILLS');
    expect(text).toContain('Languages: TypeScript, Go, Python');
    expect(text).toContain('CERTIFICATIONS');
    expect(text).toContain('PROJECTS');
  });

  it('formats a date range with the job/degree heading', () => {
    const text = exportResumeAsPlainText(createFixtureResume());

    expect(text).toContain(
      'Senior Software Engineer - Acme Corp, Remote (2022-03 - Present)'
    );
  });

  it('omits empty sections for a blank resume', () => {
    const text = exportResumeAsPlainText(createBlankResume());

    expect(text).toContain('Resume');
    expect(text).not.toContain('SUMMARY');
    expect(text).not.toContain('EXPERIENCE');
    expect(text).not.toContain('EDUCATION');
    expect(text).not.toContain('SKILLS');
    expect(text).not.toContain('CERTIFICATIONS');
    expect(text).not.toContain('PROJECTS');
  });

  it('ends with a single trailing newline and no leading/trailing whitespace noise', () => {
    const text = exportResumeAsPlainText(createFixtureResume());

    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
    expect(text.startsWith('\n')).toBe(false);
  });
});
