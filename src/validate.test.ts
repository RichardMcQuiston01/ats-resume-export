import { describe, expect, it } from 'vitest';

import { checkResumeStructure } from './ats';
import { createFixtureResume } from './resume';
import type { Resume } from './types';
import { parseResume, resumeValidator, safeParseResume } from './validate';
import { resumeSchema } from './zod';

type Mutation = [name: string, mutate: (resume: Resume) => void];

/** Assigns a deliberately wrong-typed value to a typed field. */
const WRONG = (value: unknown): never => value as never;

const INVALID_MUTATIONS: Mutation[] = [
  ['bad schemaVersion', (r) => (r.schemaVersion = WRONG(2))],
  ['bad id', (r) => (r.id = 'nope')],
  ['bad createdAt', (r) => (r.createdAt = '2026-01-01')],
  ['empty fullName', (r) => (r.contact.fullName = '')],
  ['bad email', (r) => (r.contact.email = 'not-an-email')],
  [
    'bad link url',
    (r) => {
      const [link] = r.contact.links;
      if (link) link.url = 'nope';
    },
  ],
  [
    'bad startDate',
    (r) => {
      const [entry] = r.experience;
      if (entry) entry.startDate = '2024-13';
    },
  ],
  [
    'missing endDate when not current',
    (r) => {
      const [entry] = r.experience;
      if (entry) {
        entry.isCurrent = false;
        delete entry.endDate;
      }
    },
  ],
  [
    'no highlights',
    (r) => {
      const [entry] = r.experience;
      if (entry) entry.highlights = [];
    },
  ],
  [
    'empty skills',
    (r) => {
      const [group] = r.skills;
      if (group) group.skills = [];
    },
  ],
  [
    'bad credentialUrl',
    (r) => {
      const [cert] = r.certifications;
      if (cert) cert.credentialUrl = 'x';
    },
  ],
  [
    'bad screenshot',
    (r) => {
      const [project] = r.projects;
      if (project) {
        project.screenshots = [{ id: r.id, dataUrl: 'x', altText: 'a' }];
      }
    },
  ],
  [
    'bad relationship',
    (r) => {
      const [recommendation] = r.portfolio.recommendations;
      if (recommendation) recommendation.relationship = WRONG('boss');
    },
  ],
  ['non-object contact', (r) => (r.contact = WRONG('x'))],
];

function cloneFixture(): Resume {
  return JSON.parse(JSON.stringify(createFixtureResume())) as Resume;
}

describe('plain validator', () => {
  it('accepts the fixture and round-trips it unchanged', () => {
    const fixture = createFixtureResume();
    expect(parseResume(JSON.parse(JSON.stringify(fixture)))).toStrictEqual(
      fixture
    );
  });

  it('defaults omitted collections to empty arrays', () => {
    const fixture = createFixtureResume();
    const result = safeParseResume({
      schemaVersion: 1,
      id: fixture.id,
      createdAt: fixture.createdAt,
      updatedAt: fixture.updatedAt,
      contact: { fullName: 'A', email: 'a@example.com' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experience).toStrictEqual([]);
      expect(result.data.contact.links).toStrictEqual([]);
      expect(result.data.portfolio).toStrictEqual({
        featuredProjectIds: [],
        recommendations: [],
      });
    }
  });

  it('throws a descriptive error listing the failing paths', () => {
    expect(() => parseResume({})).toThrow(/Invalid resume:.*schemaVersion/);
  });

  it('works as a Standard Schema', () => {
    const result = resumeValidator['~standard'].validate(createFixtureResume());
    expect(result instanceof Promise).toBe(false);
    expect((result as { issues?: unknown }).issues).toBeUndefined();
  });
});

describe('plain validator and zod schema agree', () => {
  it('both accept the fixture', () => {
    const input = cloneFixture();
    expect(resumeSchema.safeParse(input).success).toBe(true);
    expect(safeParseResume(input).success).toBe(true);
  });

  it.each(INVALID_MUTATIONS)('both reject: %s', (_name, mutate) => {
    const input = cloneFixture();
    mutate(input);
    expect(resumeSchema.safeParse(input).success).toBe(false);
    expect(safeParseResume(input).success).toBe(false);
  });
});

describe('checkResumeStructure with a Zod schema (Standard Schema)', () => {
  it('reports the same issue ids with either validator', () => {
    const resume = createFixtureResume();
    resume.contact.email = 'not-an-email';

    const plain = checkResumeStructure(resume).map((finding) => finding.id);
    const withZod = checkResumeStructure(resume, { schema: resumeSchema }).map(
      (finding) => finding.id
    );

    expect(withZod).toStrictEqual(plain);
    expect(withZod).toContain('contact.email');
  });
});
