# @richardmcquiston01/ats-resume-export

- Author: [Richard McQuiston](mailto:richard.mcquiston@gmail.com)
- Website: https://richardmcquiston.com/

## Table of Contents

| [Overview](#overview) | [Getting Started](#getting-started) | [Buy Me a Coffee](#buy-me-a-coffee) | [License](#license) | [Copyright](#copyright) |

## Overview

Framework agnostic TypeScript package for a exporting resume to an ATS(Applicant Tracking System) compatible format.

[Back to Top](#table-of-contents)

## Getting Started

Features:

- **Exporters:** HTML, plain text, and JSON (main entry); DOCX (`/docx`); PDF (`/pdf`).
- **ATS checks:** structural check and job-description keyword matching.
- **Validation your way:** a built-in dependency-free validator, a Zod schema (`/zod`), or any [Standard Schema](https://standardschema.dev) compatible library.

### Prerequisites

- Node.js 18 or later (or any modern browser).
- Optional peer dependencies, needed only for the entry that uses them: `docx` (`/docx`), `pdf-lib` (`/pdf`), and `zod` v4 (`/zod`).

### Installation

```sh
# From GitHub (builds on install)
npm install github:RichardMcQuiston01/ats-resume-export

# Once published to npm
npm install @richardmcquiston01/ats-resume-export

# Only for the entries you import
npm install docx      # DOCX export
npm install pdf-lib   # PDF export
npm install zod       # Zod schema
```

The main entry has no dependencies, so an app can lazy-load the heavy exporters (`await import('@richardmcquiston01/ats-resume-export/docx')`).

### Usage

```ts
import {
  checkResumeStructure,
  exportResumeAsHtml,
  parseResume,
} from '@richardmcquiston01/ats-resume-export';
import { exportResumeAsPdf } from '@richardmcquiston01/ats-resume-export/pdf';

const resume = parseResume(JSON.parse(rawJson)); // throws a descriptive Error
const html: string = exportResumeAsHtml(resume);
const pdf: Blob = await exportResumeAsPdf(resume);
const findings = checkResumeStructure(resume);
```

DOCX and PDF exporters return a `Blob` (Node 18+ and browsers). In Node, write one with `Buffer.from(await blob.arrayBuffer())`.

#### Section order

Set `sectionOrder` on a resume to reorder the Experience, Education, Skills, Certifications, and Projects sections. Every exporter honors it. Sections you leave out follow in their default order, and the summary always comes first.

```ts
const resume = { ...base, sectionOrder: ['skills', 'experience'] };
// Skills, Experience, then Education, Certifications, Projects
```

#### Rich-text highlights

Pass `{ richText: true }` to render `**bold**` and `*italic*` in highlights as styled text in the HTML, DOCX, and PDF exporters. The plain-text exporter strips the markers. It is off by default, so a literal `*` in a highlight stays as typed.

```ts
const html = exportResumeAsHtml(resume, { richText: true });
const pdf = await exportResumeAsPdf(resume, { richText: true });
```

#### Styling the document

A resume has two readers: an ATS first, then a person. `style` adjusts the part people notice (type size, spacing, margins) without touching what the ATS depends on.

```ts
const pdf = await exportResumeAsPdf(resume, { style: 'comfortable' });

const docx = await exportResumeAsDocx(resume, {
  style: {
    preset: 'compact', // start from a preset...
    fontFamily: 'serif', // ...and override what you like
    fontSize: 11,
    margin: 54, // points; 72 = 1 inch
    pageSize: 'a4',
    headingCase: 'title', // "Experience" instead of "EXPERIENCE"
  },
});
```

| Option                             | Meaning                                                                | Allowed            |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| `fontFamily`                       | `sans-serif` (Helvetica/Arial), `serif` (Times), `monospace` (Courier) | those three        |
| `fontSize`                         | body text, pt                                                          | 8 to 16            |
| `nameFontSize` / `headingFontSize` | pt; default to 1.8x and 1x the body size                               | 12 to 36 / 8 to 18 |
| `lineSpacing`                      | multiple of the font size                                              | 1 to 2             |
| `sectionSpacing` / `entrySpacing`  | space above section headings / between entries, pt                     | 0 to 36 / 0 to 24  |
| `margin`                           | all four sides, pt                                                     | 18 to 108          |
| `pageSize`                         | `letter` or `a4` (PDF and DOCX)                                        | those two          |
| `headingCase`                      | `upper` or `title`                                                     | those two          |

Presets: `compact` (tighter, fits more per page), `standard` (the built-in look, and the default), and `comfortable` (roomier). Anything you leave unset keeps the exporter's default, so output only changes when you ask for it. Plain text has no layout and ignores `style`.

**What always stays ATS-safe.** Style never changes the structure: one column of real, selectable text (no images of text, tables, text boxes, headers, or footers), real section headings, a standard-font family that every PDF reader, Word install, and browser has, and the same reading order. Out-of-range values throw a descriptive `RangeError` rather than producing a broken document.

`checkExportStyle(style)` flags choices that are allowed but hard on human readers (body text under 10 pt, line spacing under 1.1, margins under half an inch) using the same finding shape as `checkResumeStructure`, so you can show both together.

#### Choosing a validator

| Style           | Import                                                                | Extra dependency |
| --------------- | --------------------------------------------------------------------- | ---------------- |
| Built-in        | `parseResume`, `safeParseResume`, `resumeValidator`                   | none             |
| Zod             | `resumeSchema`, `resumeDraftSchema`, `parseResume` from `/zod`        | `zod` v4         |
| Standard Schema | pass any sync schema: `checkResumeStructure(r, { schema: mySchema })` | your library     |

The plain `Resume` types are the source of truth. The Zod schema is verified at compile time to infer exactly the same type, and a parity test suite checks that both validators accept and reject the same inputs.

### Examples

Validate with Zod and run the ATS structure check against the same schema:

```ts
import { checkResumeStructure } from '@richardmcquiston01/ats-resume-export';
import { resumeSchema } from '@richardmcquiston01/ats-resume-export/zod';

const resume = resumeSchema.parse(JSON.parse(rawJson));
const findings = checkResumeStructure(resume, { schema: resumeSchema });
```

Match a resume against a job description:

```ts
import { matchKeywords } from '@richardmcquiston01/ats-resume-export';

const result = matchKeywords(resume, jobDescriptionText);
```

### Development

```sh
npm install
npm run ci   # lint, format check, typecheck, tests, build
```

### Releasing

Releases publish to npm from GitHub Actions (`.github/workflows/publish.yml`) when a version tag is pushed.

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry, then merge to `main`.
2. Tag the merge commit on `main` and push the tag:

   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. The workflow checks that the tagged commit is on `main` and that the tag matches `package.json`, runs `npm run ci`, and publishes with provenance. A tag on any other branch fails without publishing.

One-time setup: add an npm automation token as the `NPM_TOKEN` secret in the repo's `npm` environment (Settings, Environments), and make sure the `@richardmcquiston01` scope is owned by your npm account.

[Back to Top](#table-of-contents)

## Buy Me a Coffee

If this app, code, or repository has helped you or someone you know, please consider donating. I appreciate any help to offset the costs of development and/or AI Credits.

[**Donate via Stripe**](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800), or scan:

[![Donate via Stripe](./donate.svg)](https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800)

[Back to Top](#table-of-contents)

## License

Apache 2

[Back to Top](#table-of-contents)

## Copyright

(c)2026 Richard McQuiston. All rights reserved.

[Back to Top](#table-of-contents)
