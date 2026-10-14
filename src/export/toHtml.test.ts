import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { exportResumeAsHtml } from './toHtml';

describe('exportResumeAsHtml', () => {
  it('produces a standalone HTML document with every section', () => {
    const html = exportResumeAsHtml(createFixtureResume());

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Jordan Rivera</title>');
    expect(html).toContain('<h1>Jordan Rivera</h1>');
    expect(html).toContain('<h2>Summary</h2>');
    expect(html).toContain('<h2>Experience</h2>');
    expect(html).toContain('<h2>Education</h2>');
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).toContain('<h2>Certifications</h2>');
    expect(html).toContain('<h2>Projects</h2>');
  });

  it('escapes user content instead of injecting raw HTML', () => {
    const resume = createFixtureResume();
    const [firstJob] = resume.experience;
    if (!firstJob) {
      throw new Error('Fixture resume must have at least one job.');
    }
    resume.experience = [
      { ...firstJob, highlights: ['<script>alert("x")</script> & "quoted"'] },
    ];

    const html = exportResumeAsHtml(resume);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &quot;quoted&quot;'
    );
  });

  it('omits section headings for empty sections on a blank resume', () => {
    const html = exportResumeAsHtml(createBlankResume());

    expect(html).toContain('<title>Resume</title>');
    expect(html).not.toContain('<h2>Summary</h2>');
    expect(html).not.toContain('<h2>Experience</h2>');
    expect(html).not.toContain('<h2>Education</h2>');
    expect(html).not.toContain('<h2>Skills</h2>');
    expect(html).not.toContain('<h2>Certifications</h2>');
    expect(html).not.toContain('<h2>Projects</h2>');
  });
});
