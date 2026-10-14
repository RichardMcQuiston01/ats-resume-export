import type { Resume } from '../types';
import { STOP_WORDS } from './stopWords';

const WORD_PATTERN = /[a-z0-9][a-z0-9+.#-]*/g;
const TRAILING_PUNCTUATION_PATTERN = /[.\-#+]+$/;
const MIN_KEYWORD_LENGTH = 3;

/**
 * Tokenizes free text into a deduplicated list of lowercase keywords,
 * dropping stopwords and anything too short to be meaningful. Keeps
 * common tech-term punctuation (`node.js`, `c#`, `c++`) intact.
 */
export function extractKeywords(text: string): string[] {
  const matches = text.toLowerCase().match(WORD_PATTERN) ?? [];
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const rawWord of matches) {
    const word = rawWord.replace(TRAILING_PUNCTUATION_PATTERN, '');
    if (
      word.length < MIN_KEYWORD_LENGTH ||
      STOP_WORDS.has(word) ||
      seen.has(word)
    ) {
      continue;
    }
    seen.add(word);
    keywords.push(word);
  }

  return keywords;
}

/** Flattens every free-text field of a resume into one searchable string. */
function resumeText(resume: Resume): string {
  const parts: string[] = [resume.summary ?? ''];

  for (const entry of resume.experience) {
    parts.push(entry.title, entry.company, ...entry.highlights);
  }
  for (const entry of resume.education) {
    parts.push(entry.institution, entry.credential, ...entry.highlights);
  }
  for (const group of resume.skills) {
    parts.push(group.category, ...group.skills);
  }
  for (const entry of resume.certifications) {
    parts.push(entry.name, entry.issuer);
  }
  for (const entry of resume.projects) {
    parts.push(entry.name, entry.description, ...entry.highlights);
  }

  return parts.join(' ');
}

export interface KeywordMatchResult {
  matched: string[];
  missing: string[];
  /** Share of job-description keywords found in the resume, 0-100. */
  score: number;
}

/**
 * Compares a resume's content against a job description's keywords —
 * a simple frequency/presence match, the same basic technique most
 * keyword-screening ATS software uses.
 */
export function matchKeywords(
  resume: Resume,
  jobDescription: string
): KeywordMatchResult {
  const jobKeywords = extractKeywords(jobDescription);
  if (jobKeywords.length === 0) {
    return { matched: [], missing: [], score: 0 };
  }

  const resumeKeywords = new Set(extractKeywords(resumeText(resume)));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of jobKeywords) {
    (resumeKeywords.has(keyword) ? matched : missing).push(keyword);
  }

  const score = Math.round((matched.length / jobKeywords.length) * 100);
  return { matched, missing, score };
}
