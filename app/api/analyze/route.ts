import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { analyzeDocument } from '@/lib/analyzer';
import { parseDocument } from '@/lib/documentParser';
import { Buffer } from 'buffer';

// Use Node.js runtime to allow Buffer and pdf-parse
export const runtime = 'nodejs';

/**
 * POST /api/analyze
 * Accepts multipart/form-data with a file field.
 * Returns structured analysis of the uploaded document.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const uploaded = formData.get('file');
    console.log("uploaded:", uploaded);
    if (!uploaded || !(uploaded instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    // Read uploaded file into a Buffer
    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Extract plain text from document (PDF or text)
    const text = await parseDocument(uploaded.type, buffer);
    // Retrieve selected AI model (default to openai/o4-mini)
    const modelEntry = formData.get('model');
    const model = typeof modelEntry === 'string' ? modelEntry : 'openai/o4-mini';

    const analysis = await analyzeDocument(text, model);
    return NextResponse.json(analysis);
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
