/**
 * Canonical resume shape shared by every exporter and ATS check. These are
 * plain TypeScript types (no runtime validation library), so consumers can
 * validate with the built-in validator, the `./zod` entry, or any Standard
 * Schema compatible library.
 */

/**
 * Bumped whenever a breaking change is made to the resume shape, so
 * stored/exported resumes can be migrated instead of silently misread.
 * Purely additive changes (new optional or defaulted fields) do not
 * require a bump.
 */
export const RESUME_SCHEMA_VERSION = 1;

/** Upper bound on a single stored screenshot (~1.5 MB of base64 text). */
export const MAX_SCREENSHOT_DATA_URL_LENGTH = 1_500_000;

/** Portfolio guidance: 3 to 5 standout projects. */
export const PORTFOLIO_MIN_FEATURED_PROJECTS = 3;
export const PORTFOLIO_MAX_FEATURED_PROJECTS = 5;

export const RECOMMENDATION_RELATIONSHIPS = [
  'manager',
  'peer',
  'direct_report',
  'client',
  'mentor',
  'professor',
  'other',
] as const;

export type RecommendationRelationship =
  (typeof RECOMMENDATION_RELATIONSHIPS)[number];

export interface Link {
  id: string;
  label: string;
  url: string;
}

export interface Contact {
  fullName: string;
  email: string;
  phone?: string | undefined;
  location?: string | undefined;
  links: Link[];
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location?: string | undefined;
  /** Month-precision date, "YYYY-MM". */
  startDate: string;
  /** Month-precision date, "YYYY-MM". Required unless `isCurrent`. */
  endDate?: string | undefined;
  isCurrent: boolean;
  highlights: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  credential: string;
  location?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  isCurrent: boolean;
  highlights: string[];
}

export interface SkillGroup {
  id: string;
  category: string;
  skills: string[];
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string | undefined;
  expirationDate?: string | undefined;
  credentialUrl?: string | undefined;
}

export interface Screenshot {
  id: string;
  /** Base64 PNG, JPEG, or WebP data URL. */
  dataUrl: string;
  altText: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  url?: string | undefined;
  highlights: string[];
  techStack: string[];
  repoUrl?: string | undefined;
  demoUrl?: string | undefined;
  /** The result or impact, e.g. "Cut reconciliation from 2 days to 2 hours." */
  outcome?: string | undefined;
  screenshots: Screenshot[];
}

export interface Recommendation {
  id: string;
  authorName: string;
  authorTitle?: string | undefined;
  authorCompany?: string | undefined;
  relationship: RecommendationRelationship;
  quote: string;
  sourceUrl?: string | undefined;
  /** Portfolio exports should skip recommendations where this is false. */
  hasAuthorPermission: boolean;
}

export interface Portfolio {
  bio?: string | undefined;
  /** Ids of `projects` to showcase, in display order. */
  featuredProjectIds: string[];
  recommendations: Recommendation[];
}

export interface Resume {
  schemaVersion: typeof RESUME_SCHEMA_VERSION;
  id: string;
  /** ISO 8601 datetime. */
  createdAt: string;
  /** ISO 8601 datetime. */
  updatedAt: string;
  contact: Contact;
  summary?: string | undefined;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  portfolio: Portfolio;
}
