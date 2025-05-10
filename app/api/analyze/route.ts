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
    // Get all uploaded files (supports multiple file fields named 'file')
    const uploadedItems = formData.getAll('file');
    const files = uploadedItems.filter(item => item instanceof File) as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }
    // Get model selection
    const modelEntry = formData.get('model');
    const model = typeof modelEntry === 'string' ? modelEntry : 'openai/o4-mini';
    // Collect file analyses
    const analyses: Awaited<ReturnType<typeof analyzeDocument>>[] = [];
    for (const item of files) {
      const buf = Buffer.from(await item.arrayBuffer());
      const txt = await parseDocument(item.type, buf);
      analyses.push(await analyzeDocument(txt, model));
    }
    // Collect URL analyses (if any)
    const urlEntries = formData.getAll('url');
    for (const u of urlEntries) {
      if (typeof u !== 'string') continue;
      // fetch remote document
      const resp = await fetch(u);
      if (!resp.ok) continue;
      const contentType = resp.headers.get('content-type') || '';
      const buf = Buffer.from(await resp.arrayBuffer());
      let txt: string;
      if (contentType.includes('application/pdf') || u.toLowerCase().endsWith('.pdf')) {
        txt = await parseDocument('application/pdf', buf);
      } else {
        // strip HTML tags
        const html = buf.toString('utf-8');
        txt = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                  .replace(/<style[\s\S]*?<\/style>/gi, '')
                  .replace(/<[^>]+>/g, ' ');
      }
      analyses.push(await analyzeDocument(txt, model));
    }
    // Combine with file indicators
    // Topics
    const topicMap = new Map<string, Set<number>>();
    analyses.forEach((res, idx) => {
      res.topics.forEach(t => {
        if (!topicMap.has(t)) topicMap.set(t, new Set());
        topicMap.get(t)!.add(idx);
      });
    });
    const topics = Array.from(topicMap.entries()).map(([name, set]) => ({ name, files: Array.from(set) }));
    // Entities with definitions and contexts
    interface EntityInfo { type: string; files: Set<number>; definition: string; contexts: { sentence: string; section?: string }[] }
    const entityMap = new Map<string, EntityInfo>();
    analyses.forEach((res, idx) => {
      res.entities.forEach(e => {
        if (!entityMap.has(e.name)) {
          entityMap.set(e.name, { type: e.type, files: new Set(), definition: e.definition, contexts: [] });
        }
        const info = entityMap.get(e.name)!;
        // track file index
        info.files.add(idx);
        // store contexts (dedupe optional)
        e.contexts.forEach(ctx => info.contexts.push(ctx));
      });
    });
    const entities = Array.from(entityMap.entries()).map(([name, info]) => ({
      name,
      type: info.type,
      files: Array.from(info.files),
      definition: info.definition,
      contexts: info.contexts,
    }));
    // Relationships
    const relMap = new Map<string, { source: string; target: string; type: string; files: Set<number> }>();
    analyses.forEach((res, idx) => {
      res.relationships.forEach(r => {
        const key = `${r.source}||${r.target}||${r.type}`;
        if (!relMap.has(key)) relMap.set(key, { source: r.source, target: r.target, type: r.type, files: new Set() });
        relMap.get(key)!.files.add(idx);
      });
    });
    const relationships = Array.from(relMap.values()).map(r => ({ source: r.source, target: r.target, type: r.type, files: Array.from(r.files) }));
    return NextResponse.json({ topics, entities, relationships });
  } catch (err: any) {
    console.error('Analysis error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
