import { describe, expect, it } from 'vitest';

import { createFixtureResume } from '../resume';
import type { Resume } from '../types';
import { exportResumeAsDocx } from './toDocx';
import { exportResumeAsHtml } from './toHtml';
import { exportResumeAsPdf } from './toPdf';
import { exportResumeAsPlainText } from './toPlainText';
import {
  docxXml,
  pdfFirstTextOrigin,
  pdfPageInfo,
  pdfTextRuns,
} from './testUtils';

/** A resume long enough to span several pages, so spacing changes show up as page counts. */
function longResume(): Resume {
  const resume = createFixtureResume();
  const [entry] = resume.experience;
  if (entry) {
    entry.highlights = Array.from(
      { length: 150 },
      (_, index) =>
        `Delivered improvement number ${index + 1} across the platform, working with several teams to reduce cost and improve reliability.`
    );
  }
  return resume;
}

const FIXTURE = createFixtureResume();

describe('the built-in look is unchanged', () => {
  it('HTML is identical with no style, the standard preset, or an empty style', () => {
    const base = exportResumeAsHtml(FIXTURE);

    expect(exportResumeAsHtml(FIXTURE, { style: 'standard' })).toBe(base);
    expect(exportResumeAsHtml(FIXTURE, { style: {} })).toBe(base);
    expect(base).not.toContain('style options');
  });

  it('DOCX content and styles are identical with the standard preset', async () => {
    const plain = await exportResumeAsDocx(FIXTURE);
    const standard = await exportResumeAsDocx(FIXTURE, { style: 'standard' });

    for (const part of ['word/document.xml', 'word/styles.xml']) {
      expect(await docxXml(standard, part)).toBe(await docxXml(plain, part));
    }
  });

  it('PDF text, fonts, and page size are identical with the standard preset', async () => {
    const plain = await exportResumeAsPdf(FIXTURE);
    const standard = await exportResumeAsPdf(FIXTURE, { style: 'standard' });

    expect(await pdfTextRuns(standard)).toStrictEqual(await pdfTextRuns(plain));
    expect(await pdfPageInfo(standard)).toStrictEqual(await pdfPageInfo(plain));
  });

  it('plain text ignores style entirely', () => {
    expect(exportResumeAsPlainText(FIXTURE, { style: 'comfortable' })).toBe(
      exportResumeAsPlainText(FIXTURE)
    );
  });
});

describe('HTML style', () => {
  const html = exportResumeAsHtml(FIXTURE, {
    style: {
      fontFamily: 'serif',
      fontSize: 12,
      lineSpacing: 1.5,
      margin: 54,
      pageSize: 'a4',
      headingCase: 'title',
      sectionSpacing: 20,
      entrySpacing: 8,
    },
  });

  it('applies font, size, and line spacing to the body', () => {
    expect(html).toContain('font-family: "Times New Roman", Times, serif');
    expect(html).toContain('font-size: 12pt');
    expect(html).toContain('line-height: 1.5');
  });

  it('applies margins to screen and print, and the paper size', () => {
    expect(html).toContain('padding: 0 54pt');
    expect(html).toContain('@page { size: A4; margin: 54pt; }');
  });

  it('applies heading case and block spacing', () => {
    expect(html).toContain('text-transform: none');
    expect(html).toContain('margin-top: 20pt');
    expect(html).toContain('.entry { margin-top: 8pt; }');
  });

  it('appends the overrides after the built-in rules so they win', () => {
    expect(html.indexOf('style options')).toBeGreaterThan(
      html.indexOf('.entry-dates { color')
    );
  });

  it('uses a monospace stack for the monospace family', () => {
    expect(
      exportResumeAsHtml(FIXTURE, { style: { fontFamily: 'monospace' } })
    ).toContain('"Courier New", Courier, monospace');
  });
});

describe('DOCX style', () => {
  const style = {
    fontFamily: 'serif',
    fontSize: 12,
    lineSpacing: 1.5,
    margin: 54,
    pageSize: 'a4',
    headingCase: 'title',
    sectionSpacing: 20,
  } as const;

  it('sets the document font, size, and line spacing', async () => {
    const styles = await docxXml(
      await exportResumeAsDocx(FIXTURE, { style }),
      'word/styles.xml'
    );

    expect(styles).toContain('w:ascii="Times New Roman"');
    expect(styles).toMatch(/<w:sz w:val="24"\/>/);
    expect(styles).toContain('w:line="360"');
  });

  it('sets the margins and the paper size', async () => {
    const xml = await docxXml(await exportResumeAsDocx(FIXTURE, { style }));

    expect(xml).toContain('w:top="1080"');
    expect(xml).toContain('w:left="1080"');
    expect(xml).toMatch(/<w:pgSz w:w="11906" w:h="16838"/);
  });

  it('writes headings as typed for title case and spaces them', async () => {
    const xml = await docxXml(await exportResumeAsDocx(FIXTURE, { style }));

    expect(xml).toContain('>Experience<');
    expect(xml).not.toContain('>EXPERIENCE<');
    expect(xml).toContain('w:before="400"');
  });

  it('keeps the headings in capitals by default', async () => {
    const xml = await docxXml(await exportResumeAsDocx(FIXTURE));

    expect(xml).toContain('>EXPERIENCE<');
  });

  it('sizes the name and headings from the body size', async () => {
    const xml = await docxXml(
      await exportResumeAsDocx(FIXTURE, { style: { fontSize: 12 } })
    );

    expect(xml).toMatch(/<w:sz w:val="43"\/>/);
    expect(xml).toMatch(/<w:sz w:val="24"\/>/);
  });
});

describe('PDF style', () => {
  it('uses the Times family for serif, including bold and italic', async () => {
    const runs = await pdfTextRuns(
      await exportResumeAsPdf(
        { ...FIXTURE, summary: FIXTURE.summary },
        { style: { fontFamily: 'serif' }, richText: true }
      )
    );
    const fonts = new Set(runs.map((run) => run.font));

    expect(fonts.has('Times-Roman')).toBe(true);
    expect(fonts.has('Times-Bold')).toBe(true);
    expect([...fonts].some((font) => font.startsWith('Helvetica'))).toBe(false);
  });

  it('uses the Courier family for monospace', async () => {
    const runs = await pdfTextRuns(
      await exportResumeAsPdf(FIXTURE, { style: { fontFamily: 'monospace' } })
    );

    expect(new Set(runs.map((run) => run.font))).toStrictEqual(
      new Set(['Courier', 'Courier-Bold'])
    );
  });

  it('draws headings as typed for title case', async () => {
    const runs = await pdfTextRuns(
      await exportResumeAsPdf(FIXTURE, { style: { headingCase: 'title' } })
    );
    const texts = runs.map((run) => run.text);

    expect(texts).toContain('Experience');
    expect(texts).not.toContain('EXPERIENCE');
  });

  it('switches paper size', async () => {
    const letter = await pdfPageInfo(await exportResumeAsPdf(FIXTURE));
    const a4 = await pdfPageInfo(
      await exportResumeAsPdf(FIXTURE, { style: { pageSize: 'a4' } })
    );

    expect([letter.width, letter.height]).toStrictEqual([612, 792]);
    expect(a4.width).toBeCloseTo(595.28, 1);
    expect(a4.height).toBeCloseTo(841.89, 1);
  });

  it('uses more pages for roomier spacing and larger text', async () => {
    const resume = longResume();
    const pages = async (
      style: Parameters<typeof exportResumeAsPdf>[1]
    ): Promise<number> =>
      (await pdfPageInfo(await exportResumeAsPdf(resume, style))).count;

    const compact = await pages({ style: 'compact' });
    const standard = await pages({});
    const comfortable = await pages({ style: 'comfortable' });

    expect(compact).toBeLessThan(standard);
    expect(standard).toBeLessThan(comfortable);
    expect(await pages({ style: { fontSize: 14 } })).toBeGreaterThan(standard);
    expect(await pages({ style: { lineSpacing: 1.8 } })).toBeGreaterThan(
      standard
    );
  });

  it('places the first line inside the requested margin', async () => {
    const standard = await pdfFirstTextOrigin(await exportResumeAsPdf(FIXTURE));
    const wide = await pdfFirstTextOrigin(
      await exportResumeAsPdf(FIXTURE, { style: { margin: 100 } })
    );

    expect(standard).toStrictEqual({ x: 54, y: 720 });
    expect(wide).toStrictEqual({ x: 100, y: 674 });
  });

  it('keeps text extractable and in section order with a style applied', async () => {
    const runs = await pdfTextRuns(
      await exportResumeAsPdf(
        { ...FIXTURE, sectionOrder: ['skills', 'experience'] },
        { style: 'comfortable' }
      )
    );
    const texts = runs.map((run) => run.text);

    expect(texts.indexOf('SKILLS')).toBeLessThan(texts.indexOf('EXPERIENCE'));
    expect(texts).toContain('Jordan Rivera');
  });
});

describe('invalid styles', () => {
  const bad = { style: { fontSize: 99 } } as const;

  it('are rejected by every styled exporter with a descriptive message', async () => {
    const message =
      /Invalid export style: fontSize 99 is outside the supported range of 8 to 16\./;

    expect(() => exportResumeAsHtml(FIXTURE, bad)).toThrow(message);
    await expect(exportResumeAsDocx(FIXTURE, bad)).rejects.toThrow(message);
    await expect(exportResumeAsPdf(FIXTURE, bad)).rejects.toThrow(message);
  });
});
