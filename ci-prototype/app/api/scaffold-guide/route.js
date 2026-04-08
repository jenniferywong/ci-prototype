import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  const { name, topic, subject, struggle } = await request.json();
  console.log('[scaffold-guide] name:', name, '| topic:', topic);

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: `Create a concise teacher implementation guide for the "${name}" instructional strategy applied to teaching "${topic}" (${subject} class). Students are struggling with: "${struggle}". Return JSON only, no markdown: { "title": string, "overview": string (2-3 sentences explaining the strategy and why it fits this topic), "steps": [ { "step": string (short imperative label), "description": string (1-2 sentences), "example": string (concrete example specific to ${topic}) } ] (4-6 steps), "tip": string (one practical classroom tip for this specific lesson) }`,
      }],
    });

    const data = parseJSON(message.content[0].text);
    return Response.json(data);
  } catch (err) {
    console.error('[scaffold-guide] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
