import type {
  StandardSchemaV1,
  StandardSchemaV1PathSegment,
} from '../standard-schema';
import type { Resume } from '../types';
import { resumeValidator } from '../validate';

export type AtsFindingSeverity = 'error' | 'warning' | 'info';

export interface AtsFinding {
  /** Stable-ish key, e.g. "experience.0.highlights.1.short". */
  id: string;
  severity: AtsFindingSeverity;
  message: string;
}

const SECTION_LABELS: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  projects: 'Projects',
};

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  links: 'Links',
  label: 'Label',
  url: 'URL',
  company: 'Company',
  title: 'Title',
  startDate: 'Start date',
  endDate: 'End date',
  isCurrent: 'Currently here',
  highlights: 'Highlights',
  institution: 'Institution',
  credential: 'Credential',
  category: 'Category',
  skills: 'Skills',
  name: 'Name',
  issuer: 'Issuer',
  issueDate: 'Issue date',
  expirationDate: 'Expiration date',
  credentialUrl: 'Credential URL',
  description: 'Description',
};

/** Turns a validation issue path into a readable label, e.g. "Experience #2 — Start date". */
function describePath(path: readonly PropertyKey[]): string {
  const parts: string[] = [];
  let index = 0;

  while (index < path.length) {
    const segment = path[index];
    if (typeof segment !== 'string') {
      index += 1;
      continue;
    }

    const label = SECTION_LABELS[segment] ?? FIELD_LABELS[segment] ?? segment;
    const next = path[index + 1];
    if (typeof next === 'number') {
      parts.push(`${label} #${next + 1}`);
      index += 2;
      continue;
    }

    parts.push(label);
    index += 1;
  }

  return parts.join(' — ');
}

const BULLET_PREFIX_PATTERN = /^\s*[•*–-]\s+/;
const SHORT_HIGHLIGHT_LENGTH = 15;

export interface CheckResumeStructureOptions {
  /**
   * Any synchronous Standard Schema compatible validator (Zod 4, Valibot,
   * ArkType, ...). Defaults to the built-in dependency-free validator.
   */
  schema?: StandardSchemaV1;
}

function toPath(
  path: ReadonlyArray<PropertyKey | StandardSchemaV1PathSegment> | undefined
): PropertyKey[] {
  return (path ?? []).map((segment) =>
    typeof segment === 'object' ? segment.key : segment
  );
}

/**
 * Checks a resume for ATS/export readiness: validates it against a strict
 * schema (translating each issue into a friendly message) and layers on a
 * few extra heuristics that a valid-but-thin resume can still trip, such as
 * a highlight that's just a leading bullet character.
 */
export function checkResumeStructure(
  resume: Resume,
  options: CheckResumeStructureOptions = {}
): AtsFinding[] {
  const findings: AtsFinding[] = [];

  const schema = options.schema ?? resumeValidator;
  const result = schema['~standard'].validate(resume);
  if (result instanceof Promise) {
    throw new Error(
      'checkResumeStructure requires a synchronous schema, but the provided Standard Schema validator returned a Promise.'
    );
  }
  if (result.issues) {
    for (const issue of result.issues) {
      const path = toPath(issue.path);
      findings.push({
        id: path.length > 0 ? path.map(String).join('.') : 'root',
        severity: 'error',
        message: `${describePath(path)}: ${issue.message}`,
      });
    }
  }

  if (resume.experience.length === 0 && resume.education.length === 0) {
    findings.push({
      id: 'content.empty',
      severity: 'warning',
      message:
        'Add at least one job or degree — an empty resume will not pass ATS screening.',
    });
  }

  if (!resume.summary || resume.summary.trim().length === 0) {
    findings.push({
      id: 'summary.missing',
      severity: 'info',
      message:
        'Add a professional summary — many ATS systems weight it heavily for keyword matching.',
    });
  }

  for (const [entryIndex, entry] of resume.experience.entries()) {
    for (const [highlightIndex, highlight] of entry.highlights.entries()) {
      const trimmed = highlight.trim();
      if (trimmed.length === 0) {
        continue;
      }

      if (BULLET_PREFIX_PATTERN.test(highlight)) {
        findings.push({
          id: `experience.${entryIndex}.highlights.${highlightIndex}.bullet`,
          severity: 'info',
          message: `Experience #${entryIndex + 1}, highlight #${highlightIndex + 1}: remove the leading bullet/dash — it's added automatically.`,
        });
      }

      if (trimmed.length < SHORT_HIGHLIGHT_LENGTH) {
        findings.push({
          id: `experience.${entryIndex}.highlights.${highlightIndex}.short`,
          severity: 'info',
          message: `Experience #${entryIndex + 1}, highlight #${highlightIndex + 1} looks short — spell out a specific, complete accomplishment.`,
        });
      }
    }
  }

  return findings;
}
