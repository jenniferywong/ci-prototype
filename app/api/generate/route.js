import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  return JSON.parse(
    text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  );
}

async function callClaude(client, systemPrompt, userMsg = 'Generate now.') {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  });
  return parseJSON(message.content[0].text);
}

// Maps a strategy name to how the warm-up should be structured
function warmupInstructions(strategyName, strategyDesc) {
  const s = (strategyName || '').toLowerCase();
  if (!s) return {
    label: 'Warm-Up',
    instruction: 'Open with 3–5 key terms and definitions relevant to the topic.',
  };
  if (s.includes('vocabulary')) return {
    label: 'Vocabulary Warm-Up',
    instruction: `Open with 4–6 key vocabulary terms students need to know for this topic. Each entry: term + clear student-friendly definition.`,
  };
  if (s.includes('worked example')) return {
    label: 'Worked Example Warm-Up',
    instruction: `Open with a fully worked example of the core skill. Use the warmup array to break it into labeled steps: "term" = step name (e.g. "Step 1: Identify the operation"), "definition" = what to do and why. Show 3–5 steps.`,
  };
  if (s.includes('cra') || s.includes('concrete')) return {
    label: 'CRA Warm-Up',
    instruction: `Open with a CRA bridge. Use the warmup array: "term" = representation stage (Concrete / Representational / Abstract), "definition" = what it looks like for this specific topic/skill.`,
  };
  if (s.includes('graphic organizer') || s.includes('organizer')) return {
    label: 'Graphic Organizer Warm-Up',
    instruction: `Open with a graphic organizer preview. Use the warmup array: "term" = each section/box label, "definition" = what students should fill in there. 3–5 entries.`,
  };
  if (s.includes('sentence frame') || s.includes('sentence stem')) return {
    label: 'Sentence Frame Warm-Up',
    instruction: `Open with 3–5 sentence frames students can use when answering questions. "term" = the purpose (e.g. "Explaining cause"), "definition" = the actual sentence frame with blanks (e.g. "______ happened because ______").`,
  };
  if (s.includes('chunking') || s.includes('chunk')) return {
    label: 'Chunked Review Warm-Up',
    instruction: `Open with a chunked review of the key sub-skills or parts of this topic. "term" = chunk name (e.g. "Part 1: Setup"), "definition" = brief description of what students should recall about that chunk.`,
  };
  // generic fallback for any other strategy
  return {
    label: `${strategyName} Warm-Up`,
    instruction: `Open with a warm-up that reflects the "${strategyName}" approach (${strategyDesc || 'as described'}). Design 3–5 warmup entries that preview the strategy — "term" = the label/header for each entry, "definition" = the content.`,
  };
}

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('[generate] ANTHROPIC_API_KEY present:', !!key, '| starts with:', key?.slice(0, 12));

  const {
    topic, subject, grade, fluencyAnswer, struggleAnswer,
    hardestThing, scaffoldStrategy, scaffoldStrategyDesc,
    teacherScaffolds, questionType, numQuestions,
    toolName, className, pageContextTitle, pageContextPreview, pageContextBodyText,
  } = await request.json();

  console.log('[generate] params:', { topic, toolName, subject, grade, questionType, numQuestions, className, scaffoldStrategy });

  const resolvedToolName = toolName || 'Quiz';
  const isQuizTool = /quiz|test|check|formative|exit|assess/i.test(resolvedToolName);
  const qType = questionType || 'Multiple Choice';
  const nQ = numQuestions || 10;
  const classContext = className ? ` (${className})` : '';

  const pageCtx = pageContextTitle
    ? ` The teacher is looking at this source: "${pageContextTitle}"${pageContextPreview ? ` — ${pageContextPreview.slice(0, 200)}` : ''}.${pageContextBodyText ? ` Source content:\n\n${pageContextBodyText.slice(0, 3000)}` : ''} Ground quiz questions in this specific material where possible.`
    : '';

  const { label: warmupLabel, instruction: warmupInstruction } = warmupInstructions(scaffoldStrategy, scaffoldStrategyDesc);

  const hasTeacherScaffolds = Array.isArray(teacherScaffolds) && teacherScaffolds.filter(Boolean).length > 0;
  const teacherScaffoldList = hasTeacherScaffolds ? teacherScaffolds.filter(Boolean).join('; ') : null;

  const scaffoldSection = [
    scaffoldStrategy
      ? `DISTRICT INSTRUCTIONAL STRATEGY: "${scaffoldStrategy}" — ${scaffoldStrategyDesc || ''}. This is the primary scaffold — apply it throughout the quiz design and in the warm-up.`
      : null,
    teacherScaffoldList
      ? `TEACHER-ADDED SCAFFOLDS: ${teacherScaffoldList}. Weave these into specific questions — for example as hints, structured question stems, sentence starters, or scaffolded options. At least half the questions should visibly reflect one of these scaffolds.`
      : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = isQuizTool
    ? `You are Brisk, an AI assistant for K-12 teachers. Generate a ${nQ}-question ${qType} quiz about ${topic} for ${grade || '8th grade'} students studying ${subject}${classContext}.

STUDENT CONTEXT:
- Students are struggling with: ${hardestThing}
- Specific challenge: ${struggleAnswer}
- Reading/fluency support needed: ${fluencyAnswer}

${scaffoldSection}

WARM-UP (required): ${warmupInstruction}
The warmupLabel for this quiz is: "${warmupLabel}"

QUESTION DESIGN:
- Make questions rigorous — analysis and application, not just recall
- For ${qType}: ${qType === 'True/False' ? 'use exactly ["True", "False"] for options' : qType === 'Short Answer' ? 'use empty options array []' : 'include 4 answer options'}
- Each question must include a one-sentence explanation of why the correct answer is right${pageCtx}

TITLE: Must be specific to the topic and struggle — e.g. "Dividing Fractions: Mastering the Reciprocal" or "Point of View in Summer of the Mariposas". Never use a website name, URL, or generic title.

Return JSON only, no markdown backticks:
{ "title": string, "warmupLabel": string, "warmup": [{"term": string, "definition": string}], "questions": [{"question": string, "options": [string], "correct": string, "explanation": string}] }`
    : `You are Brisk, an AI assistant for K-12 teachers. Generate a ${resolvedToolName} about "${topic}" for ${grade || '8th grade'} ${subject} students${classContext}.

STUDENT CONTEXT:
- Students are struggling with: ${hardestThing || 'N/A'}
- Specific challenge: ${struggleAnswer || 'N/A'}
- Reading/fluency support needed: ${fluencyAnswer || 'N/A'}

${scaffoldSection}

WARM-UP (required): ${warmupInstruction}
The warmupLabel for this document is: "${warmupLabel}"

DOCUMENT DESIGN:
- Make content rigorous, clear, and grade-appropriate
- Use logical sections with helpful headers
- Include actionable, specific guidance${pageCtx}

TITLE: Must be specific to the topic — e.g. "ELA 8 Syllabus: Reading for Meaning" or "Portrait of a Graduate: Critical Thinker Framework". Never use a website name, URL, or generic title.

Return JSON only, no markdown backticks:
{ "title": string, "warmupLabel": string, "warmup": [{"term": string, "definition": string}], "questions": [{"question": string, "options": [], "correct": "", "explanation": string}] }`;

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

  // Ensure warmupLabel is always set (fallback if Claude omits it)
  if (!data.warmupLabel) data.warmupLabel = warmupLabel;

  console.log('[generate] warmupLabel:', data.warmupLabel, '| questions:', data.questions?.length);
  return Response.json(data);
}
