import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

async function callClaude(client, system, userContent) {
  console.log('[refine] → sending to Claude. User message length:', userContent.length);
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  const raw = message.content[0].text;
  console.log('[refine] ← raw response length:', raw.length, '| first 120 chars:', raw.slice(0, 120));
  return parseJSON(raw);
}

export async function POST(request) {
  const {
    adjustment, previousQuiz, topic, subject, grade,
    fluencyAnswer, struggleAnswer, hardestThing, scaffoldStrategy,
    scaffolds, questionType, numQuestions, className,
    pageContextBodyText,
  } = await request.json();

  if (!previousQuiz || !previousQuiz.questions?.length) {
    console.error('[refine] previousQuiz missing or empty — aborting');
    return Response.json({ error: 'missing_previous_quiz' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const nQ = numQuestions || 10;
  const qType = questionType || 'Multiple Choice';

  console.log('[refine] adjustment:', adjustment);
  console.log('[refine] previousQuiz questions:', previousQuiz.questions.length, '| Q1:', previousQuiz.questions[0]?.question?.slice(0, 80));

  const system = `You are Brisk, an AI assistant for K-12 teachers. You modify existing quizzes based on teacher requests. Preserve the warmupLabel field from the existing quiz. Return JSON only, no markdown backticks: { "title": string, "warmupLabel": string, "warmup": [{"term": string, "definition": string}], "questions": [{"question": string, "options": [string], "correct": string, "explanation": string, "hint": string}] }`;

  const userContent = `IMPORTANT: Do not generate a new quiz. Modify the existing quiz below.
Apply ONLY this specific change: "${adjustment}"
Do not add anything else. Do not add hints unless explicitly asked. Do not change anything that was not requested. Apply the change to every question.

Existing quiz to modify:
${JSON.stringify(previousQuiz, null, 2)}

Return the complete modified quiz in the exact same JSON format with all ${nQ} questions.
Topic: ${topic} | Subject: ${subject} | Grade: ${grade || '8th grade'}${className ? ` | Class: ${className}` : ''}
Students below grade level: ${fluencyAnswer || 'not specified'} | Struggle: ${struggleAnswer || 'not specified'}
Hardest concept: ${hardestThing || 'not specified'} | Scaffold: ${scaffoldStrategy || (Array.isArray(scaffolds) ? scaffolds.join('; ') : 'None')}${pageContextBodyText ? `\n\nSource material:\n${pageContextBodyText.slice(0, 3000)}` : ''}`;

  console.log('[refine] full prompt (first 400 chars):', userContent.slice(0, 400));

  let data;
  try {
    data = await callClaude(client, system, userContent);
  } catch (firstErr) {
    console.warn('[refine] first attempt failed:', firstErr.message, '— retrying…');
    try {
      data = await callClaude(client, system, userContent);
    } catch (retryErr) {
      console.error('[refine] retry also failed:', retryErr.message);
      return Response.json({ error: 'retry_failed' }, { status: 500 });
    }
  }

  console.log('[refine] result Q1:', data?.questions?.[0]?.question?.slice(0, 80));
  console.log('[refine] result Q1 hint:', data?.questions?.[0]?.hint ?? '(no hint)');
  return Response.json(data);
}
