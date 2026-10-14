import { stripMarkdownRuns } from '../richText';
import { resolveSectionOrder } from '../sections';
import type { Resume, SectionKey } from '../types';
import { formatDateRange } from './formatDateRange';
import type { ExportOptions } from './options';

/**
 * Renders a resume as plain text: the most ATS-safe export format, since
 * there is no layout for a parser to misread.
 */
export function exportResumeAsPlainText(
  resume: Resume,
  options: ExportOptions = {}
): string {
  const lines: string[] = [];
  const renderHighlight = (highlight: string): string =>
    options.richText ? stripMarkdownRuns(highlight) : highlight;
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

  const sectionBuilders: Record<SectionKey, () => void> = {
    experience: () => {
      if (resume.experience.length > 0) {
        lines.push('', 'EXPERIENCE');
        for (const entry of resume.experience) {
          const heading = [entry.title, entry.company]
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
              lines.push(`- ${renderHighlight(highlight)}`);
            }
          }
        }
      }
    },
    education: () => {
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
              lines.push(`- ${renderHighlight(highlight)}`);
            }
          }
        }
      }
    },
    skills: () => {
      if (resume.skills.length > 0) {
        lines.push('', 'SKILLS');
        for (const group of resume.skills) {
          const skillsLine = group.skills.filter(Boolean).join(', ');
          if (skillsLine) {
            lines.push(`${group.category}: ${skillsLine}`);
          }
        }
      }
    },
    certifications: () => {
      if (resume.certifications.length > 0) {
        lines.push('', 'CERTIFICATIONS');
        for (const entry of resume.certifications) {
          const parts = [entry.name, entry.issuer, entry.issueDate].filter(
            Boolean
          );
          lines.push(parts.join(' - '));
        }
      }
    },
    projects: () => {
      if (resume.projects.length > 0) {
        lines.push('', 'PROJECTS');
        for (const entry of resume.projects) {
          lines.push('', entry.name);
          if (entry.description) {
            lines.push(entry.description);
          }
          for (const highlight of entry.highlights) {
            if (highlight.trim()) {
              lines.push(`- ${renderHighlight(highlight)}`);
            }
          }
        }
      }
    },
  };
  for (const key of resolveSectionOrder(resume)) {
    sectionBuilders[key]();
  }

  return `${lines.join('\n').trim()}\n`;
}
