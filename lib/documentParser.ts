// lib/documentParser.ts
// @ts-nocheck
// Use the legacy PDF.js build for Node.js
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Polyfill DOMMatrix in Node.js for PDF.js compatibility
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrix {
    constructor(init?: any) {}
    invertSelf() { return this; }
    multiplySelf(_other?: any) { return this; }
    preMultiplySelf(_other?: any) { return this; }
    translate(_x?: number, _y?: number) { return this; }
    scale(_x?: number, _y?: number) { return this; }
  }
  // @ts-ignore
  globalThis.DOMMatrix = DOMMatrix;
}
// Configure PDF.js fake-worker to use the actual worker module from node_modules
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
const requireModule = createRequire(import.meta.url);
if (pdfjsLib.GlobalWorkerOptions) {
  // Resolve the path to the legacy worker file
  const workerPath = requireModule.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  // Set workerSrc to a file:// URL so import() can load it
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

/**
 * Extract plain text from a document buffer based on content type.
 * Currently supports PDF and plain text.
 * 
 * @param mimeType e.g. 'application/pdf', 'text/plain'
 * @param buffer Buffer of file contents
 * @returns Promise resolving to extracted document text
 */
export async function parseDocument(
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  if (mimeType === 'application/pdf') {
    // PDF.js in Node requires a Uint8Array rather than a Buffer
    const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((item: any) => item.str).join(' ');
      fullText += text + '\n';
    }
    return fullText;
  } else {
    // Assume utf-8 text for other types
    return buffer.toString('utf-8');
  }
}

