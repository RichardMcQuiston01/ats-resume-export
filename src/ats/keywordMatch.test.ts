import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { extractKeywords, matchKeywords } from './keywordMatch';

describe('extractKeywords', () => {
  it('lowercases, dedupes, and drops short words and stopwords', () => {
    expect(
      extractKeywords('The Engineer and the ENGINEER is a a go to')
    ).toStrictEqual(['engineer']);
  });

  it('keeps tech-term punctuation like node.js, but drops short tokens like c#', () => {
    expect(
      extractKeywords('Experience with Node.js and C# required.')
    ).toStrictEqual(['experience', 'node.js', 'required']);
  });

  it('strips trailing punctuation without touching internal punctuation', () => {
    expect(extractKeywords('We use Node.js.')).toStrictEqual([
      'use',
      'node.js',
    ]);
  });
});

describe('matchKeywords', () => {
  it('returns a zero-length result for an empty job description', () => {
    const resume = createFixtureResume();

    expect(matchKeywords(resume, '')).toStrictEqual({
      matched: [],
      missing: [],
      score: 0,
    });
  });

  it('finds keywords from the fixture resume and reports a full score', () => {
    const resume = createFixtureResume();

    const result = matchKeywords(resume, 'TypeScript engineer');

    expect(result.matched).toStrictEqual(['typescript', 'engineer']);
    expect(result.missing).toStrictEqual([]);
    expect(result.score).toBe(100);
  });

  it('reports missing keywords the resume does not mention', () => {
    const resume = createBlankResume();

    const result = matchKeywords(
      resume,
      'Requires Kubernetes and Rust experience.'
    );

    expect(result.matched).toStrictEqual([]);
    expect(result.missing).toStrictEqual([
      'requires',
      'kubernetes',
      'rust',
      'experience',
    ]);
    expect(result.score).toBe(0);
  });
});
