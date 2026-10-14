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

/** Reads `word/document.xml` out of a .docx blob. */
export async function docxXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const file = zip.file('word/document.xml');
  if (!file) {
    throw new Error('word/document.xml is missing from the .docx archive');
  }
  return file.async('string');
}

export interface PdfTextRun {
  text: string;
  /** PDF base font name, e.g. "Helvetica-Bold". */
  font: string;
}

const WIN_ANSI_BULLET = 0x95;

function decodeHexString(hex: string): string {
  let text = '';
  for (let index = 0; index < hex.length; index += 2) {
    const code = parseInt(hex.slice(index, index + 2), 16);
    text += code === WIN_ANSI_BULLET ? '•' : String.fromCharCode(code);
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
