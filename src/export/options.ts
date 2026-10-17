import type { ExportDetails } from './details';
import type { StyleOption } from './style';

/** Options shared by the exporters. */
export interface ExportOptions {
  /**
   * Render `**bold**` and `*italic*` in highlight text as styled text
   * (and strip the markers in plain-text output). Off by default, so a literal
   * `*` in a highlight stays as typed.
   */
  richText?: boolean;
  /**
   * Presentation (font, sizes, spacing, margins) for the HTML, DOCX, and PDF
   * exporters; plain text has no layout and ignores it. A preset name
   * (`'compact'`, `'standard'`, `'comfortable'`) or an object of options.
   * Unset keeps each exporter's built-in look.
   */
  style?: StyleOption;
  /**
   * Entry details the exporters leave out by default (project links, tech
   * stack and outcome, certification credential URLs), each switched on and
   * placed independently. Applies to the HTML, DOCX, PDF, and plain-text
   * exporters. Unset prints none of them, so output is unchanged.
   */
  details?: ExportDetails;
}
