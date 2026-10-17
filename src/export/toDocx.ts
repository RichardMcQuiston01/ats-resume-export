import {
  Document,
  type IStylesOptions,
  type ISectionPropertiesOptions,
  HeadingLevel,
  LineRuleType,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

import { parseMarkdownRuns } from '../richText';
import { resolveSectionOrder } from '../sections';
import type { Resume, SectionKey } from '../types';
import {
  certificationExtras,
  projectExtras,
  resolveExportDetails,
} from './details';
import { entryHeading } from './entryHeading';
import { formatDateRange } from './formatDateRange';
import type { ExportOptions } from './options';
import {
  resolveExportStyle,
  type FontFamily,
  type PageSize,
  type ResolvedExportStyle,
} from './style';

/** Font names every Word install has; Word substitutes closely if one is missing. */
const DOCX_FONT_NAMES: Record<FontFamily, string> = {
  'sans-serif': 'Arial',
  serif: 'Times New Roman',
  monospace: 'Courier New',
};

/** Page sizes in twentieths of a point (twips): US Letter and ISO A4. */
const DOCX_PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  letter: { width: 12240, height: 15840 },
  a4: { width: 11906, height: 16838 },
};

const TWIPS_PER_POINT = 20;
const HALF_POINTS_PER_POINT = 2;
/** Word's "single" line spacing is 240 (240ths of a line). */
const SINGLE_LINE = 240;

function toTwips(points: number): number {
  return Math.round(points * TWIPS_PER_POINT);
}

function toHalfPoints(points: number): number {
  return Math.round(points * HALF_POINTS_PER_POINT);
}

function sectionHeading(text: string, style: ResolvedExportStyle): Paragraph {
  const heading = style.headingCase === 'title' ? text : text.toUpperCase();
  const spacing = {
    before:
      style.sectionSpacing === undefined ? 240 : toTwips(style.sectionSpacing),
    after: 80,
  };
  if (style.headingFontSize === undefined) {
    return new Paragraph({
      text: heading,
      heading: HeadingLevel.HEADING_2,
      spacing,
    });
  }
  return new Paragraph({
    children: [
      new TextRun({ text: heading, size: toHalfPoints(style.headingFontSize) }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing,
  });
}

function bulletParagraph(text: string, richText: boolean): Paragraph {
  if (!richText) {
    return new Paragraph({ text, bullet: { level: 0 } });
  }
  return new Paragraph({
    children: parseMarkdownRuns(text).map(
      (run) =>
        new TextRun({ text: run.text, bold: run.bold, italics: run.italic })
    ),
    bullet: { level: 0 },
  });
}

function entryHeadingParagraph(
  heading: string,
  dateRange: string,
  style: ResolvedExportStyle
): Paragraph {
  const runs = [new TextRun({ text: heading, bold: true })];
  if (dateRange) {
    runs.push(new TextRun({ text: `  (${dateRange})`, italics: true }));
  }
  return new Paragraph({
    children: runs,
    spacing: {
      before:
        style.entrySpacing === undefined ? 120 : toTwips(style.entrySpacing),
    },
  });
}

/** Document-wide font, size, and line spacing. Only built when a style is set. */
function documentStyles(style: ResolvedExportStyle): IStylesOptions {
  return {
    default: {
      document: {
        run: {
          ...(style.fontFamily === undefined
            ? {}
            : { font: DOCX_FONT_NAMES[style.fontFamily] }),
          ...(style.fontSize === undefined
            ? {}
            : { size: toHalfPoints(style.fontSize) }),
        },
        paragraph:
          style.lineSpacing === undefined
            ? {}
            : {
                spacing: {
                  line: Math.round(SINGLE_LINE * style.lineSpacing),
                  lineRule: LineRuleType.AUTO,
                },
              },
      },
    },
  };
}

/** Page size and margins for the document section. Empty unless the style sets them. */
function sectionProperties(style: ResolvedExportStyle): {
  properties?: ISectionPropertiesOptions;
} {
  if (style.pageSize === undefined && style.margin === undefined) {
    return {};
  }
  const margin = style.margin === undefined ? undefined : toTwips(style.margin);
  return {
    properties: {
      page: {
        ...(style.pageSize === undefined
          ? {}
          : { size: DOCX_PAGE_SIZES[style.pageSize] }),
        ...(margin === undefined
          ? {}
          : {
              margin: {
                top: margin,
                right: margin,
                bottom: margin,
                left: margin,
              },
            }),
      },
    },
  };
}

/** Renders a resume as a .docx document, importable in Microsoft Word. */
export async function exportResumeAsDocx(
  resume: Resume,
  options: ExportOptions = {}
): Promise<Blob> {
  const richText = options.richText ?? false;
  const details = resolveExportDetails(options.details);
  const style = resolveExportStyle(options.style);
  const { contact } = resume;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contact.fullName || 'Resume',
          bold: true,
          size:
            style.nameFontSize === undefined
              ? 36
              : toHalfPoints(style.nameFontSize),
        }),
      ],
    })
  );

  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join('   |   ');
  if (contactLine) {
    children.push(new Paragraph({ text: contactLine }));
  }

  if (contact.links.length > 0) {
    const linksLine = contact.links
      .map((link) => link.url || link.label)
      .filter(Boolean)
      .join('   |   ');
    if (linksLine) {
      children.push(new Paragraph({ text: linksLine }));
    }
  }

  if (resume.summary) {
    children.push(sectionHeading('Summary', style));
    children.push(new Paragraph({ text: resume.summary }));
  }

  const sectionBuilders: Record<SectionKey, () => void> = {
    experience: () => {
      if (resume.experience.length > 0) {
        children.push(sectionHeading('Experience', style));
        for (const entry of resume.experience) {
          const heading = entryHeading(
            [entry.title, entry.company],
            entry.location,
            ' — '
          );
          const dateRange = formatDateRange(
            entry.startDate,
            entry.endDate,
            entry.isCurrent
          );
          children.push(entryHeadingParagraph(heading, dateRange, style));
          for (const highlight of entry.highlights) {
            if (highlight.trim()) {
              children.push(bulletParagraph(highlight, richText));
            }
          }
        }
      }
    },
    education: () => {
      if (resume.education.length > 0) {
        children.push(sectionHeading('Education', style));
        for (const entry of resume.education) {
          const heading = entryHeading(
            [entry.credential, entry.institution],
            entry.location,
            ' — '
          );
          const dateRange = formatDateRange(
            entry.startDate,
            entry.endDate,
            entry.isCurrent
          );
          children.push(entryHeadingParagraph(heading, dateRange, style));
          for (const highlight of entry.highlights) {
            if (highlight.trim()) {
              children.push(bulletParagraph(highlight, richText));
            }
          }
        }
      }
    },
    skills: () => {
      if (resume.skills.length > 0) {
        children.push(sectionHeading('Skills', style));
        for (const group of resume.skills) {
          const skillsLine = group.skills.filter(Boolean).join(', ');
          if (skillsLine) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${group.category}: `, bold: true }),
                  new TextRun({ text: skillsLine }),
                ],
              })
            );
          }
        }
      }
    },
    certifications: () => {
      if (resume.certifications.length > 0) {
        children.push(sectionHeading('Certifications', style));
        for (const entry of resume.certifications) {
          const extras = certificationExtras(entry, details);
          const parts = [
            entry.name,
            entry.issuer,
            entry.issueDate,
            ...extras.headingParts,
          ].filter(Boolean);
          children.push(new Paragraph({ text: parts.join(' — ') }));
          for (const line of extras.belowLines) {
            children.push(new Paragraph({ text: line }));
          }
        }
      }
    },
    projects: () => {
      if (resume.projects.length > 0) {
        children.push(sectionHeading('Projects', style));
        for (const entry of resume.projects) {
          const extras = projectExtras(entry, details);
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: entry.name, bold: true }),
                ...(extras.headingParts.length > 0
                  ? [
                      new TextRun({
                        text: ` — ${extras.headingParts.join(' — ')}`,
                      }),
                    ]
                  : []),
              ],
              spacing: {
                before:
                  style.entrySpacing === undefined
                    ? 120
                    : toTwips(style.entrySpacing),
              },
            })
          );
          if (entry.description) {
            children.push(new Paragraph({ text: entry.description }));
          }
          for (const line of extras.belowLines) {
            children.push(new Paragraph({ text: line }));
          }
          for (const highlight of entry.highlights) {
            if (highlight.trim()) {
              children.push(bulletParagraph(highlight, richText));
            }
          }
        }
      }
    },
  };
  for (const key of resolveSectionOrder(resume)) {
    sectionBuilders[key]();
  }

  const doc = new Document({
    ...(style.customized ? { styles: documentStyles(style) } : {}),
    sections: [{ ...sectionProperties(style), children }],
  });
  return Packer.toBlob(doc);
}
