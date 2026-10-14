import { describe, expect, it } from 'vitest';

import { createFixtureResume } from './resume/fixtures';
import {
  parseResume,
  RESUME_SCHEMA_VERSION,
  resumeSchema,
  safeParseResume,
} from './zod';

describe('resumeSchema', () => {
  it('accepts a fully populated, valid resume', () => {
    const fixture = createFixtureResume();

    expect(() => parseResume(fixture)).not.toThrow();
  });

  it('round-trips through JSON serialization unchanged', () => {
    const fixture = createFixtureResume();
    const roundTripped = parseResume(
      JSON.parse(JSON.stringify(fixture)) as unknown
    );

    expect(roundTripped).toStrictEqual(fixture);
  });

  it('defaults optional collections to empty arrays', () => {
    const fixture = createFixtureResume();
    const minimal = safeParseResume({
      schemaVersion: RESUME_SCHEMA_VERSION,
      id: fixture.id,
      createdAt: fixture.createdAt,
      updatedAt: fixture.updatedAt,
      contact: {
        fullName: fixture.contact.fullName,
        email: fixture.contact.email,
      },
    });

    expect(minimal.success).toBe(true);
    if (minimal.success) {
      expect(minimal.data.experience).toStrictEqual([]);
      expect(minimal.data.contact.links).toStrictEqual([]);
    }
  });

  it('rejects an unsupported schema version', () => {
    const fixture = createFixtureResume();
    const result = safeParseResume({ ...fixture, schemaVersion: 999 });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid contact email', () => {
    const fixture = createFixtureResume();
    const result = safeParseResume({
      ...fixture,
      contact: { ...fixture.contact, email: 'not-an-email' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects a startDate that is not in YYYY-MM format', () => {
    const fixture = createFixtureResume();
    const [firstExperience] = fixture.experience;
    if (!firstExperience) {
      throw new Error('Fixture resume must have at least one job.');
    }

    const result = safeParseResume({
      ...fixture,
      experience: [{ ...firstExperience, startDate: '03/2022' }],
    });

    expect(result.success).toBe(false);
  });

  it('requires an endDate when a job is not marked as current', () => {
    const fixture = createFixtureResume();
    const [firstExperience] = fixture.experience;
    if (!firstExperience) {
      throw new Error('Fixture resume must have at least one job.');
    }

    const result = safeParseResume({
      ...fixture,
      experience: [
        { ...firstExperience, isCurrent: false, endDate: undefined },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one highlight per job', () => {
    const fixture = createFixtureResume();
    const [firstExperience] = fixture.experience;
    if (!firstExperience) {
      throw new Error('Fixture resume must have at least one job.');
    }

    const result = resumeSchema.safeParse({
      ...fixture,
      experience: [{ ...firstExperience, highlights: [] }],
    });

    expect(result.success).toBe(false);
  });

  it('defaults portfolio and project extras for older v1 resumes', () => {
    const fixture = createFixtureResume();
    const { portfolio: _portfolio, ...withoutPortfolio } = fixture;
    const [project] = fixture.projects;
    if (!project) {
      throw new Error('Fixture resume must have at least one project.');
    }
    const legacyProject = {
      id: project.id,
      name: project.name,
      description: project.description,
    };

    const result = safeParseResume({
      ...withoutPortfolio,
      projects: [legacyProject],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portfolio).toStrictEqual({
        featuredProjectIds: [],
        recommendations: [],
      });
      expect(result.data.projects[0]?.techStack).toStrictEqual([]);
      expect(result.data.projects[0]?.screenshots).toStrictEqual([]);
    }
  });

  it('rejects a screenshot that is not a base64 image data URL', () => {
    const fixture = createFixtureResume();
    const [project] = fixture.projects;
    const [screenshot] = project?.screenshots ?? [];
    if (!project || !screenshot) {
      throw new Error('Fixture resume must have a project screenshot.');
    }

    const result = safeParseResume({
      ...fixture,
      projects: [
        {
          ...project,
          screenshots: [
            { ...screenshot, dataUrl: 'https://example.com/shot.png' },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a recommendation with an unknown relationship', () => {
    const fixture = createFixtureResume();
    const [recommendation] = fixture.portfolio.recommendations;
    if (!recommendation) {
      throw new Error('Fixture resume must have a recommendation.');
    }

    const result = safeParseResume({
      ...fixture,
      portfolio: {
        ...fixture.portfolio,
        recommendations: [{ ...recommendation, relationship: 'stranger' }],
      },
    });

    expect(result.success).toBe(false);
  });
});
