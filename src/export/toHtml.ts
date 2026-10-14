import { parseMarkdownRuns } from '../richText';
import { resolveSectionOrder } from '../sections';
import type { Resume, SectionKey } from '../types';
import { formatDateRange } from './formatDateRange';
import type { ExportOptions } from './options';
import {
  resolveExportStyle,
  type FontFamily,
  type ResolvedExportStyle,
} from './style';

function isPresent(value: string | undefined): value is string {
  return Boolean(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function richHighlightHtml(highlight: string): string {
  return parseMarkdownRuns(highlight)
    .map((run) => {
      const text = escapeHtml(run.text);
      if (run.bold) {
        return `<strong>${text}</strong>`;
      }
      return run.italic ? `<em>${text}</em>` : text;
    })
    .join('');
}

function highlightsList(highlights: string[], richText: boolean): string {
  const items = highlights
    .filter((highlight) => highlight.trim().length > 0)
    .map(
      (highlight) =>
        `<li>${richText ? richHighlightHtml(highlight) : escapeHtml(highlight)}</li>`
    )
    .join('');
  return items ? `<ul>${items}</ul>` : '';
}

const HTML_FONT_STACKS: Record<FontFamily, string> = {
  'sans-serif': 'Arial, Helvetica, sans-serif',
  serif: '"Times New Roman", Times, serif',
  monospace: '"Courier New", Courier, monospace',
};

const HTML_PAGE_SIZES = { letter: 'letter', a4: 'A4' } as const;

/** CSS appended after the built-in rules to apply style options. Empty when none are set. */
function styleOverrides(style: ResolvedExportStyle): string {
  if (!style.customized) {
    return '';
  }

  const rules: string[] = [];
  const body: string[] = [];
  if (style.fontFamily !== undefined) {
    body.push(`font-family: ${HTML_FONT_STACKS[style.fontFamily]}`);
  }
  if (style.fontSize !== undefined) {
    body.push(`font-size: ${style.fontSize}pt`);
  }
  if (style.lineSpacing !== undefined) {
    body.push(`line-height: ${style.lineSpacing}`);
  }
  if (style.margin !== undefined) {
    body.push(`padding: 0 ${style.margin}pt`);
  }
  if (body.length > 0) {
    rules.push(`body { ${body.join('; ')}; }`);
  }
  if (style.nameFontSize !== undefined) {
    rules.push(`h1 { font-size: ${style.nameFontSize}pt; }`);
  }

  const heading: string[] = [];
  if (style.headingFontSize !== undefined) {
    heading.push(`font-size: ${style.headingFontSize}pt`);
  }
  if (style.headingCase === 'title') {
    heading.push('text-transform: none', 'letter-spacing: normal');
  }
  if (style.sectionSpacing !== undefined) {
    heading.push(`margin-top: ${style.sectionSpacing}pt`);
  }
  if (heading.length > 0) {
    rules.push(`h2 { ${heading.join('; ')}; }`);
  }

  if (style.fontSize !== undefined) {
    rules.push('.contact { font-size: 0.9em; }');
    rules.push('.entry-dates { font-size: 0.85em; }');
  }
  if (style.entrySpacing !== undefined) {
    rules.push(`.entry { margin-top: ${style.entrySpacing}pt; }`);
  }

  const page: string[] = [];
  if (style.pageSize !== undefined) {
    page.push(`size: ${HTML_PAGE_SIZES[style.pageSize]}`);
  }
  if (style.margin !== undefined) {
    page.push(`margin: ${style.margin}pt`);
  }
  if (page.length > 0) {
    rules.push(`@page { ${page.join('; ')}; }`);
  }
  if (style.margin !== undefined) {
    rules.push('@media print { body { padding: 0; } }');
  }

  return `  /* style options */\n${rules.map((rule) => `  ${rule}`).join('\n')}\n`;
}

/**
 * Renders a resume as a standalone, self-contained HTML document (inline
 * `<style>`, no external assets) — opens in any browser and prints cleanly.
 */
export function exportResumeAsHtml(
  resume: Resume,
  options: ExportOptions = {}
): string {
  const richText = options.richText ?? false;
  const styleCss = styleOverrides(resolveExportStyle(options.style));
  const { contact } = resume;
  const title = escapeHtml(contact.fullName || 'Resume');
  const sections: string[] = [];

  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(isPresent)
    .map(escapeHtml)
    .join(' &middot; ');
  const linksLine = contact.links
    .map((link) => link.url || link.label)
    .filter(Boolean)
    .map(escapeHtml)
    .join(' &middot; ');

  sections.push(`<header>
  <h1>${title}</h1>
  ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
  ${linksLine ? `<p class="contact">${linksLine}</p>` : ''}
</header>`);

  if (resume.summary) {
    sections.push(`<section>
  <h2>Summary</h2>
  <p>${escapeHtml(resume.summary)}</p>
</section>`);
  }

  const sectionBuilders: Record<SectionKey, () => void> = {
    experience: () => {
      if (resume.experience.length > 0) {
        const entries = resume.experience
          .map((entry) => {
            const heading = escapeHtml(
              [entry.title, entry.company].filter(Boolean).join(' — ')
            );
            const dateRange = escapeHtml(
              formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)
            );
            return `<div class="entry">
      <div class="entry-header"><span>${heading}</span><span class="entry-dates">${dateRange}</span></div>
      ${highlightsList(entry.highlights, richText)}
    </div>`;
          })
          .join('');
        sections.push(`<section>
    <h2>Experience</h2>
    ${entries}
  </section>`);
      }
    },
    education: () => {
      if (resume.education.length > 0) {
        const entries = resume.education
          .map((entry) => {
            const heading = escapeHtml(
              [entry.credential, entry.institution].filter(Boolean).join(' — ')
            );
            const dateRange = escapeHtml(
              formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)
            );
            return `<div class="entry">
      <div class="entry-header"><span>${heading}</span><span class="entry-dates">${dateRange}</span></div>
      ${highlightsList(entry.highlights, richText)}
    </div>`;
          })
          .join('');
        sections.push(`<section>
    <h2>Education</h2>
    ${entries}
  </section>`);
      }
    },
    skills: () => {
      if (resume.skills.length > 0) {
        const groups = resume.skills
          .map((group) => {
            const skillsLine = escapeHtml(
              group.skills.filter(Boolean).join(', ')
            );
            return `<p><strong>${escapeHtml(group.category)}:</strong> ${skillsLine}</p>`;
          })
          .join('');
        sections.push(`<section>
    <h2>Skills</h2>
    ${groups}
  </section>`);
      }
    },
    certifications: () => {
      if (resume.certifications.length > 0) {
        const entries = resume.certifications
          .map((entry) => {
            const parts = [entry.name, entry.issuer, entry.issueDate]
              .filter(isPresent)
              .map(escapeHtml)
              .join(' — ');
            return `<p>${parts}</p>`;
          })
          .join('');
        sections.push(`<section>
    <h2>Certifications</h2>
    ${entries}
  </section>`);
      }
    },
    projects: () => {
      if (resume.projects.length > 0) {
        const entries = resume.projects
          .map((entry) => {
            const description = entry.description
              ? `<p>${escapeHtml(entry.description)}</p>`
              : '';
            return `<div class="entry">
      <div class="entry-header"><span>${escapeHtml(entry.name)}</span></div>
      ${description}
      ${highlightsList(entry.highlights, richText)}
    </div>`;
          })
          .join('');
        sections.push(`<section>
    <h2>Projects</h2>
    ${entries}
  </section>`);
      }
    },
  };
  for (const key of resolveSectionOrder(resume)) {
    sectionBuilders[key]();
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; margin-top: 1.5rem; }
  p { margin: 0.25rem 0; }
  .contact { color: #475569; font-size: 0.9rem; margin: 0.15rem 0; }
  .entry { margin-top: 0.75rem; }
  .entry-header { display: flex; justify-content: space-between; gap: 1rem; font-weight: 600; }
  .entry-dates { color: #64748b; font-size: 0.85rem; white-space: nowrap; font-weight: 400; }
  ul { margin: 0.25rem 0; padding-left: 1.25rem; }
  @media print {
    body { margin: 0; max-width: none; }
  }
${styleCss}</style>
</head>
<body>
${sections.join('\n')}
</body>
</html>
`;
}
