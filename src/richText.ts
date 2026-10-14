/**
 * Markdown-style `**bold**` and `*italic*` markup for highlight text.
 * Deliberately simple: no nesting and no other Markdown syntax.
 */
export interface RichTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

const RUN_PATTERN = /\*\*(.+?)\*\*|\*(.+?)\*/g;

/** Splits `text` into runs, turning `**bold**` and `*italic*` into styled runs. */
export function parseMarkdownRuns(text: string): RichTextRun[] {
  const runs: RichTextRun[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(RUN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({
        text: text.slice(lastIndex, index),
        bold: false,
        italic: false,
      });
    }
    const bold = match[1];
    const italic = match[2];
    if (bold !== undefined) {
      runs.push({ text: bold, bold: true, italic: false });
    } else if (italic !== undefined) {
      runs.push({ text: italic, bold: false, italic: true });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: false, italic: false });
  }
  if (runs.length === 0) {
    runs.push({ text, bold: false, italic: false });
  }
  return runs;
}

/** Returns `text` with `**bold**` / `*italic*` markers removed. */
export function stripMarkdownRuns(text: string): string {
  return parseMarkdownRuns(text)
    .map((run) => run.text)
    .join('');
}
