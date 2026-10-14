import { describe, expect, it } from 'vitest';

import { createBlankResume, createFixtureResume } from '../resume';
import { exportResumeAsDocx } from './toDocx';

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function magicBytes(blob: Blob, length: number): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return new TextDecoder('ascii').decode(buffer.slice(0, length));
}

describe('exportResumeAsDocx', () => {
  it('produces a non-empty .docx (ZIP) blob for the fixture resume', async () => {
    const blob = await exportResumeAsDocx(createFixtureResume());

    expect(blob.type).toBe(DOCX_MIME_TYPE);
    expect(blob.size).toBeGreaterThan(0);
    expect(await magicBytes(blob, 2)).toBe('PK');
  });

  it('does not throw for a blank resume with no sections', async () => {
    const blob = await exportResumeAsDocx(createBlankResume());

    expect(blob.size).toBeGreaterThan(0);
    expect(await magicBytes(blob, 2)).toBe('PK');
  });
});
