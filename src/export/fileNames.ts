import type { Resume } from '../types';

/** A filesystem-safe base name for exported files, e.g. "jordan-rivera-resume". */
export function resumeFileBaseName(resume: Resume): string {
  const slug = resume.contact.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? `${slug}-resume` : 'resume';
}
