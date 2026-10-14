# CHANGELOG

## 0.2.0

- Added an optional `sectionOrder` to `Resume` to reorder the Experience, Education, Skills, Certifications, and Projects sections. All exporters honor it; sections it leaves out follow in their default order, and the summary always comes first. Both validators accept it. New exports: `SECTION_KEYS`, `SectionKey`, `DEFAULT_SECTION_ORDER`, and `resolveSectionOrder`.
- Added opt-in rich-text highlights: pass `{ richText: true }` to the HTML, plain-text, DOCX, and PDF exporters to render `**bold**` and `*italic*` in highlights as styled text (plain text strips the markers). Off by default, so existing output is unchanged. New exports: `parseMarkdownRuns`, `stripMarkdownRuns`, `RichTextRun`, and `ExportOptions`.
- No breaking changes: the resume `schemaVersion` is still `1`, and output is unchanged unless you set `sectionOrder` or `richText`.

## 0.1.0

- Initial release, extracted from the Hired Hand Resume Builder Chrome extension.
- Exporters: HTML, plain text, JSON, DOCX (`/docx`), and PDF (`/pdf`).
- ATS checks: `checkResumeStructure`, `extractKeywords`, and `matchKeywords`.
- Validation: built-in dependency-free validator, Zod schema (`/zod`), and Standard Schema support.
