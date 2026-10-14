import { z } from 'zod';

import {
  MAX_SCREENSHOT_DATA_URL_LENGTH,
  RECOMMENDATION_RELATIONSHIPS,
  RESUME_SCHEMA_VERSION,
  type Resume as ResumeType,
} from './types';

export { MAX_SCREENSHOT_DATA_URL_LENGTH, RESUME_SCHEMA_VERSION } from './types';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Month-precision date (e.g. "2024-06"). Avoids implying a specific day. */
const yearMonthSchema = z
  .string()
  .regex(YEAR_MONTH_PATTERN, 'Expected a date in YYYY-MM format.');

const linkSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  url: z.url(),
});

const contactSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  links: z.array(linkSchema).default([]),
});

const experienceEntrySchema = z
  .object({
    id: z.uuid(),
    company: z.string().min(1),
    title: z.string().min(1),
    location: z.string().min(1).optional(),
    startDate: yearMonthSchema,
    endDate: yearMonthSchema.optional(),
    isCurrent: z.boolean(),
    highlights: z.array(z.string().min(1)).min(1),
  })
  .refine((entry) => entry.isCurrent || entry.endDate !== undefined, {
    message: 'endDate is required unless isCurrent is true.',
    path: ['endDate'],
  });

const educationEntrySchema = z.object({
  id: z.uuid(),
  institution: z.string().min(1),
  credential: z.string().min(1),
  location: z.string().min(1).optional(),
  startDate: yearMonthSchema.optional(),
  endDate: yearMonthSchema.optional(),
  isCurrent: z.boolean(),
  highlights: z.array(z.string().min(1)).default([]),
});

const skillGroupSchema = z.object({
  id: z.uuid(),
  category: z.string().min(1),
  skills: z.array(z.string().min(1)).min(1),
});

const certificationEntrySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  issuer: z.string().min(1),
  issueDate: yearMonthSchema.optional(),
  expirationDate: yearMonthSchema.optional(),
  credentialUrl: z.url().optional(),
});

/** Matches a base64-encoded raster image, e.g. "data:image/png;base64,...". */
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

const screenshotSchema = z.object({
  id: z.uuid(),
  dataUrl: z
    .string()
    .max(MAX_SCREENSHOT_DATA_URL_LENGTH)
    .regex(
      IMAGE_DATA_URL_PATTERN,
      'Expected a base64 PNG, JPEG, or WebP data URL.'
    ),
  altText: z.string().min(1),
});

const projectEntrySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  /** General-purpose link; prefer `repoUrl` / `demoUrl` for portfolio use. */
  url: z.url().optional(),
  highlights: z.array(z.string().min(1)).default([]),
  techStack: z.array(z.string().min(1)).default([]),
  repoUrl: z.url().optional(),
  demoUrl: z.url().optional(),
  /** The result or impact, e.g. "Cut monthly reconciliation from 2 days to 2 hours." */
  outcome: z.string().min(1).optional(),
  screenshots: z.array(screenshotSchema).default([]),
});

const recommendationSchema = z.object({
  id: z.uuid(),
  authorName: z.string().min(1),
  authorTitle: z.string().min(1).optional(),
  authorCompany: z.string().min(1).optional(),
  relationship: z.enum(RECOMMENDATION_RELATIONSHIPS),
  quote: z.string().min(1),
  /** Where the original lives (e.g. a LinkedIn recommendation), for verification. */
  sourceUrl: z.url().optional(),
  /**
   * Whether the author agreed to have their words and name published.
   * Portfolio exports should skip recommendations where this is false.
   */
  hasAuthorPermission: z.boolean(),
});

const portfolioSchema = z.object({
  bio: z.string().min(1).optional(),
  /** Ids of `projects` to showcase, in display order. */
  featuredProjectIds: z.array(z.uuid()).default([]),
  recommendations: z.array(recommendationSchema).default([]),
});

export const resumeSchema = z.object({
  schemaVersion: z.literal(RESUME_SCHEMA_VERSION),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  contact: contactSchema,
  summary: z.string().min(1).optional(),
  experience: z.array(experienceEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  certifications: z.array(certificationEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  portfolio: portfolioSchema.default({
    featuredProjectIds: [],
    recommendations: [],
  }),
});

const draftLinkSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  url: z.string(),
});

const draftContactSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(draftLinkSchema).default([]),
});

const draftExperienceEntrySchema = z.object({
  id: z.uuid(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  highlights: z.array(z.string()).default([]),
});

const draftEducationEntrySchema = z.object({
  id: z.uuid(),
  institution: z.string(),
  credential: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  highlights: z.array(z.string()).default([]),
});

const draftSkillGroupSchema = z.object({
  id: z.uuid(),
  category: z.string(),
  skills: z.array(z.string()).default([]),
});

const draftCertificationEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialUrl: z.string().optional(),
});

const draftScreenshotSchema = z.object({
  id: z.uuid(),
  dataUrl: z.string(),
  altText: z.string(),
});

const draftProjectEntrySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  highlights: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  repoUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  outcome: z.string().optional(),
  screenshots: z.array(draftScreenshotSchema).default([]),
});

const draftRecommendationSchema = z.object({
  id: z.uuid(),
  authorName: z.string(),
  authorTitle: z.string().optional(),
  authorCompany: z.string().optional(),
  relationship: z.enum(RECOMMENDATION_RELATIONSHIPS),
  quote: z.string(),
  sourceUrl: z.string().optional(),
  hasAuthorPermission: z.boolean(),
});

const draftPortfolioSchema = z.object({
  bio: z.string().optional(),
  featuredProjectIds: z.array(z.uuid()).default([]),
  recommendations: z.array(draftRecommendationSchema).default([]),
});

/**
 * A permissive counterpart to `resumeSchema`, for validating in-progress
 * drafts — e.g. what gets round-tripped through storage while the user is
 * still editing. Same shape, but without the business-rule constraints
 * (a real email, non-empty required fields, YYYY-MM dates, ...) that only
 * make sense once the user is done. Use `resumeSchema` / `parseResume` to
 * check whether a resume is actually ready to export.
 */
export const resumeDraftSchema = z.object({
  schemaVersion: z.literal(RESUME_SCHEMA_VERSION),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  contact: draftContactSchema,
  summary: z.string().optional(),
  experience: z.array(draftExperienceEntrySchema).default([]),
  education: z.array(draftEducationEntrySchema).default([]),
  skills: z.array(draftSkillGroupSchema).default([]),
  certifications: z.array(draftCertificationEntrySchema).default([]),
  projects: z.array(draftProjectEntrySchema).default([]),
  portfolio: draftPortfolioSchema.default({
    featuredProjectIds: [],
    recommendations: [],
  }),
});

/** Zod-inferred resume type; must stay identical to the plain `Resume`. */
export type ZodResume = z.infer<typeof resumeSchema>;

type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const resumeTypesMatch: Mutual<ZodResume, ResumeType> = true;
void resumeTypesMatch;

/** Parses and validates a resume, throwing a `z.ZodError` on failure. */
export function parseResume(data: unknown): ResumeType {
  return resumeSchema.parse(data);
}

/** Parses and validates a resume, returning a result instead of throwing. */
export function safeParseResume(
  data: unknown
): z.ZodSafeParseResult<ResumeType> {
  return resumeSchema.safeParse(data);
}
