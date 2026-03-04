import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

async function callClaude(client, systemPrompt) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: 'Generate the quiz now.' }],
  });
  return parseJSON(message.content[0].text);
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('[generate] ANTHROPIC_API_KEY present:', !!key, '| starts with:', key?.slice(0, 12));

  const {
    topic, subject, grade, fluencyAnswer, struggleAnswer,
    hardestThing, scaffolds, questionType, numQuestions,
    className, pageContextTitle, pageContextPreview,
  } = await request.json();

  console.log('[generate] params:', { topic, subject, grade, questionType, numQuestions, className });

  const scaffoldList = Array.isArray(scaffolds) && scaffolds.length > 0
    ? scaffolds.join('; ')
    : 'None specified';

  const qType = questionType || 'Multiple Choice';
  const nQ = numQuestions || 10;
  const classContext = className ? ` (${className})` : '';
  const pageCtx = pageContextTitle
    ? ` The teacher is looking at this source: "${pageContextTitle}"${pageContextPreview ? ` — ${pageContextPreview.slice(0, 200)}` : ''}. Ground quiz questions in this specific material where possible.`
    : '';

  const systemPrompt = `You are Brisk, an AI assistant for K-12 teachers. Generate a ${nQ}-question ${qType} quiz about ${topic} for ${grade || '8th grade'} students studying ${subject}${classContext}. The students are struggling with: ${hardestThing}. Their specific challenge: ${struggleAnswer}. Reading/fluency support needed: ${fluencyAnswer}. Apply these scaffolds in the quiz design: ${scaffoldList}. Open with a warm-up section using the first scaffold strategy. Make questions rigorous — analysis and application, not just recall. For ${qType} questions include 4 options; for True/False include exactly ["True", "False"]; for Short Answer use an empty options array. Each question must include a one-sentence explanation of why the correct answer is right.${pageCtx} Return JSON only, no markdown backticks: { "title": string, "warmup": [{"term": string, "definition": string}], "questions": [{"question": string, "options": [string], "correct": string, "explanation": string}] }`;

  const client = new Anthropic({ apiKey: key });

  let data;
  try {
    data = await callClaude(client, systemPrompt);
  } catch (firstErr) {
    console.warn('[generate] first attempt failed:', firstErr.message, '— retrying…');
    try {
      data = await callClaude(client, systemPrompt);
    } catch (retryErr) {
      console.error('[generate] retry also failed:', retryErr.message);
      return Response.json({ error: 'retry_failed' }, { status: 500 });
    }
  }

  return Response.json(data);
}
