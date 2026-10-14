import { describe, expect, it } from 'vitest';

import { createFixtureResume } from '../resume';
import type { Resume, SectionKey } from '../types';
import { exportResumeAsDocx } from './toDocx';
import { exportResumeAsHtml } from './toHtml';
import { exportResumeAsPdf } from './toPdf';
import { exportResumeAsPlainText } from './toPlainText';
import { docxXml, orderOf, pdfText } from './testUtils';

const REVERSED: SectionKey[] = [
  'projects',
  'certifications',
  'skills',
  'education',
  'experience',
];
const DEFAULT: SectionKey[] = [
  'experience',
  'education',
  'skills',
  'certifications',
  'projects',
];

function withOrder(sectionOrder?: SectionKey[]): Resume {
  const resume = createFixtureResume();
  resume.sectionOrder = sectionOrder;
  return resume;
}

function headingOrder(
  text: string,
  format: (key: SectionKey) => string
): SectionKey[] {
  const markers = DEFAULT.map(format);
  return orderOf(text, markers).map(
    (marker) => DEFAULT[markers.indexOf(marker)] as SectionKey
  );
}

describe('section order', () => {
  describe('HTML', () => {
    const headings = (html: string): SectionKey[] =>
      headingOrder(
        html,
        (key) => `<h2>${key[0]?.toUpperCase()}${key.slice(1)}</h2>`
      );

    it('renders the default order when none is set', () => {
      expect(headings(exportResumeAsHtml(withOrder()))).toStrictEqual(DEFAULT);
    });

    it('follows the resume sectionOrder', () => {
      expect(headings(exportResumeAsHtml(withOrder(REVERSED)))).toStrictEqual(
        REVERSED
      );
    });

    it('keeps the summary ahead of every reorderable section', () => {
      const html = exportResumeAsHtml(withOrder(REVERSED));

      expect(html.indexOf('<h2>Summary</h2>')).toBeLessThan(
        html.indexOf('<h2>Projects</h2>')
      );
    });
  });

  describe('plain text', () => {
    const headings = (text: string): SectionKey[] =>
      headingOrder(text, (key) => `\n${key.toUpperCase()}\n`);

    it('renders the default order when none is set', () => {
      expect(headings(exportResumeAsPlainText(withOrder()))).toStrictEqual(
        DEFAULT
      );
    });

    it('follows the resume sectionOrder', () => {
      expect(
        headings(exportResumeAsPlainText(withOrder(REVERSED)))
      ).toStrictEqual(REVERSED);
    });

    it('places sections a partial order leaves out after the listed ones', () => {
      const text = exportResumeAsPlainText(withOrder(['projects']));

      expect(headings(text)).toStrictEqual([
        'projects',
        'experience',
        'education',
        'skills',
        'certifications',
      ]);
    });
  });

  describe('DOCX', () => {
    const headings = async (resume: Resume): Promise<SectionKey[]> =>
      headingOrder(
        await docxXml(await exportResumeAsDocx(resume)),
        (key) => `>${key.toUpperCase()}<`
      );

    it('renders the default order when none is set', async () => {
      expect(await headings(withOrder())).toStrictEqual(DEFAULT);
    });

    it('follows the resume sectionOrder', async () => {
      expect(await headings(withOrder(REVERSED))).toStrictEqual(REVERSED);
    });
  });

  describe('PDF', () => {
    const headings = async (resume: Resume): Promise<SectionKey[]> => {
      const text = await pdfText(await exportResumeAsPdf(resume));
      return headingOrder(text, (key) => `\n${key.toUpperCase()}\n`);
    };

    it('renders the default order when none is set', async () => {
      expect(await headings(withOrder())).toStrictEqual(DEFAULT);
    });

    it('follows the resume sectionOrder', async () => {
      expect(await headings(withOrder(REVERSED))).toStrictEqual(REVERSED);
    });
  });
});
