import { describe, expect, it } from 'vitest';

import { createFixtureResume } from '../resume';
import type { Resume } from '../types';
import { exportResumeAsDocx } from './toDocx';
import { exportResumeAsHtml } from './toHtml';
import { exportResumeAsPdf } from './toPdf';
import { exportResumeAsPlainText } from './toPlainText';
import { docxXml, pdfText, pdfTextRuns } from './testUtils';

const MARKED = 'Cut costs by **30%**! using *caching* daily';

function withHighlight(highlight: string = MARKED): Resume {
  const resume = createFixtureResume();
  const [entry] = resume.experience;
  if (entry) {
    entry.highlights = [highlight];
  }
  return resume;
}

describe('rich-text highlights', () => {
  describe('HTML', () => {
    it('renders bold and italic as <strong> and <em> when enabled', () => {
      const html = exportResumeAsHtml(withHighlight(), { richText: true });

      expect(html).toContain(
        '<li>Cut costs by <strong>30%</strong>! using <em>caching</em> daily</li>'
      );
    });

    it('escapes HTML inside styled runs', () => {
      const html = exportResumeAsHtml(withHighlight('use **<script>**'), {
        richText: true,
      });

      expect(html).toContain('<strong>&lt;script&gt;</strong>');
    });

    it('leaves the markers as typed by default', () => {
      const html = exportResumeAsHtml(withHighlight());

      expect(html).toContain(`<li>${MARKED}</li>`);
      expect(html).not.toContain('<strong>30%');
    });
  });

  describe('plain text', () => {
    it('strips the markers when enabled', () => {
      const text = exportResumeAsPlainText(withHighlight(), { richText: true });

      expect(text).toContain('- Cut costs by 30%! using caching daily');
    });

    it('leaves the markers as typed by default', () => {
      expect(exportResumeAsPlainText(withHighlight())).toContain(`- ${MARKED}`);
    });
  });

  describe('DOCX', () => {
    it('writes styled runs when enabled', async () => {
      const xml = await docxXml(
        await exportResumeAsDocx(withHighlight(), { richText: true })
      );

      expect(xml).toMatch(/<w:b\/><w:bCs\/>[^]*?<w:t[^>]*>30%<\/w:t>/);
      expect(xml).toMatch(/<w:i\/><w:iCs\/>[^]*?<w:t[^>]*>caching<\/w:t>/);
      expect(xml).not.toContain('**');
    });

    it('keeps the markers as typed by default', async () => {
      const xml = await docxXml(await exportResumeAsDocx(withHighlight()));

      expect(xml).toContain('**30%**');
    });
  });

  describe('PDF', () => {
    it('draws bold and italic words in their own fonts when enabled', async () => {
      const runs = await pdfTextRuns(
        await exportResumeAsPdf(withHighlight(), { richText: true })
      );
      const fontOf = (word: string): string | undefined =>
        runs.find((run) => run.text === word)?.font;

      expect(fontOf('30%')).toBe('Helvetica-Bold');
      expect(fontOf('caching')).toBe('Helvetica-Oblique');
      expect(fontOf('Cut')).toBe('Helvetica');
    });

    it('draws punctuation touching a styled word directly after it', async () => {
      const runs = await pdfTextRuns(
        await exportResumeAsPdf(withHighlight(), { richText: true })
      );
      const index = runs.findIndex((run) => run.text === '30%');

      expect(runs[index + 1]?.text).toBe('!');
    });

    it('does not draw the markers when enabled', async () => {
      const text = await pdfText(
        await exportResumeAsPdf(withHighlight(), { richText: true })
      );

      expect(text).not.toContain('**');
    });

    it('keeps the markers as typed by default', async () => {
      const text = await pdfText(await exportResumeAsPdf(withHighlight()));

      expect(text).toContain('**30%**!');
    });

    it('wraps a long styled highlight across lines without throwing', async () => {
      const long = `${'**bold** and *italic* words '.repeat(40)}end`;
      const text = await pdfText(
        await exportResumeAsPdf(withHighlight(long), { richText: true })
      );

      expect(text).toContain('end');
    });
  });
});
