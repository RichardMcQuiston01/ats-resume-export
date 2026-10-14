# CHANGELOG

## 0.3.1

- Fixed a dangling separator in date ranges: an entry with only one date (for example an education entry with just a graduation date) now shows `(2018-05)` instead of `( - 2018-05)`. The same applies to a lone start date.
- Fixed experience and education entries never printing their `location`. It now follows the heading after a comma ("Senior Engineer — Acme, Remote") in the HTML, DOCX, PDF, and plain-text exporters. Entries without a location are unchanged.
- Note: output changes for entries that have a location or are missing a start or end date; everything else is identical to 0.3.0.

## 0.3.0

- Added configurable presentation for the HTML, DOCX, and PDF exporters through `ExportOptions.style`: font family (`sans-serif`, `serif`, `monospace`), body, name, and heading sizes, line spacing, section and entry spacing, margins, paper size (`letter` or `a4`), and heading case. Pass a preset (`'compact'`, `'standard'`, `'comfortable'`) or an object of options, optionally on top of a preset.
- Output is unchanged unless you set a style: `'standard'` and an empty style are byte-for-byte the built-in look.
- ATS safety is preserved by design: the document stays a single column of real text with real headings, fonts come from the standard set every system has, and values outside safe ranges are rejected with a descriptive `RangeError` (`STYLE_LIMITS`). Plain text ignores style.
- New exports: `resolveExportStyle`, `validateExportStyle`, `checkExportStyle` (warns about choices that are legal but hard on human readers, such as body text under 10 pt), `STYLE_LIMITS`, `STYLE_PRESETS`, `FONT_FAMILIES`, `PAGE_SIZES`, `HEADING_CASES`, and the related types.

## 0.2.0

- Added an optional `sectionOrder` to `Resume` to reorder the Experience, Education, Skills, Certifications, and Projects sections. All exporters honor it; sections it leaves out follow in their default order, and the summary always comes first. Both validators accept it. New exports: `SECTION_KEYS`, `SectionKey`, `DEFAULT_SECTION_ORDER`, and `resolveSectionOrder`.
- Added opt-in rich-text highlights: pass `{ richText: true }` to the HTML, plain-text, DOCX, and PDF exporters to render `**bold**` and `*italic*` in highlights as styled text (plain text strips the markers). Off by default, so existing output is unchanged. New exports: `parseMarkdownRuns`, `stripMarkdownRuns`, `RichTextRun`, and `ExportOptions`.
- No breaking changes: the resume `schemaVersion` is still `1`, and output is unchanged unless you set `sectionOrder` or `richText`.

## 0.1.0

- Initial release, extracted from the Hired Hand Resume Builder Chrome extension.
- Exporters: HTML, plain text, JSON, DOCX (`/docx`), and PDF (`/pdf`).
- ATS checks: `checkResumeStructure`, `extractKeywords`, and `matchKeywords`.
- Validation: built-in dependency-free validator, Zod schema (`/zod`), and Standard Schema support.
