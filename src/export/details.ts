import type { CertificationEntry, ProjectEntry } from '../types';
import type { ValidationIssue } from '../validate';

/**
 * Where an optional detail goes:
 * - `off`: not printed (the default, so output is unchanged unless you ask).
 * - `heading`: on the entry's heading line, after its name.
 * - `below`: on its own labelled line under the heading.
 */
export const DETAIL_PLACEMENTS = ['off', 'heading', 'below'] as const;
export type DetailPlacement = (typeof DETAIL_PLACEMENTS)[number];

/** Outcomes are a full sentence, so they only go on their own line. */
export const OUTCOME_PLACEMENTS = ['off', 'below'] as const;
export type OutcomePlacement = (typeof OUTCOME_PLACEMENTS)[number];

/**
 * Entry details that the model carries but the exporters leave out unless
 * asked. Each can be switched on and placed independently. Applies to the
 * HTML, DOCX, PDF, and plain-text exporters.
 */
export interface ExportDetails {
  /** A project's `url`, `repoUrl`, and `demoUrl` (each shown once). */
  projectLinks?: DetailPlacement | undefined;
  /** A project's `techStack`, as a comma-separated list. */
  projectTechStack?: DetailPlacement | undefined;
  /** A project's `outcome`, labelled "Outcome:". */
  projectOutcome?: OutcomePlacement | undefined;
  /** A certification's `credentialUrl`. */
  credentialUrl?: DetailPlacement | undefined;
}

export interface ResolvedExportDetails {
  projectLinks: DetailPlacement;
  projectTechStack: DetailPlacement;
  projectOutcome: OutcomePlacement;
  credentialUrl: DetailPlacement;
}

const DETAIL_KEYS: ReadonlyArray<keyof ExportDetails> = [
  'projectLinks',
  'projectTechStack',
  'projectOutcome',
  'credentialUrl',
];

const ALLOWED_PLACEMENTS: Record<keyof ExportDetails, readonly string[]> = {
  projectLinks: DETAIL_PLACEMENTS,
  projectTechStack: DETAIL_PLACEMENTS,
  projectOutcome: OUTCOME_PLACEMENTS,
  credentialUrl: DETAIL_PLACEMENTS,
};

/**
 * Checks `details` against the allowed placements. Returns one issue per
 * problem (an empty array means it is valid), each located by option name.
 */
export function validateExportDetails(
  details: ExportDetails | undefined
): ValidationIssue[] {
  if (details === undefined) {
    return [];
  }
  const issues: ValidationIssue[] = [];
  for (const key of DETAIL_KEYS) {
    const value: unknown = details[key];
    if (value === undefined) {
      continue;
    }
    const allowed = ALLOWED_PLACEMENTS[key];
    if (typeof value !== 'string' || !allowed.includes(value)) {
      issues.push({
        path: [key],
        message: `${key} must be one of ${allowed.join(', ')}, but received ${String(value)}.`,
      });
    }
  }
  return issues;
}

/**
 * Fills in defaults (everything `off`) for the options not given.
 *
 * @throws RangeError listing every invalid option, so a typo fails loudly
 *   instead of silently dropping content.
 */
export function resolveExportDetails(
  details: ExportDetails | undefined
): ResolvedExportDetails {
  const issues = validateExportDetails(details);
  if (issues.length > 0) {
    throw new RangeError(
      `Invalid export details: ${issues.map((issue) => issue.message).join(' ')}`
    );
  }
  return {
    projectLinks: details?.projectLinks ?? 'off',
    projectTechStack: details?.projectTechStack ?? 'off',
    projectOutcome: details?.projectOutcome ?? 'off',
    credentialUrl: details?.credentialUrl ?? 'off',
  };
}

/** What to print for one entry: extra parts on its heading line, and extra lines under it. */
export interface EntryExtras {
  headingParts: string[];
  belowLines: string[];
}

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** The project's distinct links, in `url`, `repoUrl`, `demoUrl` order. */
function projectLinkItems(
  entry: ProjectEntry
): Array<{ label: string; url: string }> {
  const candidates: Array<{ label: string; url: string | undefined }> = [
    { label: 'Link', url: present(entry.url) },
    { label: 'Code', url: present(entry.repoUrl) },
    { label: 'Demo', url: present(entry.demoUrl) },
  ];
  const seen = new Set<string>();
  const items: Array<{ label: string; url: string }> = [];
  for (const { label, url } of candidates) {
    if (url !== undefined && !seen.has(url)) {
      seen.add(url);
      items.push({ label, url });
    }
  }
  return items;
}

/** The extra heading parts and lines for a project, per the resolved details. */
export function projectExtras(
  entry: ProjectEntry,
  details: ResolvedExportDetails
): EntryExtras {
  const extras: EntryExtras = { headingParts: [], belowLines: [] };

  const outcome = present(entry.outcome);
  if (details.projectOutcome === 'below' && outcome !== undefined) {
    extras.belowLines.push(`Outcome: ${outcome}`);
  }

  const techStack = entry.techStack
    .map((tech) => tech.trim())
    .filter(Boolean)
    .join(', ');
  if (details.projectTechStack !== 'off' && techStack) {
    if (details.projectTechStack === 'heading') {
      extras.headingParts.push(techStack);
    } else {
      extras.belowLines.push(`Tech stack: ${techStack}`);
    }
  }

  const links = projectLinkItems(entry);
  if (details.projectLinks !== 'off' && links.length > 0) {
    if (details.projectLinks === 'heading') {
      extras.headingParts.push(links.map((link) => link.url).join(' | '));
    } else {
      extras.belowLines.push(
        links.map((link) => `${link.label}: ${link.url}`).join(' | ')
      );
    }
  }

  return extras;
}

/** The extra heading part or line for a certification, per the resolved details. */
export function certificationExtras(
  entry: CertificationEntry,
  details: ResolvedExportDetails
): EntryExtras {
  const extras: EntryExtras = { headingParts: [], belowLines: [] };
  const credentialUrl = present(entry.credentialUrl);
  if (details.credentialUrl !== 'off' && credentialUrl !== undefined) {
    if (details.credentialUrl === 'heading') {
      extras.headingParts.push(credentialUrl);
    } else {
      extras.belowLines.push(`Credential: ${credentialUrl}`);
    }
  }
  return extras;
}
