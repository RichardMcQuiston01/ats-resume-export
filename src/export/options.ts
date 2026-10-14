/** Options shared by the exporters. */
export interface ExportOptions {
  /**
   * Render `**bold**` and `*italic*` in highlight text as styled text
   * (and strip the markers in plain-text output). Off by default, so a literal
   * `*` in a highlight stays as typed.
   */
  richText?: boolean;
}
