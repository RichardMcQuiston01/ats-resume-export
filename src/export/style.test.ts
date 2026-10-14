import { describe, expect, it } from 'vitest';

import {
  checkExportStyle,
  resolveExportStyle,
  STYLE_LIMITS,
  validateExportStyle,
} from './style';

describe('resolveExportStyle', () => {
  it('leaves everything unset for no style or the standard preset', () => {
    for (const style of [undefined, 'standard' as const, {}]) {
      const resolved = resolveExportStyle(style);

      expect(resolved.customized).toBe(false);
      expect(resolved.fontSize).toBeUndefined();
      expect(resolved.margin).toBeUndefined();
    }
  });

  it('applies a preset by name', () => {
    const resolved = resolveExportStyle('comfortable');

    expect(resolved.customized).toBe(true);
    expect(resolved.fontSize).toBe(11);
    expect(resolved.lineSpacing).toBe(1.4);
    expect(resolved.margin).toBe(72);
  });

  it('lets individual options override the preset', () => {
    const resolved = resolveExportStyle({ preset: 'compact', fontSize: 11 });

    expect(resolved.fontSize).toBe(11);
    expect(resolved.lineSpacing).toBe(1.15);
  });

  it('derives the name and heading sizes from the body size', () => {
    const resolved = resolveExportStyle({ fontSize: 12 });

    expect(resolved.nameFontSize).toBe(21.5);
    expect(resolved.headingFontSize).toBe(12);
  });

  it('prefers explicit name and heading sizes over the derived ones', () => {
    const resolved = resolveExportStyle({
      fontSize: 12,
      nameFontSize: 24,
      headingFontSize: 13,
    });

    expect(resolved.nameFontSize).toBe(24);
    expect(resolved.headingFontSize).toBe(13);
  });

  it('is customized when only a non-size option is set', () => {
    expect(resolveExportStyle({ headingCase: 'title' }).customized).toBe(true);
  });

  it('throws a RangeError naming every invalid option', () => {
    expect(() => resolveExportStyle({ fontSize: 4, margin: 500 })).toThrow(
      RangeError
    );
    expect(() => resolveExportStyle({ fontSize: 4, margin: 500 })).toThrow(
      /fontSize 4 is outside the supported range of 8 to 16.*margin 500 is outside the supported range of 18 to 108/
    );
  });

  it('rejects an unknown preset by name', () => {
    expect(() => resolveExportStyle('fancy' as never)).toThrow(
      /Unknown style preset "fancy". Use one of: compact, standard, comfortable/
    );
  });
});

describe('validateExportStyle', () => {
  it('accepts values at the limits', () => {
    expect(
      validateExportStyle({
        fontSize: STYLE_LIMITS.fontSize.min,
        margin: STYLE_LIMITS.margin.max,
        lineSpacing: STYLE_LIMITS.lineSpacing.min,
      })
    ).toStrictEqual([]);
  });

  it('reports each problem with the option it belongs to', () => {
    const issues = validateExportStyle({
      fontFamily: 'comic-sans' as never,
      lineSpacing: 5,
      pageSize: 'legal' as never,
      headingCase: 'lower' as never,
    });

    expect(issues.map((issue) => issue.path[0])).toStrictEqual([
      'fontFamily',
      'pageSize',
      'headingCase',
      'lineSpacing',
    ]);
    expect(issues[0]?.message).toContain(
      'Use one of: sans-serif, serif, monospace'
    );
  });

  it('rejects non-finite numbers', () => {
    expect(validateExportStyle({ fontSize: Number.NaN })[0]?.message).toContain(
      'must be a finite number'
    );
    expect(
      validateExportStyle({ margin: Number.POSITIVE_INFINITY })[0]?.message
    ).toContain('must be a finite number');
  });
});

describe('checkExportStyle', () => {
  it('has nothing to say about the built-in look or the presets', () => {
    for (const style of [
      undefined,
      'standard',
      'compact',
      'comfortable',
    ] as const) {
      expect(checkExportStyle(style)).toStrictEqual([]);
    }
  });

  it('warns about choices that are hard on human readers', () => {
    const ids = checkExportStyle({
      fontSize: 9,
      lineSpacing: 1.05,
      margin: 20,
    }).map((finding) => finding.id);

    expect(ids).toStrictEqual([
      'style.fontSize.small',
      'style.lineSpacing.tight',
      'style.margin.narrow',
    ]);
  });

  it('notes large text, small headings, and monospace as informational', () => {
    const findings = checkExportStyle({
      fontSize: 14,
      headingFontSize: 12,
      fontFamily: 'monospace',
    });

    expect(findings.map((finding) => finding.id)).toStrictEqual([
      'style.fontSize.large',
      'style.headingFontSize.small',
      'style.fontFamily.monospace',
    ]);
    expect(findings.every((finding) => finding.severity === 'info')).toBe(true);
  });

  it('reports invalid values as errors instead of throwing', () => {
    const findings = checkExportStyle({ fontSize: 99 });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'style.fontSize',
      severity: 'error',
    });
  });
});
