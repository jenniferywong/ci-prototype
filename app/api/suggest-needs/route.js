import Anthropic from '@anthropic-ai/sdk';

const DEFAULT = ['Some are below grade level', 'New to this concept', 'Mixed ability levels'];

export async function POST(request) {
  const { topic, subject, grade } = await request.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A ${grade || 'middle school'} ${subject || ''} teacher is making a quiz about "${topic}". Generate exactly 3 short student struggle descriptions they might type — specific to this topic, 6-12 words each, realistic classroom challenges. Return JSON only: {"suggestions": ["...", "...", "..."]}`,
      }],
    });
    const text = message.content[0].text
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const data = JSON.parse(text);
    if (Array.isArray(data.suggestions) && data.suggestions.length >= 3) {
      return Response.json({ suggestions: data.suggestions.slice(0, 3) });
    }
    return Response.json({ suggestions: DEFAULT });
  } catch {
    return Response.json({ suggestions: DEFAULT });
  }
}
