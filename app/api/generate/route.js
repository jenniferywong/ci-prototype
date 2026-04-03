import Anthropic from '@anthropic-ai/sdk';

function parseJSON(text) {
  const stripped = text
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Fallback: find the outermost { ... } in the response
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(stripped.slice(start, end + 1));
    throw new Error(`No JSON object found in response (first 120 chars): ${stripped.slice(0, 120)}`);
  }
}

async function callClaude(client, systemPrompt, userMsg = 'Generate now.') {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  });
  return parseJSON(message.content[0].text);
}

// Maps a tool name to specific content instructions for the `questions` array
function docContentInstructions(toolName) {
  const t = (toolName || '').toLowerCase();
  if (t.includes('guided notes') || t.includes('guided note')) return {
    contentInstruction: `Generate ${10} fill-in-the-blank guided note items. Each item should be a key concept sentence with ___ blanks for students to fill in (e.g. "The ___ is the powerhouse of the cell."). The "explanation" field is the complete, filled-in answer. Use "options": [].`,
    numItems: 10,
  };
  if (t.includes('syllabus')) return {
    contentInstruction: `Generate 8–10 syllabus sections. Each "question" is a section header (e.g. "Course Overview", "Grading Policy"). The "explanation" is 2–3 sentences of content for that section. Use "options": [].`,
    numItems: 8,
  };
  if (t.includes('rubric')) return {
    contentInstruction: `Generate 5–6 rubric criteria rows. Each "question" is a criterion name (e.g. "Content & Accuracy"). The "explanation" describes what proficient work looks like for that criterion. Use "options": [].`,
    numItems: 5,
  };
  if (t.includes('lesson plan') || t.includes('lesson')) return {
    contentInstruction: `Generate 8–10 lesson plan components. Each "question" is a section label (e.g. "Objective", "Hook / Warm-Up", "Direct Instruction", "Guided Practice", "Closure"). The "explanation" is 2–3 sentences describing what happens in that phase. Use "options": [].`,
    numItems: 8,
  };
  if (t.includes('unit plan') || t.includes('unit')) return {
    contentInstruction: `Generate 8–10 unit plan sections. Each "question" is a section label (e.g. "Unit Overview", "Essential Questions", "Week 1 Focus"). The "explanation" is 2–3 sentences describing that section's content. Use "options": [].`,
    numItems: 8,
  };
  if (t.includes('discussion') || t.includes('facilitation')) return {
    contentInstruction: `Generate 8–10 discussion questions or facilitation prompts. Each "question" is a discussion prompt students or the teacher can use. The "explanation" is a brief note on what good responses might include. Use "options": [].`,
    numItems: 8,
  };
  if (t.includes('slide') || t.includes('presentation')) return {
    contentInstruction: `Generate 8–10 slide outlines. Each "question" is a slide title. The "explanation" is 2–3 bullet points of content for that slide. Use "options": [].`,
    numItems: 8,
  };
  if (t.includes('podcast')) return {
    contentInstruction: `Generate 6–8 podcast script segments. Each "question" is a segment label (e.g. "Intro Hook", "Segment 1: Background", "Expert Insight"). The "explanation" is 2–3 sentences of talking points or script for that segment. Use "options": [].`,
    numItems: 6,
  };
  if (t.includes('science lab') || t.includes('lab')) return {
    contentInstruction: `Generate 8–10 lab procedure steps or sections. Each "question" is a section label (e.g. "Materials", "Hypothesis", "Step 1: Setup", "Observations", "Conclusion"). The "explanation" is 2–3 sentences describing what students do or record. Use "options": [].`,
    numItems: 8,
  };
  // Generic doc fallback
  return {
    contentInstruction: `Generate 8–10 content items for this document. Each "question" is a section header or key point. The "explanation" is 2–3 sentences of content for that section. Use "options": [].`,
    numItems: 8,
  };
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
  const { contentInstruction } = isQuizTool ? {} : docContentInstructions(resolvedToolName);

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

CONTENT (required): ${contentInstruction}
You MUST populate the "questions" array with real content — do not return an empty array.${pageCtx}

TITLE: Must be specific to the topic — e.g. "ELA 8 Syllabus: Reading for Meaning" or "Guided Notes: The Water Cycle". Never use a website name, URL, or generic title.

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
      return Response.json({ error: 'retry_failed', message: retryErr.message }, { status: 500 });
    }
  }

  // Ensure warmupLabel is always set (fallback if Claude omits it)
  if (!data.warmupLabel) data.warmupLabel = warmupLabel;

  console.log('[generate] warmupLabel:', data.warmupLabel, '| questions:', data.questions?.length);
  return Response.json(data);
}
