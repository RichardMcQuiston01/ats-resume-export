import { createId } from './id';
import { RESUME_SCHEMA_VERSION } from '../types';
import type {
  CertificationEntry,
  Contact,
  EducationEntry,
  ExperienceEntry,
  Link,
  ProjectEntry,
  Recommendation,
  Resume,
  Screenshot,
  SkillGroup,
} from '../types';

/**
 * Factories for empty resume entities, used by the builder UI's "Add"
 * buttons and when starting a new profile. Values are intentionally
 * incomplete (e.g. an empty `startDate`) — the schema in `schema.ts` is
 * only enforced when the user finishes editing, not on every keystroke.
 */

export function createBlankContact(): Contact {
  return { fullName: '', email: '', links: [] };
}

export function createBlankLink(): Link {
  return { id: createId(), label: '', url: '' };
}

export function createBlankExperienceEntry(): ExperienceEntry {
  return {
    id: createId(),
    company: '',
    title: '',
    startDate: '',
    isCurrent: false,
    highlights: [],
  };
}

export function createBlankEducationEntry(): EducationEntry {
  return {
    id: createId(),
    institution: '',
    credential: '',
    isCurrent: false,
    highlights: [],
  };
}

export function createBlankSkillGroup(): SkillGroup {
  return { id: createId(), category: '', skills: [] };
}

export function createBlankCertificationEntry(): CertificationEntry {
  return { id: createId(), name: '', issuer: '' };
}

export function createBlankProjectEntry(): ProjectEntry {
  return {
    id: createId(),
    name: '',
    description: '',
    highlights: [],
    techStack: [],
    screenshots: [],
  };
}

export function createBlankScreenshot(): Screenshot {
  return { id: createId(), dataUrl: '', altText: '' };
}

export function createBlankRecommendation(): Recommendation {
  return {
    id: createId(),
    authorName: '',
    relationship: 'manager',
    quote: '',
    hasAuthorPermission: false,
  };
}

export function createBlankResume(): Resume {
  const now = new Date().toISOString();

  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    contact: createBlankContact(),
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    portfolio: { featuredProjectIds: [], recommendations: [] },
  };
}
