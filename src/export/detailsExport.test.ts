import { describe, expect, it } from 'vitest';

import { createFixtureResume } from '../resume';
import type { Resume } from '../types';
import type { ExportDetails } from './details';
import { exportResumeAsDocx } from './toDocx';
import { exportResumeAsHtml } from './toHtml';
import { exportResumeAsPdf } from './toPdf';
import { exportResumeAsPlainText } from './toPlainText';
import { docxXml, pdfText } from './testUtils';

function resumeWithLinks(): Resume {
  const resume = createFixtureResume();
  const [project] = resume.projects;
  const [certification] = resume.certifications;
  if (project) {
    project.url = 'https://hired-hand.example.com';
    project.demoUrl = 'https://demo.example.com/a&b';
  }
  if (certification) {
    certification.credentialUrl = 'https://verify.example.com/cert/42';
  }
  return resume;
}

const RESUME = resumeWithLinks();
const NONE: ExportDetails = {};
const BELOW: ExportDetails = {
  projectLinks: 'below',
  projectTechStack: 'below',
  projectOutcome: 'below',
  credentialUrl: 'below',
};
const HEADING: ExportDetails = {
  projectLinks: 'heading',
  projectTechStack: 'heading',
  credentialUrl: 'heading',
};

const LINK_LINE =
  'Link: https://hired-hand.example.com | Code: https://github.com/RichardMcQuiston01/hired-hand-resume-builder | Demo: https://demo.example.com/a&b';

describe('project and certification details, off by default', () => {
  it('leaves every format byte-identical when no details are requested', async () => {
    const withEmpty = { details: NONE };

    expect(exportResumeAsHtml(RESUME, withEmpty)).toBe(
      exportResumeAsHtml(RESUME)
    );
    expect(exportResumeAsPlainText(RESUME, withEmpty)).toBe(
      exportResumeAsPlainText(RESUME)
    );
    expect(await docxXml(await exportResumeAsDocx(RESUME, withEmpty))).toBe(
      await docxXml(await exportResumeAsDocx(RESUME))
    );
    expect(await pdfText(await exportResumeAsPdf(RESUME, withEmpty))).toBe(
      await pdfText(await exportResumeAsPdf(RESUME))
    );
  });

  it('does not print any of the details by default', () => {
    const text = exportResumeAsPlainText(RESUME);

    expect(text).not.toContain('Tech stack');
    expect(text).not.toContain('Outcome');
    expect(text).not.toContain('verify.example.com');
    expect(text).not.toContain('demo.example.com');
  });
});

describe('details placed below the heading', () => {
  it('appear as labelled lines in plain text, between description and bullets', () => {
    const text = exportResumeAsPlainText(RESUME, { details: BELOW });

    expect(text).toContain(
      [
        'Hired Hand: Resume Builder',
        'Chrome extension for building and exporting ATS-compatible resumes.',
        'Outcome: Exports ATS-checked resumes to five formats from one editor.',
        'Tech stack: TypeScript, React, Vite, Tailwind CSS',
        LINK_LINE,
      ].join('\n')
    );
    expect(text).toContain(
      'AWS Certified Solutions Architect – Associate - Amazon Web Services - 2023-05\nCredential: https://verify.example.com/cert/42'
    );
  });

  it('appear in HTML, with URLs as escaped links', () => {
    const html = exportResumeAsHtml(RESUME, { details: BELOW });

    expect(html).toContain(
      '<p>Outcome: Exports ATS-checked resumes to five formats from one editor.</p>'
    );
    expect(html).toContain(
      '<p>Tech stack: TypeScript, React, Vite, Tailwind CSS</p>'
    );
    expect(html).toContain(
      '<a href="https://demo.example.com/a&amp;b">https://demo.example.com/a&amp;b</a>'
    );
    expect(html).toContain(
      '<p>Credential: <a href="https://verify.example.com/cert/42">https://verify.example.com/cert/42</a></p>'
    );
  });

  it('appear in DOCX', async () => {
    const xml = await docxXml(
      await exportResumeAsDocx(RESUME, { details: BELOW })
    );

    expect(xml).toContain('Outcome: Exports ATS-checked resumes');
    expect(xml).toContain('Tech stack: TypeScript, React, Vite, Tailwind CSS');
    expect(xml).toContain('Demo: https://demo.example.com/a&amp;b');
    expect(xml).toContain('Credential: https://verify.example.com/cert/42');
  });

  it('appear in PDF', async () => {
    const text = await pdfText(
      await exportResumeAsPdf(RESUME, { details: BELOW })
    );

    expect(text).toContain('Outcome: Exports ATS-checked resumes');
    expect(text).toContain('Tech stack: TypeScript, React, Vite, Tailwind CSS');
    expect(text).toContain('Credential: https://verify.example.com/cert/42');
  });
});

describe('details placed on the heading line', () => {
  it('follow the project name and certification in every format', async () => {
    const heading =
      'Hired Hand: Resume Builder — TypeScript, React, Vite, Tailwind CSS — https://hired-hand.example.com';
    const text = exportResumeAsPlainText(RESUME, { details: HEADING });

    expect(text).toContain(heading.replaceAll(' — ', ' - '));
    expect(text).toContain('2023-05 - https://verify.example.com/cert/42');
    expect(
      await pdfText(await exportResumeAsPdf(RESUME, { details: HEADING }))
    ).toContain(heading);
    expect(
      await docxXml(await exportResumeAsDocx(RESUME, { details: HEADING }))
    ).toContain(
      ' — TypeScript, React, Vite, Tailwind CSS — https://hired-hand.example.com'
    );
    expect(exportResumeAsHtml(RESUME, { details: HEADING })).toContain(
      'Hired Hand: Resume Builder — TypeScript, React, Vite, Tailwind CSS — <a href="https://hired-hand.example.com">'
    );
  });

  it('adds nothing for outcome, which only goes below', () => {
    expect(exportResumeAsPlainText(RESUME, { details: HEADING })).not.toContain(
      'Outcome'
    );
  });
});

describe('each detail is independent', () => {
  it('turns on only the one asked for', () => {
    const text = exportResumeAsPlainText(RESUME, {
      details: { projectTechStack: 'below' },
    });

    expect(text).toContain('Tech stack: TypeScript');
    expect(text).not.toContain('Outcome');
    expect(text).not.toContain('Link:');
    expect(text).not.toContain('Credential');
  });
});

describe('invalid details', () => {
  it('fail loudly in every exporter', async () => {
    const bad = { details: { projectLinks: 'sideways' as never } };

    expect(() => exportResumeAsHtml(RESUME, bad)).toThrow(RangeError);
    expect(() => exportResumeAsPlainText(RESUME, bad)).toThrow(RangeError);
    await expect(exportResumeAsDocx(RESUME, bad)).rejects.toThrow(RangeError);
    await expect(exportResumeAsPdf(RESUME, bad)).rejects.toThrow(RangeError);
  });
});
