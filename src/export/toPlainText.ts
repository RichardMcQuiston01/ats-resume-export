import type { Resume } from '../types';
import { formatDateRange } from './formatDateRange';

/**
 * Renders a resume as plain text: the most ATS-safe export format, since
 * there is no layout for a parser to misread.
 */
export function exportResumeAsPlainText(resume: Resume): string {
  const lines: string[] = [];
  const { contact } = resume;

  lines.push(contact.fullName || 'Resume');

  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join(' | ');
  if (contactLine) {
    lines.push(contactLine);
  }

  if (contact.links.length > 0) {
    const linksLine = contact.links
      .map((link) => link.url || link.label)
      .filter(Boolean)
      .join(' | ');
    if (linksLine) {
      lines.push(linksLine);
    }
  }

  if (resume.summary) {
    lines.push('', 'SUMMARY', resume.summary);
  }

  if (resume.experience.length > 0) {
    lines.push('', 'EXPERIENCE');
    for (const entry of resume.experience) {
      const heading = [entry.title, entry.company].filter(Boolean).join(' - ');
      const dateRange = formatDateRange(
        entry.startDate,
        entry.endDate,
        entry.isCurrent
      );
      lines.push('', dateRange ? `${heading} (${dateRange})` : heading);
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          lines.push(`- ${highlight}`);
        }
      }
    }
  }

  if (resume.education.length > 0) {
    lines.push('', 'EDUCATION');
    for (const entry of resume.education) {
      const heading = [entry.credential, entry.institution]
        .filter(Boolean)
        .join(' - ');
      const dateRange = formatDateRange(
        entry.startDate,
        entry.endDate,
        entry.isCurrent
      );
      lines.push('', dateRange ? `${heading} (${dateRange})` : heading);
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          lines.push(`- ${highlight}`);
        }
      }
    }
  }

  if (resume.skills.length > 0) {
    lines.push('', 'SKILLS');
    for (const group of resume.skills) {
      const skillsLine = group.skills.filter(Boolean).join(', ');
      if (skillsLine) {
        lines.push(`${group.category}: ${skillsLine}`);
      }
    }
  }

  if (resume.certifications.length > 0) {
    lines.push('', 'CERTIFICATIONS');
    for (const entry of resume.certifications) {
      const parts = [entry.name, entry.issuer, entry.issueDate].filter(Boolean);
      lines.push(parts.join(' - '));
    }
  }

  if (resume.projects.length > 0) {
    lines.push('', 'PROJECTS');
    for (const entry of resume.projects) {
      lines.push('', entry.name);
      if (entry.description) {
        lines.push(entry.description);
      }
      for (const highlight of entry.highlights) {
        if (highlight.trim()) {
          lines.push(`- ${highlight}`);
        }
      }
    }
  }

  return `${lines.join('\n').trim()}\n`;
}
