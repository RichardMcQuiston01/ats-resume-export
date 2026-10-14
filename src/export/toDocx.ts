import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

import type { Resume } from '../types';
import { formatDateRange } from './formatDateRange';

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text: text.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function entryHeadingParagraph(heading: string, dateRange: string): Paragraph {
  const runs = [new TextRun({ text: heading, bold: true })];
  if (dateRange) {
    runs.push(new TextRun({ text: `  (${dateRange})`, italics: true }));
  }
  return new Paragraph({ children: runs, spacing: { before: 120 } });
}

/** Renders a resume as a .docx document, importable in Microsoft Word. */
export async function exportResumeAsDocx(resume: Resume): Promise<Blob> {
  const { contact } = resume;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contact.fullName || 'Resume',
          bold: true,
          size: 36,
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
    children.push(sectionHeading('Summary'));
    children.push(new Paragraph({ text: resume.summary }));
  }

  if (resume.experience.length > 0) {
    children.push(sectionHeading('Experience'));
    for (const entry of resume.experience) {
      const heading = [entry.title, entry.company].filter(Boolean).join(' — ');
      const dateRange = formatDateRange(
        entry.startDate,
        entry.endDate,
        entry.isCurrent
      );
      children.push(entryHeadingParagraph(heading, dateRange));
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          children.push(bulletParagraph(highlight));
        }
      }
    }
  }

  if (resume.education.length > 0) {
    children.push(sectionHeading('Education'));
    for (const entry of resume.education) {
      const heading = [entry.credential, entry.institution]
        .filter(Boolean)
        .join(' — ');
      const dateRange = formatDateRange(
        entry.startDate,
        entry.endDate,
        entry.isCurrent
      );
      children.push(entryHeadingParagraph(heading, dateRange));
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          children.push(bulletParagraph(highlight));
        }
      }
    }
  }

  if (resume.skills.length > 0) {
    children.push(sectionHeading('Skills'));
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

  if (resume.certifications.length > 0) {
    children.push(sectionHeading('Certifications'));
    for (const entry of resume.certifications) {
      const parts = [entry.name, entry.issuer, entry.issueDate].filter(Boolean);
      children.push(new Paragraph({ text: parts.join(' — ') }));
    }
  }

  if (resume.projects.length > 0) {
    children.push(sectionHeading('Projects'));
    for (const entry of resume.projects) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: entry.name, bold: true })],
          spacing: { before: 120 },
        })
      );
      if (entry.description) {
        children.push(new Paragraph({ text: entry.description }));
      }
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          children.push(bulletParagraph(highlight));
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
