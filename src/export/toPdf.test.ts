import { describe, expect, it } from 'vitest';

import {
  createBlankExperienceEntry,
  createBlankResume,
  createFixtureResume,
  type Resume,
} from '../resume';
import { exportResumeAsPdf } from './toPdf';

async function magicBytes(blob: Blob, length: number): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return new TextDecoder('ascii').decode(buffer.slice(0, length));
}

describe('exportResumeAsPdf', () => {
  it('produces a non-empty PDF blob for the fixture resume', async () => {
    const blob = await exportResumeAsPdf(createFixtureResume());

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(await magicBytes(blob, 5)).toBe('%PDF-');
  });

  it('does not throw for a blank resume with no sections', async () => {
    const blob = await exportResumeAsPdf(createBlankResume());

    expect(blob.size).toBeGreaterThan(0);
    expect(await magicBytes(blob, 5)).toBe('%PDF-');
  });

  it('paginates onto multiple pages without throwing when content overflows', async () => {
    const resume = createFixtureResume();
    const overflowExperience: Resume['experience'] = Array.from(
      { length: 20 },
      () => ({
        ...createBlankExperienceEntry(),
        company: 'Overflow Co',
        title: 'Staff Engineer',
        startDate: '2020-01',
        isCurrent: true,
        highlights: [
          'A long accomplishment line meant to wrap across more than one rendered line in the PDF to exercise pagination logic thoroughly.',
        ],
      })
    );
    resume.experience = [...resume.experience, ...overflowExperience];

    const blob = await exportResumeAsPdf(resume);

    expect(blob.size).toBeGreaterThan(0);
    expect(await magicBytes(blob, 5)).toBe('%PDF-');
  });
});
