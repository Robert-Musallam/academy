import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('required training sources', () => {
  it('preserves all 13 training sheets and the diagram before transcription', () => {
    const files = readdirSync(
      new URL('../../content/source/', import.meta.url),
    );
    expect(files.filter((file) => file.endsWith('.PNG'))).toHaveLength(13);
    expect(files).toContain('IMG_1384.jpeg');
  });
});
