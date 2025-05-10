import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { parseDocument } from '@/lib/documentParser';
import { analyzeDocument } from '@/lib/analyzer';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';

/**
 * POST /api/analyze-url
 * Body: { url: string; model?: string }
 * Fetches document at URL (PDF or HTML), extracts text, and returns analysis.
 */
export async function POST(req: NextRequest) {
  try {
    const { url, model } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }
    const chosenModel = typeof model === 'string' ? model : 'openai/o4-mini';
    // Fetch the remote resource
    const resp = await fetch(url);
    if (!resp.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${resp.status}` }, { status: 400 });
    }
    const contentType = resp.headers.get('content-type') || '';
    const arr = new Uint8Array(await resp.arrayBuffer());
    let text: string;
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      // PDF
      text = await parseDocument('application/pdf', Buffer.from(arr.buffer));
    } else {
      // Treat as HTML or text
      const html = Buffer.from(arr.buffer).toString('utf-8');
      // Simple strip of scripts/styles and tags
      const cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ');
      text = cleaned;
    }
    // Analyze extracted text
    const result = await analyzeDocument(text, chosenModel);
    // Wrap in single-file response
    const topics = result.topics.map(name => ({ name, files: [0] }));
    const entities = result.entities.map(e => ({
      name: e.name,
      type: e.type,
      definition: e.definition,
      contexts: e.contexts,
      files: [0],
    }));
    const relationships = result.relationships.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type,
      files: [0],
    }));
    return NextResponse.json({ topics, entities, relationships });
  } catch (err: any) {
    console.error('Analyze URL error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}