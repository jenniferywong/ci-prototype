import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('[question] ANTHROPIC_API_KEY present:', !!key);

  const { topic, hardestThing } = await request.json();
  console.log('[question] topic:', topic, '| struggle:', hardestThing);

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `A teacher teaching "${topic}" says students are struggling with "${hardestThing}". Generate ONE specific follow-up question to understand the struggle better. Make it concrete and specific to this exact topic — reference the actual subject matter, not generic terms. Return JSON only, no markdown backticks: { "question": string, "options": [string, string, string] }`,
      }],
    });

    const data = parseJSON(message.content[0].text);
    return Response.json(data);
  } catch (err) {
    console.error('[question] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
