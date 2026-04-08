import Anthropic from '@anthropic-ai/sdk';

const DEFAULT = ['Sentence frames for written responses', 'Vocabulary word bank with definitions', 'Step-by-step worked example at the top'];

export async function POST(request) {
  const { topic, subject, grade, strategy, fluencyAnswer, struggleAnswer } = await request.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `A ${grade || 'middle school'} ${subject || ''} teacher is making a quiz about "${topic}". Their main scaffold is ${strategy || 'scaffolded notes'}. Student needs: ${fluencyAnswer || 'mixed'}, ${struggleAnswer || 'general struggles'}. Generate exactly 3 short additional scaffold examples the teacher might want to add to the quiz — specific to this topic and student needs, 5-10 words each, realistic and practical. Return JSON only: {"suggestions": ["...", "...", "..."]}`,
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
