import { Buffer } from "buffer";

/**
 * Structure of analysis result.
 */
/**
 * Structure of analysis result including definitions and contexts for each entity.
 */
export interface AnalysisResult {
  topics: string[];
  entities: {
    name: string;
    type: string;
    definition: string;                     // AI-provided definition
    contexts: { sentence: string; section?: string }[];  // Occurrences
  }[];
  relationships: { source: string; target: string; type: string }[];
}

/**
 * Analyze a document text using OpenRouter AI and extract structured data.
 * @param text Plain text of the document
 * @returns Parsed AnalysisResult JSON
 */
export async function analyzeDocument(text: string, model: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiUrl = process.env.OPENROUTER_API_BASE_URL || "https://openrouter.ai";
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in environment");
  }

  const prompt = `You are an AI assistant. Extract the following from the document and respond with valid JSON only (no explanatory text, markdown, or code fences):
{
  "topics": [ ... ],
  "entities": [
    {
      "name": "...",
      "type": "...",
      "definition": "a concise description",
      "contexts": [
        { "sentence": "...", "section": "Section Title" },
        ...
      ]
    }
  ],
  "relationships": [ { "source": "...", "target": "...", "type": "..." } ]
}

Document:
"""
${text}
"""`;

  // Use the OpenRouter Chat Completions endpoint to get JSON response
  const resp = await fetch(`${apiUrl}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenRouter API error: ${errText}`);
  }
  const data = await resp.json();
  let content;
  console.log("Full data:", JSON.stringify(data, null, 2));
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    console.log("Message object:", data.choices[0].message);
    content = data.choices[0].message?.content;
    console.log("Content:", content);
  } else {
    console.error("No choices found in response");
  }
  // Sanitize response: extract first JSON object substring
  let result: AnalysisResult;
  try {
    const raw = content?.trim() || '';
    const matched = raw.match(/\{[\s\S]*\}$/);
    const jsonText = matched ? matched[0] : raw;
    result = JSON.parse(jsonText);
  } catch (err: any) {
    throw new Error("Failed to parse JSON from AI response: " + err.message + ". Response was: " + content);
  }
  return result;
}
