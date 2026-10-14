import type { AtsFinding } from '../ats';
import type { ValidationIssue } from '../validate';

/**
 * Presentation options for the HTML, DOCX, and PDF exporters.
 *
 * Everything here is safe for Applicant Tracking Systems: the document stays a
 * single column of real text, headings stay headings, and fonts come from a
 * small set every system has. What you can change is how it reads for the
 * humans who review it afterwards: type size, spacing, and margins.
 *
 * Any option left unset keeps the exporter's built-in default, so output is
 * unchanged unless you ask for something.
 */

export const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace'] as const;
/**
 * `sans-serif` is Helvetica/Arial, `serif` is Times, and `monospace` is
 * Courier: the standard fonts every PDF reader, Word install, and browser has.
 */
export type FontFamily = (typeof FONT_FAMILIES)[number];

export const PAGE_SIZES = ['letter', 'a4'] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const HEADING_CASES = ['upper', 'title'] as const;
/** `upper` writes section headings in capitals; `title` as written ("Experience"). */
export type HeadingCase = (typeof HEADING_CASES)[number];

export const STYLE_PRESETS = ['compact', 'standard', 'comfortable'] as const;
export type StylePreset = (typeof STYLE_PRESETS)[number];

export interface ExportStyle {
  fontFamily?: FontFamily | undefined;
  /** Body text size in points. */
  fontSize?: number | undefined;
  /** Name (title) size in points. Defaults to 1.8x `fontSize` when that is set. */
  nameFontSize?: number | undefined;
  /** Section heading size in points. Defaults to `fontSize` when that is set. */
  headingFontSize?: number | undefined;
  /** Line height as a multiple of the font size (1 = tight, 1.5 = airy). */
  lineSpacing?: number | undefined;
  /** Space above each section heading, in points. */
  sectionSpacing?: number | undefined;
  /** Space between entries within a section, in points. */
  entrySpacing?: number | undefined;
  /** Page margin on all four sides, in points (72 = 1 inch). */
  margin?: number | undefined;
  /** Paper size for PDF and DOCX. Unset keeps each format's default. */
  pageSize?: PageSize | undefined;
  headingCase?: HeadingCase | undefined;
}

/** A preset to start from, plus any individual options to override it. */
export interface ExportStyleInput extends ExportStyle {
  preset?: StylePreset | undefined;
}

/** What `ExportOptions.style` accepts: a preset name, or options (optionally on a preset). */
export type StyleOption = StylePreset | ExportStyleInput;

/** Hard limits, in the units documented on `ExportStyle`. Values outside are rejected. */
export const STYLE_LIMITS = {
  fontSize: { min: 8, max: 16 },
  nameFontSize: { min: 12, max: 36 },
  headingFontSize: { min: 8, max: 18 },
  lineSpacing: { min: 1, max: 2 },
  sectionSpacing: { min: 0, max: 36 },
  entrySpacing: { min: 0, max: 24 },
  margin: { min: 18, max: 108 },
} as const;

type NumericStyleKey = keyof typeof STYLE_LIMITS;

const NUMERIC_KEYS = Object.keys(STYLE_LIMITS) as NumericStyleKey[];

const NAME_SIZE_RATIO = 1.8;

/** `standard` is empty on purpose: it means each exporter's built-in look. */
const PRESET_STYLES: Record<StylePreset, ExportStyle> = {
  compact: {
    fontSize: 10,
    lineSpacing: 1.15,
    sectionSpacing: 8,
    entrySpacing: 4,
    margin: 40,
  },
  standard: {},
  comfortable: {
    fontSize: 11,
    lineSpacing: 1.4,
    sectionSpacing: 16,
    entrySpacing: 10,
    margin: 72,
  },
};

/** A style with presets applied and derived sizes filled in. Unset means "exporter default". */
export interface ResolvedExportStyle {
  fontFamily: FontFamily | undefined;
  fontSize: number | undefined;
  nameFontSize: number | undefined;
  headingFontSize: number | undefined;
  lineSpacing: number | undefined;
  sectionSpacing: number | undefined;
  entrySpacing: number | undefined;
  margin: number | undefined;
  pageSize: PageSize | undefined;
  headingCase: HeadingCase | undefined;
  /** True when at least one option is set. False means use the built-in look. */
  customized: boolean;
}

function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown
): value is T {
  return (
    typeof value === 'string' && (allowed as readonly string[]).includes(value)
  );
}

function toInput(style: StyleOption | undefined): ExportStyleInput {
  if (style === undefined) {
    return {};
  }
  return typeof style === 'string' ? { preset: style } : style;
}

/**
 * Checks a style against the allowed names and ranges. Returns one issue per
 * problem (an empty array means the style is valid), each located by option name.
 */
export function validateExportStyle(
  style: StyleOption | undefined
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const input: ExportStyleInput =
    typeof style === 'object' && style !== null ? style : toInput(style);

  if (typeof style === 'string' && !isOneOf(STYLE_PRESETS, style)) {
    issues.push({
      path: ['preset'],
      message: `Unknown style preset "${style}". Use one of: ${STYLE_PRESETS.join(', ')}.`,
    });
  }
  if (input.preset !== undefined && !isOneOf(STYLE_PRESETS, input.preset)) {
    issues.push({
      path: ['preset'],
      message: `Unknown style preset "${String(input.preset)}". Use one of: ${STYLE_PRESETS.join(', ')}.`,
    });
  }

  const enums: Array<[keyof ExportStyle, readonly string[]]> = [
    ['fontFamily', FONT_FAMILIES],
    ['pageSize', PAGE_SIZES],
    ['headingCase', HEADING_CASES],
  ];
  for (const [key, allowed] of enums) {
    const value = input[key];
    if (value !== undefined && !isOneOf(allowed, value)) {
      issues.push({
        path: [key],
        message: `Unsupported ${key} "${String(value)}". Use one of: ${allowed.join(', ')}.`,
      });
    }
  }

  for (const key of NUMERIC_KEYS) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    const { min, max } = STYLE_LIMITS[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      issues.push({
        path: [key],
        message: `${key} must be a finite number, but received ${String(value)}.`,
      });
    } else if (value < min || value > max) {
      issues.push({
        path: [key],
        message: `${key} ${value} is outside the supported range of ${min} to ${max}.`,
      });
    }
  }

  return issues;
}

/**
 * Resolves a style option into concrete values: applies the preset, lets
 * individual options override it, and derives the name and heading sizes from
 * the body size when those are not set.
 *
 * @throws RangeError listing every invalid option, so a bad value fails loudly
 *   instead of producing a broken document.
 */
export function resolveExportStyle(
  style: StyleOption | undefined
): ResolvedExportStyle {
  const issues = validateExportStyle(style);
  if (issues.length > 0) {
    throw new RangeError(
      `Invalid export style: ${issues.map((issue) => issue.message).join(' ')}`
    );
  }

  const input = toInput(style);
  const base = PRESET_STYLES[input.preset ?? 'standard'];
  const merged: ExportStyle = { ...base };
  for (const [key, value] of Object.entries(input)) {
    if (key !== 'preset' && value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }

  const fontSize = merged.fontSize;
  const nameFontSize =
    merged.nameFontSize ??
    (fontSize === undefined
      ? undefined
      : Math.min(
          STYLE_LIMITS.nameFontSize.max,
          Math.round(fontSize * NAME_SIZE_RATIO * 2) / 2
        ));
  const resolved: ResolvedExportStyle = {
    fontFamily: merged.fontFamily,
    fontSize,
    nameFontSize,
    headingFontSize: merged.headingFontSize ?? fontSize,
    lineSpacing: merged.lineSpacing,
    sectionSpacing: merged.sectionSpacing,
    entrySpacing: merged.entrySpacing,
    margin: merged.margin,
    pageSize: merged.pageSize,
    headingCase: merged.headingCase,
    customized: false,
  };
  resolved.customized = Object.entries(resolved).some(
    ([key, value]) => key !== 'customized' && value !== undefined
  );
  return resolved;
}

/**
 * Flags style choices that are allowed but tend to hurt the people reading the
 * document (the ATS itself is unaffected). Invalid values are reported as errors.
 * Mirrors `checkResumeStructure`: same finding shape, so the results can be shown together.
 */
export function checkExportStyle(style: StyleOption | undefined): AtsFinding[] {
  const invalid = validateExportStyle(style);
  if (invalid.length > 0) {
    return invalid.map((issue) => ({
      id: `style.${issue.path.join('.')}`,
      severity: 'error' as const,
      message: issue.message,
    }));
  }

  const resolved = resolveExportStyle(style);
  const findings: AtsFinding[] = [];

  if (resolved.fontSize !== undefined && resolved.fontSize < 10) {
    findings.push({
      id: 'style.fontSize.small',
      severity: 'warning',
      message:
        'Body text under 10 pt is hard to read on screen and in print. 10 to 12 pt is the usual range for a resume.',
    });
  }
  if (resolved.fontSize !== undefined && resolved.fontSize > 12) {
    findings.push({
      id: 'style.fontSize.large',
      severity: 'info',
      message:
        'Body text over 12 pt makes the resume longer, which can push it onto extra pages.',
    });
  }
  if (resolved.lineSpacing !== undefined && resolved.lineSpacing < 1.1) {
    findings.push({
      id: 'style.lineSpacing.tight',
      severity: 'warning',
      message:
        'Line spacing under 1.1 makes dense text hard to scan. About 1.15 to 1.4 reads comfortably.',
    });
  }
  if (resolved.margin !== undefined && resolved.margin < 36) {
    findings.push({
      id: 'style.margin.narrow',
      severity: 'warning',
      message:
        'Margins under 0.5 inch can be clipped by printers and make the page feel cramped.',
    });
  }
  if (
    resolved.headingFontSize !== undefined &&
    resolved.fontSize !== undefined &&
    resolved.headingFontSize < resolved.fontSize
  ) {
    findings.push({
      id: 'style.headingFontSize.small',
      severity: 'info',
      message:
        'Section headings smaller than the body text are harder to pick out when skimming.',
    });
  }
  if (resolved.fontFamily === 'monospace') {
    findings.push({
      id: 'style.fontFamily.monospace',
      severity: 'info',
      message:
        'Monospace fonts are safe for ATS but look informal on a resume. Sans-serif or serif is more usual.',
    });
  }

  return findings;
}
