import JSZip from 'jszip';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { decodePDFRawStream } from 'pdf-lib';

/** Returns the markers sorted by where they first appear in `text`. */
export function orderOf(text: string, markers: string[]): string[] {
  return markers
    .map((marker) => ({ marker, index: text.indexOf(marker) }))
    .filter((entry) => entry.index >= 0)
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.marker);
}

/** Reads a part (default `word/document.xml`) out of a .docx blob. */
export async function docxXml(
  blob: Blob,
  part: string = 'word/document.xml'
): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file(part);
  if (!file) {
    throw new Error(`${part} is missing from the .docx archive`);
  }
  return file.async('string');
}

/** Page count and the size of the first page (in points) of a PDF blob. */
export async function pdfPageInfo(
  blob: Blob
): Promise<{ count: number; width: number; height: number }> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const first = doc.getPages()[0]?.getSize() ?? { width: 0, height: 0 };
  return { count: doc.getPageCount(), ...first };
}

export interface PdfTextRun {
  text: string;
  /** PDF base font name, e.g. "Helvetica-Bold". */
  font: string;
}

/** WinAnsi bytes in the 0x80 to 0x9F range that differ from Latin-1 (the punctuation resumes use). */
const WIN_ANSI_PUNCTUATION: Record<number, string> = {
  0x95: '•',
  0x96: '–',
  0x97: '—',
};

function decodeHexString(hex: string): string {
  let text = '';
  for (let index = 0; index < hex.length; index += 2) {
    const code = parseInt(hex.slice(index, index + 2), 16);
    text += WIN_ANSI_PUNCTUATION[code] ?? String.fromCharCode(code);
  }
  return text;
}

/**
 * Extracts every string drawn on a PDF, in order, with the base font each was
 * drawn in. pdf-lib writes text as `<hex> Tj` operators after `/Name size Tf`.
 */
export async function pdfTextRuns(blob: Blob): Promise<PdfTextRun[]> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const runs: PdfTextRun[] = [];

  for (const page of doc.getPages()) {
    const fonts = page.node
      .Resources()
      ?.lookupMaybe(PDFName.of('Font'), PDFDict);
    const baseFontOf = (resourceName: string): string => {
      const font = fonts?.lookupMaybe(PDFName.of(resourceName), PDFDict);
      const baseFont = font?.lookupMaybe(PDFName.of('BaseFont'), PDFName);
      return baseFont ? baseFont.decodeText() : 'unknown';
    };

    const contents = page.node.Contents();
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => doc.context.lookup(ref))
        : [contents];
    let currentFont = 'unknown';
    for (const stream of streams) {
      if (!(stream instanceof PDFRawStream)) {
        continue;
      }
      const content = Buffer.from(decodePDFRawStream(stream).decode()).toString(
        'latin1'
      );
      for (const match of content.matchAll(
        /\/(\S+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj/g
      )) {
        if (match[1] !== undefined) {
          currentFont = baseFontOf(match[1]);
        } else if (match[2] !== undefined) {
          runs.push({ text: decodeHexString(match[2]), font: currentFont });
        }
      }
    }
  }
  return runs;
}

/** All text drawn on a PDF, joined in drawing order. */
export async function pdfText(blob: Blob): Promise<string> {
  return (await pdfTextRuns(blob)).map((run) => run.text).join('\n');
}

/** Where the first line of text on the first page is placed, in points from the bottom-left. */
export async function pdfFirstTextOrigin(
  blob: Blob
): Promise<{ x: number; y: number }> {
  const doc = await PDFDocument.load(await blob.arrayBuffer());
  const contents = doc.getPages()[0]?.node.Contents();
  const stream =
    contents instanceof PDFArray
      ? doc.context.lookup(contents.asArray()[0])
      : contents;
  if (!(stream instanceof PDFRawStream)) {
    throw new Error('The first page has no readable content stream');
  }
  const content = Buffer.from(decodePDFRawStream(stream).decode()).toString(
    'latin1'
  );
  const match = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/.exec(content);
  if (!match?.[1] || !match[2]) {
    throw new Error('No positioned text found on the first page');
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}
