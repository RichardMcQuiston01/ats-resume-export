import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

import { parseMarkdownRuns, type RichTextRun } from '../richText';
import { resolveSectionOrder } from '../sections';
import type { Resume, SectionKey } from '../types';
import { formatDateRange } from './formatDateRange';
import type { ExportOptions } from './options';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const NAME_SIZE = 18;
const HEADING_SIZE = 10;
const BODY_SIZE = 10;
const LINE_HEIGHT_RATIO = 1.25;
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

  constructor(private readonly doc: PDFDocument) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(height: number): void {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
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
      CONTENT_WIDTH - indent
    );
    const lineHeight = options.size * LINE_HEIGHT_RATIO;

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x: MARGIN + indent,
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
    const maxWidth = CONTENT_WIDTH - indent;
    const lineHeight = size * LINE_HEIGHT_RATIO;
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
      let x = MARGIN + indent;
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
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = richText
    ? await doc.embedFont(StandardFonts.HelveticaOblique)
    : regularFont;
  const runFonts: RunFonts = {
    regular: regularFont,
    bold: boldFont,
    italic: italicFont,
  };
  const writer = new PdfWriter(doc);
  const { contact } = resume;

  writer.writeText(contact.fullName || 'Resume', {
    size: NAME_SIZE,
    font: boldFont,
    gapAfter: 2,
  });

  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join('   |   ');
  if (contactLine) {
    writer.writeText(contactLine, {
      size: BODY_SIZE,
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
        size: BODY_SIZE,
        font: regularFont,
        gapAfter: 4,
      });
    }
  }

  const writeSectionHeading = (text: string): void => {
    writer.writeSpacer(6);
    writer.writeText(text.toUpperCase(), {
      size: HEADING_SIZE,
      font: boldFont,
      gapAfter: 4,
    });
  };

  const writeEntryHeading = (heading: string, dateRange: string): void => {
    const text = dateRange ? `${heading}   (${dateRange})` : heading;
    writer.writeText(text, { size: BODY_SIZE, font: boldFont, gapAfter: 1 });
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
          { size: BODY_SIZE, fonts: runFonts, indent: 10 }
        );
      } else {
        writer.writeText(`• ${highlight}`, {
          size: BODY_SIZE,
          font: regularFont,
          indent: 10,
        });
      }
    }
    writer.writeSpacer(4);
  };

  if (resume.summary) {
    writeSectionHeading('Summary');
    writer.writeText(resume.summary, {
      size: BODY_SIZE,
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
              size: BODY_SIZE,
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
            size: BODY_SIZE,
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
            size: BODY_SIZE,
            font: boldFont,
            gapAfter: 1,
          });
          if (entry.description) {
            writer.writeText(entry.description, {
              size: BODY_SIZE,
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
