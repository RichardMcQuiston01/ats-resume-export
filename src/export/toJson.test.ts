import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume, parseResume } from '../resume';
import { resumeDraftSchema } from '../zod';
import { exportResumeAsJson } from './toJson';

describe('exportResumeAsJson', () => {
  it('round-trips a fully valid resume through parseResume unchanged', () => {
    const resume = createFixtureResume();

    const reimported = parseResume(JSON.parse(exportResumeAsJson(resume)));

    expect(reimported).toStrictEqual(resume);
  });

  it('round-trips an in-progress (incomplete) resume as a draft unchanged', () => {
    const resume = createBlankResume();

    const reimported = resumeDraftSchema.parse(
      JSON.parse(exportResumeAsJson(resume))
    );

    expect(reimported).toStrictEqual(resume);
  });

  it('produces pretty-printed, human-readable JSON', () => {
    const json = exportResumeAsJson(createFixtureResume());

    expect(json).toContain('\n');
    expect(json.startsWith('{\n')).toBe(true);
  });
});
