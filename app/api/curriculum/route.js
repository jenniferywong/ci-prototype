import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('[curriculum] ANTHROPIC_API_KEY present:', !!key);

  const { topic } = await request.json();
  const unitNum = Math.floor(Math.random() * 6) + 1;
  const lessonNum = Math.floor(Math.random() * 12) + 1;

  const client = new Anthropic({ apiKey: key });

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Given this teacher's topic: "${topic}", generate a realistic curriculum unit card a K-12 teacher would recognize. Use Unit ${unitNum}, Lesson ${lessonNum}. Return JSON only, no markdown backticks: { "unit": "Unit ${unitNum}, Lesson ${lessonNum}", "title": "short lesson title related to the topic", "subject": "one of: ELA, Math, Science, Social Studies" }`,
      }],
    });

    const data = parseJSON(message.content[0].text);
    console.log('[curriculum] returned subject:', data.subject);
    return Response.json(data);
  } catch (err) {
    console.error('[curriculum] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
