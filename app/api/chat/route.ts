import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Buffer } from 'buffer';

// POST /api/chat
// Body: { question: string; analysis: any }
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const { question, analysis } = await req.json();
    if (!question || !analysis) {
      return NextResponse.json({ error: 'Missing question or analysis' }, { status: 400 });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    const apiUrl = process.env.OPENROUTER_API_BASE_URL || 'https://openrouter.ai';
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY in environment');
    }
    // Build chat prompt
    const systemPrompt = 'You are a helpful assistant. Use the following document analysis JSON to answer the user question concisely.';
    const userPrompt = `Analysis:\n${JSON.stringify(analysis)}\n\nQuestion: ${question}`;
    // Call OpenRouter Chat Compleitions
    const resp = await fetch(`${apiUrl}/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/o4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Chat API error: ${err}`);
    }
    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}