import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

import { parseMarkdownRuns, type RichTextRun } from '../richText';
import { resolveSectionOrder } from '../sections';
import type { Resume, SectionKey } from '../types';
import { formatDateRange } from './formatDateRange';
import type { ExportOptions } from './options';
import { resolveExportStyle, type FontFamily, type PageSize } from './style';

/** Page sizes in points: US Letter and ISO A4. */
const PDF_PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
};
const DEFAULT_MARGIN = 54;
const DEFAULT_NAME_SIZE = 18;
const DEFAULT_HEADING_SIZE = 10;
const DEFAULT_BODY_SIZE = 10;
const DEFAULT_LINE_HEIGHT_RATIO = 1.25;
const DEFAULT_SECTION_SPACING = 6;
const DEFAULT_ENTRY_SPACING = 4;

/** Standard-14 PDF fonts for each family: every PDF reader has them built in. */
const PDF_FONTS: Record<
  FontFamily,
  { regular: StandardFonts; bold: StandardFonts; italic: StandardFonts }
> = {
  'sans-serif': {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
  },
  serif: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
  },
  monospace: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
  },
};

interface PageLayout {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  lineHeightRatio: number;
}

const TEXT_COLOR = rgb(0.12, 0.16, 0.22);

interface WriteTextOptions {
  size: number;
  font: PDFFont;
  indent?: number;
  gapAfter?: number;
}

interface RunFonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface WriteRunsOptions {
  size: number;
  fonts: RunFonts;
  indent?: number;
  gapAfter?: number;
}

/** A piece of a word in one font; a word may span several styled segments. */
interface WordSegment {
  text: string;
  font: PDFFont;
}

/** Wraps and paginates plain-text content onto US-Letter PDF pages. */
class PdfWriter {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly layout: PageLayout
  ) {
    this.page = doc.addPage([layout.pageWidth, layout.pageHeight]);
    this.y = layout.pageHeight - layout.margin;
  }

  private get contentWidth(): number {
    return this.layout.pageWidth - this.layout.margin * 2;
  }

  private ensureSpace(height: number): void {
    if (this.y - height < this.layout.margin) {
      this.page = this.doc.addPage([
        this.layout.pageWidth,
        this.layout.pageHeight,
      ]);
      this.y = this.layout.pageHeight - this.layout.margin;
    }
  }

  private wrapLines(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number
  ): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
  }

  writeText(text: string, options: WriteTextOptions): void {
    const indent = options.indent ?? 0;
    const lines = this.wrapLines(
      text,
      options.font,
      options.size,
      this.contentWidth - indent
    );
    const lineHeight = options.size * this.layout.lineHeightRatio;

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x: this.layout.margin + indent,
        y: this.y - options.size,
        size: options.size,
        font: options.font,
        color: TEXT_COLOR,
      });
      this.y -= lineHeight;
    }

    this.y -= options.gapAfter ?? 0;
  }

  /**
   * Word-wraps a paragraph made of differently styled runs. pdf-lib's drawText
   * places one same-font string at a time, so styled words are laid out by hand.
   * Text that touches across a run boundary (e.g. "**30%**!") stays one word.
   */
  writeRuns(runs: RichTextRun[], options: WriteRunsOptions): void {
    const { size, fonts } = options;
    const indent = options.indent ?? 0;
    const maxWidth = this.contentWidth - indent;
    const lineHeight = size * this.layout.lineHeightRatio;
    const spaceWidth = fonts.regular.widthOfTextAtSize(' ', size);

    const words: WordSegment[][] = [];
    let current: WordSegment[] = [];
    for (const run of runs) {
      const font = run.bold
        ? fonts.bold
        : run.italic
          ? fonts.italic
          : fonts.regular;
      for (const token of run.text.split(/(\s+)/)) {
        if (token.length === 0) {
          continue;
        }
        if (/^\s+$/.test(token)) {
          if (current.length > 0) {
            words.push(current);
            current = [];
          }
        } else {
          current.push({ text: token, font });
        }
      }
    }
    if (current.length > 0) {
      words.push(current);
    }

    const widthOf = (word: WordSegment[]): number =>
      word.reduce(
        (total, segment) =>
          total + segment.font.widthOfTextAtSize(segment.text, size),
        0
      );

    let line: WordSegment[][] = [];
    let lineWidth = 0;
    const flushLine = (): void => {
      if (line.length === 0) {
        return;
      }
      this.ensureSpace(lineHeight);
      let x = this.layout.margin + indent;
      for (const word of line) {
        for (const segment of word) {
          this.page.drawText(segment.text, {
            x,
            y: this.y - size,
            size,
            font: segment.font,
            color: TEXT_COLOR,
          });
          x += segment.font.widthOfTextAtSize(segment.text, size);
        }
        x += spaceWidth;
      }
      this.y -= lineHeight;
      line = [];
      lineWidth = 0;
    };

    for (const word of words) {
      const wordWidth = widthOf(word);
      const needed = (line.length > 0 ? spaceWidth : 0) + wordWidth;
      if (line.length > 0 && lineWidth + needed > maxWidth) {
        flushLine();
      }
      lineWidth += (line.length > 0 ? spaceWidth : 0) + wordWidth;
      line.push(word);
    }
    flushLine();

    this.y -= options.gapAfter ?? 0;
  }

  writeSpacer(height: number): void {
    this.ensureSpace(height);
    this.y -= height;
  }
}

/** Renders a resume as a text-based (extractable, ATS-readable) PDF. */
export async function exportResumeAsPdf(
  resume: Resume,
  options: ExportOptions = {}
): Promise<Blob> {
  const richText = options.richText ?? false;
  const doc = await PDFDocument.create();
  const style = resolveExportStyle(options.style);
  const fonts = PDF_FONTS[style.fontFamily ?? 'sans-serif'];
  const regularFont = await doc.embedFont(fonts.regular);
  const boldFont = await doc.embedFont(fonts.bold);
  const italicFont = richText ? await doc.embedFont(fonts.italic) : regularFont;
  const nameSize = style.nameFontSize ?? DEFAULT_NAME_SIZE;
  const headingSize = style.headingFontSize ?? DEFAULT_HEADING_SIZE;
  const bodySize = style.fontSize ?? DEFAULT_BODY_SIZE;
  const sectionSpacing = style.sectionSpacing ?? DEFAULT_SECTION_SPACING;
  const entrySpacing = style.entrySpacing ?? DEFAULT_ENTRY_SPACING;
  const pageSize = PDF_PAGE_SIZES[style.pageSize ?? 'letter'];
  const runFonts: RunFonts = {
    regular: regularFont,
    bold: boldFont,
    italic: italicFont,
  };
  const writer = new PdfWriter(doc, {
    pageWidth: pageSize.width,
    pageHeight: pageSize.height,
    margin: style.margin ?? DEFAULT_MARGIN,
    lineHeightRatio: style.lineSpacing ?? DEFAULT_LINE_HEIGHT_RATIO,
  });
  const { contact } = resume;

  writer.writeText(contact.fullName || 'Resume', {
    size: nameSize,
    font: boldFont,
    gapAfter: 2,
  });

  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join('   |   ');
  if (contactLine) {
    writer.writeText(contactLine, {
      size: bodySize,
      font: regularFont,
      gapAfter: 2,
    });
  }

  if (contact.links.length > 0) {
    const linksLine = contact.links
      .map((link) => link.url || link.label)
      .filter(Boolean)
      .join('   |   ');
    if (linksLine) {
      writer.writeText(linksLine, {
        size: bodySize,
        font: regularFont,
        gapAfter: 4,
      });
    }
  }

  const writeSectionHeading = (text: string): void => {
    writer.writeSpacer(sectionSpacing);
    writer.writeText(
      style.headingCase === 'title' ? text : text.toUpperCase(),
      {
        size: headingSize,
        font: boldFont,
        gapAfter: 4,
      }
    );
  };

  const writeEntryHeading = (heading: string, dateRange: string): void => {
    const text = dateRange ? `${heading}   (${dateRange})` : heading;
    writer.writeText(text, { size: bodySize, font: boldFont, gapAfter: 1 });
  };

  const writeHighlights = (highlights: string[]): void => {
    for (const highlight of highlights) {
      if (!highlight.trim()) {
        continue;
      }
      if (richText) {
        writer.writeRuns(
          [
            { text: '• ', bold: false, italic: false },
            ...parseMarkdownRuns(highlight),
          ],
          { size: bodySize, fonts: runFonts, indent: 10 }
        );
      } else {
        writer.writeText(`• ${highlight}`, {
          size: bodySize,
          font: regularFont,
          indent: 10,
        });
      }
    }
    writer.writeSpacer(entrySpacing);
  };

  if (resume.summary) {
    writeSectionHeading('Summary');
    writer.writeText(resume.summary, {
      size: bodySize,
      font: regularFont,
      gapAfter: 2,
    });
  }

  const sectionBuilders: Record<SectionKey, () => void> = {
    experience: () => {
      if (resume.experience.length > 0) {
        writeSectionHeading('Experience');
        for (const entry of resume.experience) {
          const heading = [entry.title, entry.company]
            .filter(Boolean)
            .join(' — ');
          writeEntryHeading(
            heading,
            formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)
          );
          writeHighlights(entry.highlights);
        }
      }
    },
    education: () => {
      if (resume.education.length > 0) {
        writeSectionHeading('Education');
        for (const entry of resume.education) {
          const heading = [entry.credential, entry.institution]
            .filter(Boolean)
            .join(' — ');
          writeEntryHeading(
            heading,
            formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)
          );
          writeHighlights(entry.highlights);
        }
      }
    },
    skills: () => {
      if (resume.skills.length > 0) {
        writeSectionHeading('Skills');
        for (const group of resume.skills) {
          const skillsLine = group.skills.filter(Boolean).join(', ');
          if (skillsLine) {
            writer.writeText(`${group.category}: ${skillsLine}`, {
              size: bodySize,
              font: regularFont,
            });
          }
        }
      }
    },
    certifications: () => {
      if (resume.certifications.length > 0) {
        writeSectionHeading('Certifications');
        for (const entry of resume.certifications) {
          const parts = [entry.name, entry.issuer, entry.issueDate].filter(
            Boolean
          );
          writer.writeText(parts.join(' — '), {
            size: bodySize,
            font: regularFont,
          });
        }
      }
    },
    projects: () => {
      if (resume.projects.length > 0) {
        writeSectionHeading('Projects');
        for (const entry of resume.projects) {
          writer.writeText(entry.name, {
            size: bodySize,
            font: boldFont,
            gapAfter: 1,
          });
          if (entry.description) {
            writer.writeText(entry.description, {
              size: bodySize,
              font: regularFont,
            });
          }
          writeHighlights(entry.highlights);
        }
      }
    },
  };
  for (const key of resolveSectionOrder(resume)) {
    sectionBuilders[key]();
  }

  const bytes = await doc.save();
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  return new Blob([arrayBuffer], { type: 'application/pdf' });
}
