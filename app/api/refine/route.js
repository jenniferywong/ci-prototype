import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

export async function POST(request) {
  const { quizData, feedback, topic, subject, grade, scaffolds, questionType, numQuestions } =
    await request.json();

  const scaffoldList = Array.isArray(scaffolds) && scaffolds.length > 0
    ? scaffolds.join('; ')
    : 'None specified';

  const nQ = numQuestions || 10;
  const qType = questionType || 'Multiple Choice';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are Brisk, an AI assistant for K-12 teachers. Refine an existing quiz based on teacher feedback. Keep it as ${nQ} questions of type ${qType} for ${grade || '8th grade'} ${subject} students. Applied scaffolds: ${scaffoldList}. Return JSON only, no markdown backticks: { "title": string, "warmup": [{"term": string, "definition": string}], "questions": [{"question": string, "options": [string], "correct": string}] }`,
      messages: [{
        role: 'user',
        content: `Existing quiz:\n${JSON.stringify(quizData, null, 2)}\n\nTeacher feedback: "${feedback}"\n\nTopic: ${topic}, Subject: ${subject}. Apply the feedback and regenerate.`,
      }],
    });

    const data = parseJSON(message.content[0].text);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
