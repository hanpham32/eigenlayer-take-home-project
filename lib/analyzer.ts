import { Buffer } from "buffer";

/**
 * Structure of analysis result.
 */
export interface AnalysisResult {
  topics: string[];
  entities: { name: string; type: string }[];
  relationships: { source: string; target: string; type: string }[];
  sections: { title: string; start: number; end: number }[];
  citations: { text: string; reference?: string }[];
}

/**
 * Analyze a document text using OpenRouter AI and extract structured data.
 * @param text Plain text of the document
 * @returns Parsed AnalysisResult JSON
 */
export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const apiUrl = process.env.OPENROUTER_API_BASE_URL || "https://openrouter.ai";
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY in environment");
  }

  const prompt = `You are an AI assistant. Extract the following from the document:
  - topics: key topics & concepts
  - entities: protocols, algorithms, actors (name & type)
  - relationships: source, target, type
  - sections: title, start line, end line
  - citations: text & reference

  Return ONLY a JSON object with keys: topics, entities, relationships, sections, citations.

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
      model: "openai/o4-mini",
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
  let result;
  try {
    result = JSON.parse(content);
  } catch (err: any) {
    throw new Error("Failed to parse JSON from AI response: " + err.message);
  }
  return result;
}
