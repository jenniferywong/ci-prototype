import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

export async function POST(request) {
  const { base64, mediaType } = await request.json();
  console.log('[analyze-screenshot] mediaType:', mediaType, '| base64 length:', base64?.length);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: 'Look at this screenshot of educational content. Extract: what subject is being taught (Math, Science, ELA, Social Studies, or other), what specific topic is visible, what grade level appears appropriate. Return JSON only, no markdown: { "subject": string, "topic": string, "grade": string, "description": string (1 sentence summary of what you see) }',
          },
        ],
      }],
    });

    const data = parseJSON(message.content[0].text);
    console.log('[analyze-screenshot] result:', data);
    return Response.json(data);
  } catch (err) {
    console.error('[analyze-screenshot] error:', err.message);
    return Response.json({ subject: '', topic: 'Uploaded content', grade: '', description: '' });
  }
}
