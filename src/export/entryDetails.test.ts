import { describe, expect, it } from 'vitest';

import { createFixtureResume } from '../resume';
import type { Resume } from '../types';
import { exportResumeAsDocx } from './toDocx';
import { exportResumeAsHtml } from './toHtml';
import { exportResumeAsPdf } from './toPdf';
import { exportResumeAsPlainText } from './toPlainText';
import { docxXml, pdfText } from './testUtils';

function resumeWith(change: (resume: Resume) => void): Resume {
  const resume = createFixtureResume();
  change(resume);
  return resume;
}

const WITH_LOCATION = resumeWith((resume) => {
  const [job] = resume.experience;
  const [school] = resume.education;
  if (job) {
    job.location = 'Remote';
  }
  if (school) {
    school.location = 'Austin, TX';
  }
});

const WITHOUT_LOCATION = resumeWith((resume) => {
  for (const entry of [...resume.experience, ...resume.education]) {
    entry.location = undefined;
  }
});

const GRADUATION_ONLY = resumeWith((resume) => {
  const [school] = resume.education;
  if (school) {
    school.startDate = undefined;
    school.endDate = '2018-05';
    school.isCurrent = false;
  }
});

describe('entry locations', () => {
  it('appear after the job and school names in HTML', () => {
    const html = exportResumeAsHtml(WITH_LOCATION);

    expect(html).toContain('Senior Software Engineer — Acme Corp, Remote');
    expect(html).toMatch(/University of Texas at Austin, Austin, TX/);
  });

  it('appear in plain text', () => {
    expect(exportResumeAsPlainText(WITH_LOCATION)).toContain(
      'Senior Software Engineer - Acme Corp, Remote (2022-03 - Present)'
    );
  });

  it('appear in DOCX', async () => {
    const xml = await docxXml(await exportResumeAsDocx(WITH_LOCATION));

    expect(xml).toContain('Senior Software Engineer — Acme Corp, Remote');
  });

  it('appear in PDF', async () => {
    const text = await pdfText(await exportResumeAsPdf(WITH_LOCATION));

    expect(text).toContain('Senior Software Engineer — Acme Corp, Remote');
  });

  it('leave the heading exactly as before when an entry has none', async () => {
    expect(exportResumeAsHtml(WITHOUT_LOCATION)).toContain(
      'Senior Software Engineer — Acme Corp</span>'
    );
    expect(exportResumeAsPlainText(WITHOUT_LOCATION)).toContain(
      'Senior Software Engineer - Acme Corp (2022-03 - Present)'
    );
    expect(
      await docxXml(await exportResumeAsDocx(WITHOUT_LOCATION))
    ).not.toContain('Acme Corp,');
  });
});

describe('an entry with only one date', () => {
  it('shows just that date, with no dangling separator, in every format', async () => {
    const html = exportResumeAsHtml(GRADUATION_ONLY);
    const text = exportResumeAsPlainText(GRADUATION_ONLY);
    const docx = await docxXml(await exportResumeAsDocx(GRADUATION_ONLY));
    const pdf = await pdfText(await exportResumeAsPdf(GRADUATION_ONLY));

    expect(html).toContain('<span class="entry-dates">2018-05</span>');
    expect(text).toContain('(2018-05)');
    expect(docx).toContain('(2018-05)');
    expect(pdf).toContain('(2018-05)');
    for (const output of [html, text, docx, pdf]) {
      expect(output).not.toContain('( - ');
      expect(output).not.toContain('>- 2018-05');
    }
  });
});
