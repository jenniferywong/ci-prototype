'use client';

import { useState, useEffect, useRef } from 'react';
import IntentChips from './components/IntentChips.js';

function genUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function logStep(sessionId, step, userInput, aiResponse, extras = {}) {
  console.log('SENDING LOG:', step, { userInput: userInput?.slice?.(0, 80) });
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId,
      user_type: extras.user_type || '',
      step: step,
      userInput: userInput || '',
      aiResponse: aiResponse || '',
      iterationNumber: extras.iterationNumber ?? '',
      topic: extras.topic || '',
      subjectDetected: extras.subjectDetected || '',
      scaffoldStrategy: extras.scaffoldStrategy || '',
      customScaffoldsAdded: extras.customScaffoldsAdded || '',
      adjustmentRequest: extras.adjustmentRequest || '',
      timestamp: new Date().toISOString(),
    }),
  });
}

function pickStrategy(subject, hardestThing, needs2Answer) {
  const s = (subject || '').toLowerCase();
  const combined = ((hardestThing || '') + ' ' + (needs2Answer || '')).toLowerCase();

  // ── Check teacher's described student needs FIRST (cross-subject) ──
  if (/\bell\b|ell student|english language learn|esl|second language|not fluent|limited english|bilingual|language support|language barrier/.test(combined))
    return { name: 'Vocabulary Bank', desc: 'gives students key terms with definitions and sentence examples before they attempt questions — essential support for ELL students navigating academic language' };

  if (/below grade|grade level|behind|struggling reader|low reader|reading level|can't read|cannot read|read at/.test(combined))
    return { name: 'Concrete-Representational-Abstract (CRA)', desc: 'moves from physical objects to diagrams to symbols so students build genuine understanding step by step before working abstractly' };

  if (/forget|can't remember|remember the steps|don't know the steps|steps|procedure|process|order of|sequence|keep mixing/.test(combined))
    return { name: 'Worked Examples', desc: 'shows students a correct worked example and a common error side by side so they can see exactly where mistakes happen' };

  if (/\bvocab\b|vocabulary|unfamiliar word|don't know the word|academic language|term|terminology|word wall/.test(combined))
    return { name: '7 Steps Vocabulary', desc: "pre-teaches key terms so students aren't blocked by unfamiliar academic language before engaging with questions" };

  if (/graphic organiz|organiz|structured note|note-taking|chunk|break.*down|overwhelm/.test(combined))
    return { name: 'Graphic Organizer', desc: 'gives students a visual framework to organize information and see relationships clearly before answering questions' };

  if (/word problem|story problem|context|real.world|application/.test(combined) && s.includes('math'))
    return { name: 'Read-Draw-Write', desc: 'structures how students break down word problems into readable, visual, and written steps before solving' };

  // ── Subject-based fallback ──────────────────────────────────
  if (s.includes('math')) {
    if (/procedur|calculat|operation|comput|plug in|formula/.test(combined)) return { name: 'Worked Examples', desc: 'shows students correct and incorrect examples side by side so they see exactly where the error happens' };
    if (/concept|understand|why|abstract|make sense/.test(combined)) return { name: 'Concrete-Representational-Abstract (CRA)', desc: 'moves from physical objects to diagrams to symbols so students build real understanding before abstraction' };
    return { name: 'Worked Examples', desc: 'shows students correct and incorrect examples side by side so they see exactly where the error happens' };
  }
  if (s.includes('ela') || s.includes('english') || s.includes('language') || s.includes('reading') || s.includes('writing') || s.includes('lit')) {
    if (/spot|identify|find|locat|recogni|where|when/.test(combined)) return { name: 'Frayer Model', desc: 'builds understanding through definition, examples, and non-examples' };
    if (/explain|analy|why|interpret|matter|effect|theme|author/.test(combined)) return { name: 'Semantic Mapping', desc: 'helps students see relationships between ideas' };
    return { name: '7 Steps Vocabulary', desc: "pre-teaches key terms so students aren't blocked by unfamiliar words" };
  }
  if (s.includes('science')) {
    if (/vocab|term|word|define/.test(combined)) return { name: 'Concept Mapping', desc: 'connects new terms to what students already know' };
    return { name: 'Claim-Evidence-Reasoning', desc: 'teaches students to back up observations with evidence' };
  }
  if (s.includes('social') || s.includes('history') || s.includes('civics')) {
    if (/source|primary|document|text|analyz/.test(combined)) return { name: 'SOAPSTONE', desc: 'gives students a framework for analyzing primary sources' };
    return { name: 'Fishbone Diagram', desc: 'visually maps causes and effects' };
  }
  return { name: 'Scaffolded Notes', desc: 'breaks complex content into structured steps students can follow' };
}

// ── Classes ────────────────────────────────────────────────────
const CLASSES = [
  { id: 'math8',    label: 'Math 8',            subject: 'Math',          grade: '8th'  },
  { id: 'math10',   label: 'Math 10',           subject: 'Math',          grade: '10th' },
  { id: 'precalc11',label: 'Pre-Calculus 11',   subject: 'Math',          grade: '11th' },
  { id: 'la8',      label: 'Language Arts 8',   subject: 'ELA',           grade: '8th'  },
  { id: 'la10',     label: 'Language Arts 10',  subject: 'ELA',           grade: '10th' },
  { id: 'eng12',    label: 'English 12',        subject: 'ELA',           grade: '12th' },
  { id: 'ss9',      label: 'Social Studies 9',  subject: 'Social Studies',grade: '9th'  },
  { id: 'ss10',     label: 'Social Studies 10', subject: 'Social Studies',grade: '10th' },
  { id: 'sci8',     label: 'Science 8',         subject: 'Science',       grade: '8th'  },
  { id: 'sci10',    label: 'Science 10',        subject: 'Science',       grade: '10th' },
  { id: 'bio11',    label: 'Biology 11',        subject: 'Science',       grade: '11th' },
  { id: 'chem11',   label: 'Chemistry 11',      subject: 'Science',       grade: '11th' },
];

function detectClassFromTopic(t) {
  const s = (t || '').toLowerCase();
  if (/periodic table|molar|stoichiometr|ionic|covalent|acid|base|buffer|electron|valence/.test(s)) return 'chem11';
  if (/mitosis|meiosis|protein synthesis|enzyme|respiration|homeostasis|chromosome|genetics/.test(s)) return 'bio11';
  if (/trigonometry|logarithm|sinusoidal|sequence|series|precalc|radian/.test(s)) return 'precalc11';
  if (/quadratic|polynomial|radical|rational function|system of equat/.test(s)) return 'math10';
  if (/fraction|ratio|proportion|percent|decimal|integer|linear equat|algebra/.test(s)) return 'math8';
  if (/shakespeare|hamlet|macbeth|romeo|novel stud|literary anal|theme anal/.test(s)) return 'la10';
  if (/mariposa|figurative lang|point of view|narrator|short stor|poetry|metaphor|simile|inference/.test(s)) return 'la8';
  if (/essay|rhetoric|argument|persuasive|ap lit|senior english/.test(s)) return 'eng12';
  if (/french revolution|coloniali|world war|imperialism|cold war|civil rights|capitalism|war of 1812|manifest destiny|reconstruction|gilded age|progressive era|great depression|new deal|vietnam|korean war|cuban missile|industrial revolution|american revolution|revolutionary war|civil war|slavery|abolition|suffrage|segregation|constitution|declaration of independence|bill of rights/.test(s)) return 'ss10';
  if (/confederation|medieval|renaissance|indigenous|ancient civili|first nations|ancient egypt|ancient rome|ancient greece|mesopotamia|aztec|inca|maya/.test(s)) return 'ss9';
  if (/dna|evolution|chemical reaction|energy transfer|genetics|atom|molecule|periodic/.test(s)) return 'sci10';
  if (/photosynthesis|cell|ecosystem|climate|plate tectonic|matter|physical change/.test(s)) return 'sci8';
  return null;
}

function detectSubjectFromTopic(topic) {
  const t = (topic || '').toLowerCase();
  if (/fraction|algebra|geometry|ratio|equation|multiplication|division|calculus|statistic|percent|decimal|integer|polynomial|quadratic|trigonometry|exponent|factor|prime|probability|coordinate|slope|linear|arithmetic|number sense|volume|area|perimeter|function|matrix|vector|derivative|integral/.test(t)) return 'Math';
  if (/photosynthesis|cell|chemistry|physics|ecosystem|biology|organism|atom|molecule|force|energy|evolution|genetics|periodic|element|compound|wave|gravity|reaction|mitosis|dna|fungus|fungi|bacteria|virus|pathogen|microbe|spore|mold|mushroom|enzyme|protein|nutrient|respiration|osmosis|diffusion|habitat|species|taxonomy|symbiosis|parasite|host|chlorophyll|membrane|nucleus|chromosome|gene|allele|mutation|natural selection|food web|climate|weather|plate|tectonic|erosion|volcano|earthquake|rock cycle|solar system|planet|star|galaxy|orbit|newton|momentum|velocity|acceleration|electric|magnetic|circuit|current|voltage|thermal|kinetic|potential/.test(t)) return 'Science';
  if (/war|revolution|democracy|coloniali|civil rights|history|government|civics|constitution|amendment|medieval|ancient|empire|treaty|suffrage|segregation|slavery|immigration|culture|civilization|1812|manifest destiny|reconstruction|imperialism|cold war|propaganda|election|legislature|judicial|executive|court|law|rights|freedom|protest|activism|economy|trade|colonize|independence|nation|politics|policy|refugee|migration|genocide|holocaust|apartheid/.test(t)) return 'Social Studies';
  return 'ELA';
}

function buildPromptPlaceholder(toolType, toolLabel, pageContext) {
  const rawTitle = (pageContext?.title || '').trim();
  const preview  = (pageContext?.preview || '').trim();

  if (!rawTitle && !preview) {
    return 'Describe your topic or what you need…';
  }

  // Strip site-name suffixes from the title
  const cleanTitle = rawTitle
    .replace(/\s*[-–|]\s*(Wikipedia|Khan Academy|YouTube|Quizlet|BrainPOP|Britannica|Newsela|CommonLit|ReadWorks|National Geographic|PBS LearningMedia|Illustrative Mathematics|EngageNY|Achieve the Core|LearnZillion|Pearson|Scholastic|Education\.com|Study\.com|IXL|Desmos)[^\n]*/i, '')
    .replace(/\s*\|\s*\S+\.(com|org|edu|net)\b.*/i, '')
    .replace(/\s*[-–]\s*\S+\.(com|org|edu)\b.*/i, '')
    .trim() || rawTitle;

  // Pull a short concept from the preview that goes beyond just the title
  // Look for the first sentence and extract a specific phrase (5–7 words max)
  let concept = '';
  if (preview) {
    const sentence = preview.split(/[.!\n]/)[0].replace(/^(A|An|The)\s+/i, '').trim();
    // Only use if it meaningfully differs from the title
    const titleWords = cleanTitle.toLowerCase().split(/\s+/);
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    const overlap = sentenceWords.filter(w => w.length > 3 && titleWords.some(t => t.includes(w) || w.includes(t))).length;
    const isAdditive = overlap < sentenceWords.length * 0.6 && sentence.length > 20 && sentence.length < 100;
    if (isAdditive) {
      // Take first 6 words max
      concept = sentenceWords.slice(0, 6).join(' ').replace(/[,;:]$/, '');
    }
  }

  const t = cleanTitle.toLowerCase();

  if (toolType === 'doc') {
    const ll = (toolLabel || '').toLowerCase();
    const verb = ll.includes('rubric') ? 'rubric for' :
                 ll.includes('syllabus') ? 'syllabus for' :
                 ll.includes('lesson') ? 'lesson plan on' :
                 ll.includes('unit plan') ? 'unit plan on' :
                 ll.includes('sub plan') ? 'sub plan on' :
                 ll.includes('worksheet') ? 'worksheet on' :
                 ll.includes('portrait') ? 'portrait of a graduate for' :
                 `${toolLabel ? toolLabel.toLowerCase() + ' on' : 'resource on'}`;
    return concept ? `e.g. ${verb} ${concept}` : `e.g. ${verb} ${t}`;
  }

  return concept ? `e.g. quiz on ${concept}` : `e.g. quiz on ${t}`;
}

function inferGrade(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('math')) return '7th';
  if (s.includes('science')) return '8th';
  if (s.includes('social') || s.includes('history')) return '9th';
  return '8th';
}

// ── Design tokens ──────────────────────────────────────────────
const C = {
  header: '#0E151C',
  teal: '#1B6B6B', tealLight: '#e8f3f3',
  green: '#22c55e', greenDark: '#15803d',
  slate100: '#f5f5f4', slate200: '#e7e5e4', slate300: '#d6d3d1',
  slate400: '#a8a29e', slate500: '#78716c', slate600: '#57534e',
  slate700: '#44403c', slate900: '#0E151C',
  amber50: '#fffbeb', amber200: '#fde68a',
  formsPurple: '#673AB7',
};

// ── UI primitives ──────────────────────────────────────────────

function BriskLogo({ size = 28 }) {
  return <img src="/icons/Brisk Logo.svg" width={size} height={size} alt="Brisk" style={{ flexShrink: 0, display: 'block' }} />;
}

// ── Mic button with Web Speech API ────────────────────────────
function MicButton({ onTranscript, size = 20, btnStyle, className }) {
  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      const text = Array.from(e.results).map(res => res[0].transcript).join('');
      const isFinal = e.results[e.results.length - 1].isFinal;
      transcriptRef.current = text;
      onTranscript(text, isFinal);
    };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    recRef.current = r;
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (isListening) {
      recRef.current?.stop();
      setIsListening(false);
    } else {
      try { recRef.current?.start(); setIsListening(true); transcriptRef.current = ''; } catch {}
    }
  };

  return (
    <button onClick={toggle} className={className}
      style={{ width: size + 12, height: size + 12, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0, ...btnStyle }}>
      <img src="/icons/Mic.svg" width={size} height={size} alt="Mic"
        style={{ display: 'block',
          filter: isListening ? 'invert(29%) sepia(80%) saturate(400%) hue-rotate(130deg) brightness(0.85)' : undefined,
          animation: isListening ? 'pulse 1s ease-in-out infinite' : undefined }} />
    </button>
  );
}

function ToolRow({ svg, label, sub, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '0 8px' }}>
      <button
        onClick={onClick || undefined}
        style={{ width: '100%', height: 58, padding: '0 10px', border: 'none', borderRadius: 10, background: hovered ? '#EBE9E6' : 'transparent', display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s', flexShrink: 0 }}>
        <img src={svg} width={28} height={28} alt="" style={{ flexShrink: 0, display: 'block' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '22px', letterSpacing: '-0.01em' }}>{label}</div>
          {hovered && <div style={{ fontSize: 12, color: '#344054', lineHeight: '17px', marginTop: 1 }}>{sub}</div>}
        </div>
      </button>
    </div>
  );
}

// Icon squares for create submenu tools (32×32 to match ToolRow)
const CREATE_ICONS = {
  Presentation: <img src="/icons/Slides.svg" width={28} height={28} alt="Presentation" style={{ display: 'block', flexShrink: 0 }} />,
  Quiz:         <img src="/icons/Quiz.svg"   width={28} height={28} alt="Quiz"         style={{ display: 'block', flexShrink: 0 }} />,
  Podcast:      <img src="/icons/Podcast.svg" width={28} height={28} alt="Podcast"     style={{ display: 'block', flexShrink: 0 }} />,
  Nearpod:      <img src="/icons/Nearpod.svg" width={28} height={28} alt="Nearpod"     style={{ display: 'block', flexShrink: 0 }} />,
  CPS: (
    <div style={{ width: 32, height: 32, borderRadius: 7, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="1.3"/>
        <path d="M5 8h6M8 5v6" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    </div>
  ),
};

// Platform chips shown on Quiz row hover — SVG icons from public/icons/
const QUIZ_CHIPS = [
  { title: 'Forms',   icon: <img src="/icons/Forms.svg"   width={24} height={24} alt="Forms"   style={{ display: 'block' }} /> },
  { title: 'Slides',  icon: <img src="/icons/Slides.svg"  width={24} height={24} alt="Slides"  style={{ display: 'block' }} /> },
  { title: 'Kahoot',  icon: <img src="/icons/Kahoot.svg"  width={24} height={24} alt="Kahoot"  style={{ display: 'block' }} /> },
  { title: 'Nearpod', icon: <img src="/icons/Nearpod.svg" width={24} height={24} alt="Nearpod" style={{ display: 'block' }} /> },
];

// Chat question sets per tool
const CHAT_QUESTION_SETS = {
  'Give Feedback': [
    { type: 'single-select', text: 'Which feedback style do you want to use?', options: ['Glows and Grows', 'Rubric Scoring', 'Rubric Criteria', 'Next steps'] },
    { type: 'single-select', text: "What's the main focus?", options: ['Argument & evidence', 'Writing craft', 'Conventions', 'Overall quality'] },
  ],
  'Ask Brisk': [
    { type: 'single-select', text: 'What would you like help with?', options: ['Explain something', 'Help me write', 'Give feedback', 'Something else'] },
    { type: 'open-text', text: 'Tell me more about what you need', placeholder: 'Add any details that might help...' },
  ],
  'Ask Anything': [],
  'Create': [
    { type: 'single-select', text: 'What format do you want?', options: ['Google Forms', 'Google Docs', 'Kahoot'] },
    { type: 'single-select', text: 'Who is this for?', options: ['Whole class', 'Small group', 'Individual student', 'Me'] },
  ],
  'Inspect Writing': [
    { type: 'single-select', text: 'What aspect should I focus on?', options: ['Argument structure', 'Evidence use', 'Writing craft', 'All of the above'] },
    { type: 'single-select', text: "What's the writing stage?", options: ['Draft', 'Revision', 'Final copy', 'In progress'] },
  ],
  'Change Level': [
    { type: 'single-select', text: 'Which direction?', options: ['Simplify', 'Add complexity', 'Add vocabulary support', 'Add sentence frames'] },
    { type: 'single-select', text: 'Who is this for?', options: ['ELL students', 'Below grade level', 'On grade level', 'Advanced'] },
  ],
  'Boost Activity': [
    { type: 'single-select', text: 'What kind of boost?', options: ['Add a hook', 'Add collaboration', 'Add choice', 'Add movement'] },
    { type: 'single-select', text: 'Time available?', options: ['5 minutes', '10 minutes', '15–20 minutes', 'Full period'] },
  ],
  'Get Teaching Ideas': [
    { type: 'single-select', text: 'What are you looking for?', options: ['Lesson hooks', 'Discussion strategies', 'Assessment ideas', 'Differentiation'] },
    { type: 'open-text', text: 'Any constraints or context?', placeholder: 'e.g. limited tech, 20 min, specific standard...' },
  ],
};

const CHAT_LOADING_MSGS = {
  'Give Feedback': ['Reading the submission…', 'Identifying strengths…', 'Looking for growth areas…', 'Drafting your feedback…', 'Almost ready…'],
  'Create': ['Generating questions…', 'Aligning to the content…', 'Checking difficulty level…', 'Formatting the output…', 'Almost ready…'],
  'Inspect Writing': ['Reading the text…', 'Analyzing argument structure…', 'Checking clarity and flow…', 'Pulling key observations…', 'Almost ready…'],
  'Change Level': ['Analyzing reading complexity…', 'Adjusting vocabulary…', 'Rewriting for your audience…', 'Almost ready…'],
  'Boost Activity': ['Looking at the activity…', 'Finding engagement opportunities…', 'Drafting suggestions…', 'Almost ready…'],
  'Get Teaching Ideas': ['Pulling relevant strategies…', 'Thinking about your context…', 'Organizing ideas…', 'Almost ready…'],
  'Ask Brisk': ['Thinking through your question…', 'Pulling relevant ideas…', 'Putting it together…', 'Almost ready…'],
  'Ask Anything': ['Thinking…', 'Pulling relevant ideas…', 'Putting it together…', 'Almost ready…'],
};

// Prompt routing: classify a free-text prompt to a tool name
function classifyPrompt(p) {
  const t = p.toLowerCase();
  if (/feedback|comment|review|grade/.test(t)) return 'Give Feedback';
  if (/quiz|test|question|assessment/.test(t)) return 'Create';
  if (/create|make|build|presentation|slide|podcast/.test(t)) return 'Create';
  if (/inspect|analy|structur/.test(t)) return 'Inspect Writing';
  if (/level|simplif|complex|reading level/.test(t)) return 'Change Level';
  if (/boost|engag|activit/.test(t)) return 'Boost Activity';
  if (/idea|lesson|strateg/.test(t)) return 'Get Teaching Ideas';
  return 'Ask Brisk';
}

// Tool patterns for intent routing (topic + tool → direct to creation)
const CHAT_TOOL_PATTERNS = [
  { re: /\b(quiz|test|assessment|formative|exit ticket|exit-ticket)\b/i, type: 'quiz', label: 'Quiz' },
  { re: /\b(slide|slides|presentation)\b/i,                              type: 'doc',  label: 'Presentation' },
  { re: /\bsyllabus\b/i,                                                 type: 'doc',  label: 'Syllabus' },
  { re: /\blesson plan\b/i,                                              type: 'doc',  label: 'Lesson Plan' },
  { re: /\brubric\b/i,                                                   type: 'doc',  label: 'Rubric' },
  { re: /\b(guided notes|notes)\b/i,                                     type: 'doc',  label: 'Guided Notes' },
];
const CHAT_TOOL_KW_STRIP = /\b(quiz|test|assessment|formative|exit ticket|slides?|presentation|syllabus|lesson plan|rubric|guided notes?|create|make|build|a|an|for|about|on|me|my|the|please)\b/gi;

function detectToolAndTopic(prompt) {
  const matched = CHAT_TOOL_PATTERNS.find(p => p.re.test(prompt));
  if (!matched) return null;
  const topic = prompt.replace(matched.re, '').replace(CHAT_TOOL_KW_STRIP, '').replace(/\s+/g, ' ').trim();
  if (topic.length < 3) return null;
  return { type: matched.type, label: matched.label, topic };
}

// Fuzzy match: all typed chars appear in order in the target string (kept for prompt-mode label detection)
function fuzzyMatch(query, str) {
  if (!query) return true;
  const q = query.toLowerCase();
  const s = str.toLowerCase();
  let qi = 0;
  for (let si = 0; si < s.length && qi < q.length; si++) {
    if (s[si] === q[qi]) qi++;
  }
  return qi === q.length;
}

// Scored match for search results — returns 0-100, only use results >= 40
function scoreMatch(query, label) {
  if (!query || !label) return 0;
  const q = query.trim().toLowerCase();
  const l = label.trim().toLowerCase();
  if (!q) return 0;
  if (l === q) return 100;                                      // exact
  if (l.startsWith(q)) return 80;                               // label starts with query
  const labelWords = l.split(/\s+/);
  const queryWords = q.split(/\s+/);
  // Multi-word query: score each meaningful query word against label words
  if (queryWords.length > 1) {
    const significant = queryWords.filter(w => w.length >= 3);
    if (!significant.length) return 0;
    let matched = 0;
    let total = 0;
    for (const qw of significant) {
      if (labelWords.some(lw => lw === qw)) { total += 60; matched++; }
      else if (labelWords.some(lw => lw.startsWith(qw))) { total += 40; matched++; }
    }
    return matched > 0 ? Math.round(total / matched) : 0;
  }
  if (labelWords[0].startsWith(q)) return 60;                  // first word starts with query
  if (labelWords.some(w => w.startsWith(q))) return 40;        // any word starts with query
  return 0;                                                     // no word-boundary match
}

// Score + filter + cap helper
function topMatches(query, items, getLabel, cap = 3) {
  return items
    .map(item => ({ item, score: scoreMatch(query, getLabel(item)) }))
    .filter(x => x.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, cap)
    .map(x => x.item);
}

// Pick a relevant character to chat with based on the topic
function detectCharacter(topic) {
  const t = (topic || '').toLowerCase();
  if (/1812|james madison|dolley/.test(t)) return 'James Madison';
  if (/washington|founding father|revolutionary war|american revolution/.test(t)) return 'George Washington';
  if (/lincoln|civil war|slavery|abolition/.test(t)) return 'Abraham Lincoln';
  if (/civil rights|mlk|king|march/.test(t)) return 'Martin Luther King Jr.';
  if (/rosa parks|montgomery|bus boycott/.test(t)) return 'Rosa Parks';
  if (/harriet tubman|underground railroad/.test(t)) return 'Harriet Tubman';
  if (/frederick douglass/.test(t)) return 'Frederick Douglass';
  if (/french revolution|marie antoinette|robespierre/.test(t)) return 'Marie Antoinette';
  if (/napoleon|waterloo/.test(t)) return 'Napoleon Bonaparte';
  if (/world war|ww2|ww1|wwii|wwi|winston|churchill/.test(t)) return 'Winston Churchill';
  if (/holocaust|anne frank/.test(t)) return 'Anne Frank';
  if (/cold war|kennedy|berlin/.test(t)) return 'JFK';
  if (/manifest destiny|westward|lewis and clark/.test(t)) return 'Meriwether Lewis';
  if (/imperialism|coloniali/.test(t)) return 'a Colonial Governor';
  if (/ancient egypt|pharaoh|cleopatra/.test(t)) return 'Cleopatra';
  if (/ancient rome|julius caesar|roman/.test(t)) return 'Julius Caesar';
  if (/ancient greece|socrates|plato|aristotle/.test(t)) return 'Socrates';
  if (/shakespeare|hamlet|macbeth|romeo|juliet/.test(t)) return 'William Shakespeare';
  if (/mariposa|reyna/.test(t)) return 'Reyna';
  if (/darwin|evolution|natural selection/.test(t)) return 'Charles Darwin';
  if (/newton|gravity|physics/.test(t)) return 'Isaac Newton';
  if (/einstein|relativity/.test(t)) return 'Albert Einstein';
  if (/curie|marie curie|radiation/.test(t)) return 'Marie Curie';
  if (/galileo|solar system|planet/.test(t)) return 'Galileo';
  if (/dna|watson|crick|genetics/.test(t)) return 'Rosalind Franklin';
  if (/fungus|fungi|mushroom|mold/.test(t)) return 'a Mycologist';
  if (/bacteria|virus|pathogen|microbe/.test(t)) return 'a Microbiologist';
  if (/photosynthesis|plant|botany/.test(t)) return 'a Botanist';
  if (/ecosystem|ecology|habitat/.test(t)) return 'an Ecologist';
  if (/fraction|ratio|algebra|equation|math/.test(t)) return 'a Math Mentor';
  if (/geometry|shape|angle|proof/.test(t)) return 'Euclid';
  if (/chemistry|element|periodic|atom/.test(t)) return 'a Chemist';
  if (/war|battle|conflict|soldier/.test(t)) return 'a Battlefield Soldier';
  if (/democracy|civics|government|constitution/.test(t)) return 'a Constitutional Delegate';
  if (/immigration|migration|refugee/.test(t)) return 'an Immigrant Narrator';
  if (/economy|trade|capitalism/.test(t)) return 'an Economist';
  return 'an Expert';
}

// Generate varied, grade-specific recommendation objects for a topic
function recoItems(topic, grade, onClickFns) {
  const toTitleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());
  const t = toTitleCase(topic.trim());
  const g = grade || '8th';
  const h = Math.abs([...topic].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));
  const pick = (arr) => arr[h % arr.length];

  const character = detectCharacter(topic);
  const allRecs = [
    {
      svg: '/icons/Forms.svg',
      title: pick([`${g} Grade ${t} Formative Assessment`, `${t} Knowledge Check`, `${t} Quick Check`, `Check for Understanding: ${t}`]),
      tooltip: `Quick check-in for ${topic}`,
      onClick: onClickFns?.quiz,
    },
    {
      svg: '/icons/Slides.svg',
      title: pick([`${g} Grade ${t} Presentation`, `Intro to ${t}: Slide Deck`, `${t} Direct Instruction Slides`, `Teaching ${t} Presentation`]),
      tooltip: `Ready to present on ${topic}`,
      onClick: onClickFns?.slides,
    },
    {
      svg: '/icons/Docs.svg',
      title: pick([`${t} Guided Notes`, `${t} Student Notes Sheet`, `Structured Notes: ${t}`, `${t} Note-Taking Guide`]),
      tooltip: `Helps students follow along`,
      onClick: onClickFns?.doc,
    },
    {
      svg: '/icons/Docs.svg',
      title: pick([`${t} Lesson Plan`, `Introduction to ${t}`, `${t} Exploration Lesson`, `Teaching ${t} Lesson Plan`]),
      tooltip: `Saves planning time`,
      onClick: onClickFns?.lesson,
    },
    {
      svg: '/icons/Forms.svg',
      title: pick([`${t} Exit Ticket`, `${t} End-of-Class Check`, `Quick ${t} Exit Slip`]),
      tooltip: `Catch misconceptions early`,
      onClick: onClickFns?.quiz,
    },
    {
      svg: '/icons/Whiteboard.svg',
      title: pick([`${t} Whiteboard`, `${t} Operations Whiteboard`, `Interactive ${t} Whiteboard`, `${t} Problem-Solving Whiteboard`]),
      tooltip: `Students show their thinking`,
      onClick: onClickFns?.doc,
    },
    {
      svg: '/icons/Tutor.svg',
      title: pick([`${t} Open-Ended Tutor`, `Ask About ${t}`, `${t} AI Tutor Chat`, `Explore ${t} with a Tutor`]),
      tooltip: `Students self-pace with AI support`,
      onClick: null,
    },
    {
      svg: '/icons/gavel.svg',
      title: pick([`${t} Debate`, `${t} Socratic Debate`, `The ${t} Debate`, `${t} Discussion Challenge`]),
      tooltip: `Builds critical thinking`,
      onClick: null,
    },
    {
      svg: '/icons/Podcast.svg',
      title: pick([`${t} in Everyday Contexts`, `${t} Explained: Student Podcast`, `Why ${t} Matters`, `${t} in the Real World`]),
      tooltip: `Connects content to real life`,
      onClick: onClickFns?.slides,
    },
    {
      svg: '/icons/Character Chat.svg',
      title: `Chat with ${character}`,
      tooltip: `Students ask questions directly`,
      onClick: null,
    },
  ];

  // Pick 3 varied items deterministically — spread across the array
  const n = allRecs.length;
  const i0 = h % n;
  const i1 = (i0 + Math.floor(n / 3) + 1) % n;
  const i2 = (i0 + Math.floor((2 * n) / 3) + 1) % n;
  return [allRecs[i0], allRecs[i1], allRecs[i2]];
}

// Generate simulated library items for any topic (used when no hardcoded match exists)
function generateLibraryItems(topic, grade, subjectLabel) {
  const toTitleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());
  const t = toTitleCase(topic.trim());
  const g = grade || '8th';
  const dept = subjectLabel ? `${subjectLabel} Dept` : 'Curriculum Dept';
  const h = Math.abs([...topic].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));

  const myTemplates = [
    { label: `${t} Quiz`,               icon: '/icons/Forms.svg', sub: `Modified ${(h % 6) + 1} days ago` },
    { label: `${t} Guided Notes`,        icon: '/icons/Docs.svg',  sub: `Modified ${(h % 3) + 1} weeks ago` },
    { label: `${t} Practice Sheet`,      icon: '/icons/Docs.svg',  sub: `Modified ${(h % 4) + 2} weeks ago` },
    { label: `${t} Review`,              icon: '/icons/Docs.svg',  sub: `Modified 1 month ago` },
    { label: `${t} Exit Ticket`,         icon: '/icons/Forms.svg', sub: `Modified ${(h % 5) + 3} days ago` },
    { label: `${g} Grade ${t} Notes`,    icon: '/icons/Docs.svg',  sub: `Modified ${(h % 2) + 1} weeks ago` },
  ];
  const distTemplates = [
    { label: `${g} Grade ${t} Unit Assessment`, icon: '/icons/Forms.svg', sub: `District · ${dept}` },
    { label: `${t} Lesson Plan`,                icon: '/icons/Docs.svg',  sub: `District · ${dept}` },
    { label: `${t} Vocabulary Resource`,        icon: '/icons/PDF.svg',   sub: `District · ${dept}` },
    { label: `${t} Anchor Chart`,               icon: '/icons/Docs.svg',  sub: `District · ${dept}` },
    { label: `${t} Guided Practice`,            icon: '/icons/Docs.svg',  sub: `District · ${dept}` },
    { label: `${g} Grade ${t} Slide Deck`,      icon: '/icons/Slides.svg',sub: `District · ${dept}` },
    { label: `${t} Standards Alignment`,        icon: '/icons/PDF.svg',   sub: `District · ${dept}` },
  ];

  // Pick 2-3 my library items and 3-5 district items deterministically
  const myCount = 2 + (h % 2);
  const distCount = 3 + (h % 3);
  const myItems = Array.from({ length: myCount }, (_, i) => myTemplates[(h + i) % myTemplates.length]);
  const distItems = Array.from({ length: distCount }, (_, i) => distTemplates[(h + i) % distTemplates.length]);
  return { myItems, distItems };
}

// Full create tool list, organized by section
const CREATE_TOOL_SECTIONS = [
  { section: 'Popular Tools', tools: [
    { label: 'Presentation',  svg: '/icons/Slides.svg',   sub: 'Slides for direct instruction or student projects', chips: null,   onClick: null },
    { label: 'Quiz',          svg: '/icons/Quiz.svg',     sub: 'Formative assessments',                            chips: 'quiz', onClick: 'quiz' },
    { label: 'Podcast',       svg: '/icons/Podcast.svg',  sub: 'Student-facing audio content or discussion starters', chips: null, onClick: null },
    { label: 'Nearpod',       svg: '/icons/Nearpod.svg',  sub: 'Interactive lessons with student pacing',          chips: null,   onClick: null },
  ]},
  { section: 'School-Specific Tools', tools: [
    { label: 'CPS Teacher Facilitation', svg: '/icons/Docs.svg', sub: 'District-aligned facilitation guides',              chips: null, onClick: null },
    { label: 'Regents - ELA',            svg: '/icons/Docs.svg', sub: 'New York Regents exam prep materials',              chips: null, onClick: null },
    { label: 'Portrait of a Graduate',   svg: '/icons/Docs.svg', sub: 'Competency-aligned learning artifacts',             chips: null, onClick: null },
    { label: 'English II EOC Practice',  svg: '/icons/Docs.svg', sub: 'End-of-course prep aligned to standards',          chips: null, onClick: null },
    { label: 'MAP Practice Test Generator', svg: '/icons/Docs.svg', sub: 'NWEA-aligned growth practice questions',        chips: null, onClick: null },
    { label: 'CBLI Observation Notes',   svg: '/icons/Docs.svg', sub: 'Classroom-based literacy intervention records',     chips: null, onClick: null },
  ]},
  { section: 'Curriculum Essentials', tools: [
    { label: 'Boost Student Activity', svg: '/icons/Boost.svg', sub: 'Add scaffolds, prompts, or engagement to any task', chips: null, onClick: null },
    { label: 'Rubric',                 svg: '/icons/Docs.svg',  sub: 'Criteria-based assessment for student work',        chips: null, onClick: 'doc' },
    { label: 'Syllabus',               svg: '/icons/Docs.svg',  sub: 'Course overview, expectations, and schedule',      chips: null, onClick: 'doc' },
    { label: 'Progress Report',        svg: '/icons/Docs.svg',  sub: 'Student performance summaries for families',       chips: null, onClick: 'doc' },
    { label: 'Resource',               svg: '/icons/Docs.svg',  sub: 'Supplemental reading or reference materials',      chips: null, onClick: 'doc' },
    { label: 'Exemplar',               svg: '/icons/Docs.svg',  sub: 'High-quality student work samples with annotation',chips: null, onClick: 'doc' },
    { label: 'Lesson Plan',            svg: '/icons/Docs.svg',  sub: 'Standards-aligned daily or unit lessons',         chips: null, onClick: 'doc' },
    { label: 'DOK Questions',          svg: '/icons/Docs.svg',  sub: 'Depth of Knowledge tiered question sets',         chips: null, onClick: null },
    { label: 'Decodable Text',         svg: '/icons/Docs.svg',  sub: 'Phonics-controlled reading passages',             chips: null, onClick: null },
    { label: 'Translation',            svg: '/icons/Docs.svg',  sub: 'Multilingual versions of classroom materials',    chips: null, onClick: null },
    { label: 'Math Spiral Review',     svg: '/icons/Docs.svg',  sub: 'Cumulative practice across prior standards',      chips: null, onClick: null },
    { label: 'Math Word Problems',     svg: '/icons/Docs.svg',  sub: 'Real-world application and contextual problems',  chips: null, onClick: null },
    { label: 'Science Lab',            svg: '/icons/Docs.svg',  sub: 'Guided inquiry lab procedures and write-ups',     chips: null, onClick: null },
    { label: 'Inquiry Task',           svg: '/icons/Docs.svg',  sub: 'Open-ended student-driven investigation',         chips: null, onClick: null },
    { label: 'Guided Notes',           svg: '/icons/Docs.svg',  sub: 'Structured note-taking with fill-in scaffolds',   chips: null, onClick: null },
    { label: 'Unit Plan',              svg: '/icons/Docs.svg',  sub: 'Multi-week scope and sequence with standards',    chips: null, onClick: null },
    { label: 'Sub Plan',               svg: '/icons/Docs.svg',  sub: 'Detailed plans and materials for a substitute',  chips: null, onClick: null },
    { label: 'SBAC Practice Test',     svg: '/icons/Docs.svg',  sub: 'Smarter Balanced assessment prep questions',      chips: null, onClick: null },
    { label: 'STAAR Practice Test',    svg: '/icons/Docs.svg',  sub: 'Texas state assessment prep questions',           chips: null, onClick: null },
    { label: 'UDL Lesson Plan',        svg: '/icons/Docs.svg',  sub: 'Universal Design for Learning framework lesson',  chips: null, onClick: null },
    { label: 'Standards Unpacker',     svg: '/icons/Docs.svg',  sub: 'Break standards into learning targets and tasks', chips: null, onClick: null },
    { label: 'SAT Practice Test',      svg: '/icons/Docs.svg',  sub: 'College Board SAT prep questions and strategies', chips: null, onClick: null },
    { label: 'ACT Practice Test',      svg: '/icons/Docs.svg',  sub: 'ACT prep questions and test-taking strategies',  chips: null, onClick: null },
    { label: 'Canvas QTI',             svg: '/icons/Docs.svg',  sub: 'Quiz import format compatible with Canvas LMS',  chips: null, onClick: null },
  ]},
  { section: 'Administrative Tasks', tools: [
    { label: 'Email',            svg: '/icons/Docs.svg', sub: 'Professional messages to families or colleagues', chips: null, onClick: null },
    { label: 'Newsletter',       svg: '/icons/Docs.svg', sub: 'Class or school updates for stakeholders',       chips: null, onClick: null },
    { label: 'Letter of Rec',    svg: '/icons/Docs.svg', sub: 'Personalized student recommendation letters',    chips: null, onClick: null },
    { label: 'Observation Notes',svg: '/icons/Docs.svg', sub: 'Structured classroom observation records',       chips: null, onClick: null },
  ]},
  { section: 'Interventions', tools: [
    { label: 'IEP Goal Plan',   svg: '/icons/Docs.svg', sub: 'Individualized Education Program goal documentation', chips: null, onClick: null },
    { label: 'MTSS Strategy',   svg: '/icons/Docs.svg', sub: 'Multi-Tiered System of Supports strategy cards',     chips: null, onClick: null },
    { label: 'MTSS Plan',       svg: '/icons/Docs.svg', sub: 'Tiered intervention plan for student support',       chips: null, onClick: null },
    { label: '504 Plan',        svg: '/icons/Docs.svg', sub: 'Accommodation documentation for eligible students',  chips: null, onClick: null },
  ]},
];

function CreateToolRow({ svg, iconEl, label, sub, chips, onClick }) {
  const [hovered, setHovered] = useState(false);
  const icon = svg
    ? <img src={svg} width={28} height={28} alt={label} style={{ display: 'block', flexShrink: 0 }} />
    : iconEl;
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: '0 8px' }}>
      <button
        onClick={onClick || undefined}
        style={{ width: '100%', height: 58, padding: '0 10px', border: 'none', borderRadius: 10, background: hovered ? '#EBE9E6' : 'transparent', display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s', flexShrink: 0 }}>
        {icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '22px', letterSpacing: '-0.01em' }}>{label}</div>
          {hovered && sub && <div style={{ fontSize: 12, color: '#344054', lineHeight: '17px', marginTop: 1 }}>{sub}</div>}
        </div>
        {hovered && chips && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {chips.map((chip, i) => (
              <div key={i} title={chip.title} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {chip.icon}
              </div>
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

function PagePill({ title, onDismiss }) {
  const displayTitle = title || 'Jennifer Wong - Point of View in Summer of M...';
  return (
    <div style={{ margin: '0 14px 10px', padding: '7px 10px', background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>📄</span>
      <span style={{ fontSize: 13, color: C.slate700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>{displayTitle}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate400, fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>}
    </div>
  );
}

// Docked-style header — used on main menu and docked panel screens
function Header({ onClose, selectedClass: selCls, classBtnRef: cRef, onClassClick }) {
  const cls = selCls ? CLASSES.find(c => c.id === selCls) : null;
  return (
    <div style={{ background: '#FAF9F6', borderRadius: '12px 12px 0 0', borderBottom: `1px solid ${C.slate200}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6, height: 52 }}>
        <button ref={cRef} onClick={onClassClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 12, color: '#475467', fontWeight: 500, letterSpacing: '-0.01em' }}>{cls?.label || 'Select Class'}</span>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M2 5.5L5 2.5L8 5.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 8.5L5 11.5L8 8.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 400, color: '#475467', lineHeight: 1 }}>
            <img src="/icons/Help.svg" width={20} height={20} alt="" style={{ display: 'block' }} />
            Help
          </button>
          <img src="/icons/Home.svg" width={16} height={16} alt="Home" style={{ display: 'block', cursor: 'pointer' }} />
          <img src="/icons/More.svg" width={16} height={16} alt="More" style={{ display: 'block', cursor: 'pointer' }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
            <img src="/icons/Close.svg" width={16} height={16} alt="Close" style={{ display: 'block' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Same as Header but no border-radius (used mid-flow when quiz exists)
function HeaderFlat({ onClose, selectedClass: selCls, classBtnRef: cRef, onClassClick }) {
  const cls = selCls ? CLASSES.find(c => c.id === selCls) : null;
  return (
    <div style={{ background: '#FAF9F6', borderBottom: `1px solid ${C.slate200}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6, height: 52 }}>
        <button ref={cRef} onClick={onClassClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 12, color: '#475467', fontWeight: 500, letterSpacing: '-0.01em' }}>{cls?.label || 'Select Class'}</span>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M2 5.5L5 2.5L8 5.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 8.5L5 11.5L8 8.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 400, color: '#475467', lineHeight: 1 }}>
            <img src="/icons/Help.svg" width={20} height={20} alt="" style={{ display: 'block' }} />
            Help
          </button>
          <img src="/icons/Home.svg" width={16} height={16} alt="Home" style={{ display: 'block', cursor: 'pointer' }} />
          <img src="/icons/More.svg" width={16} height={16} alt="More" style={{ display: 'block', cursor: 'pointer' }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
            <img src="/icons/Close.svg" width={16} height={16} alt="Close" style={{ display: 'block' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const ModalCloseBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
    <img src="/icons/Close.svg" width={16} height={16} alt="Close" style={{ display: 'block' }} />
  </button>
);
const ModalBackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9L11 14" stroke={C.slate600} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </button>
);
const ModalMenuBtn = () => (
  <img src="/icons/More.svg" width={16} height={16} alt="More" style={{ display: 'block', cursor: 'pointer', flexShrink: 0 }} />
);

// Header used for quiz creation flow and iteration — with back, title, tabs
function QuizHeader({ onBack, onClose, activeTab, onTabChange, sourcesCount }) {
  return (
    <div style={{ background: '#fff', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: `1px solid ${C.slate200}`, gap: 10 }}>
        {onBack ? <ModalBackBtn onClick={onBack} /> : <div style={{ width: 18 }} />}
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.slate900, textAlign: 'center', letterSpacing: '-0.01em' }}>Quiz</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ModalMenuBtn />
          <ModalCloseBtn onClick={onClose} />
        </div>
      </div>
      {onTabChange && (
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.slate200}` }}>
          {['Overview', `Sources${sourcesCount ? ` (${sourcesCount})` : ''}`].map(tab => {
            const isActive = activeTab === tab || (tab.startsWith('Sources') && activeTab === 'Sources');
            return (
              <button key={tab} onClick={() => onTabChange(tab.startsWith('Sources') ? 'Sources' : tab)}
                style={{ flex: 1, padding: '9px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? C.slate900 : C.slate500, background: 'none', border: 'none', borderBottom: `2px solid ${isActive ? C.teal : 'transparent'}`, cursor: 'pointer', marginBottom: -1 }}>
                {tab}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PrefsHeader({ title, subtitle, onBack, onClose }) {
  return (
    <div style={{ background: '#fff', borderRadius: '11px 11px 0 0', borderBottom: `1px solid ${C.slate200}`, padding: '11px 14px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate600, fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: C.slate900 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.slate500, marginTop: 1, lineHeight: '18px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate400, fontSize: 15, padding: 0, flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

function SubHeader({ onBack, label = 'Quiz' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.slate200}`, background: '#fff', flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate600, fontSize: 16, padding: '0 8px 0 0', lineHeight: 1 }}>←</button>
      <span style={{ fontSize: 15, color: C.slate900, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function InlineClassPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, flexShrink: 0 }}>Class</span>
      <div style={{ position: 'relative', flex: 1 }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 22px 5px 10px',
            border: `1.5px solid ${C.slate200}`,
            borderRadius: 20,
            fontFamily: 'inherit',
            fontSize: 12,
            color: value ? C.slate900 : C.slate400,
            background: '#fff',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        >
          <option value="">Select your class…</option>
          {CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.slate400, fontSize: 9 }}>▾</span>
      </div>
    </div>
  );
}

// Stage navigator breadcrumb
const STEPS = ['Topic', 'Needs', 'Scaffolds', 'Create'];
function Breadcrumb({ active, visited = [], onStepClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px 0', background: '#fff', borderBottom: `1px solid ${C.slate200}`, gap: 2, flexShrink: 0 }}>
      {STEPS.map((s, i) => {
        const isActive = s === active;
        const isVisited = !isActive && visited.includes(s);
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {i > 0 && <span style={{ color: '#e5e7eb', fontSize: 10, margin: '0 3px', paddingBottom: 8 }}>—</span>}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 0 }}>
              <span
                onClick={() => isVisited && onStepClick?.(s)}
                onMouseEnter={e => { if (isVisited) e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { if (isVisited) e.currentTarget.style.textDecoration = 'none'; }}
                style={{
                  fontSize: isActive ? 12.5 : 12,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#0f172a' : isVisited ? '#374151' : '#6b7280',
                  cursor: isVisited ? 'pointer' : 'default',
                  userSelect: 'none',
                  paddingBottom: 6,
                  display: 'block',
                }}
              >{s}</span>
              <div style={{ height: 2, width: isActive ? '100%' : 0, background: '#0f172a', borderRadius: '1px 1px 0 0', transition: 'width 0.15s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BriskBubble({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <BriskLogo />
      <div style={{ background: C.slate100, border: `1px solid ${C.slate200}`, borderRadius: '0 10px 10px 10px', padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: C.slate900, maxWidth: '90%' }}>{children}</div>
    </div>
  );
}

function TeacherBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: C.slate900, borderRadius: '10px 10px 0 10px', padding: '10px 12px', fontSize: 14, lineHeight: 1.5, color: '#fff', maxWidth: '80%' }}>{children}</div>
    </div>
  );
}

function TextInput({ placeholder, value, onChange, onSubmit, disabled, animatedPlaceholder, animatedPlaceholderOpacity = 1, onFocus, onBlur }) {
  return (
    <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 12px', background: '#fff', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      <span style={{ color: C.slate400, fontSize: 14, flexShrink: 0 }}>+</span>
      <div style={{ flex: 1, position: 'relative' }}>
        <textarea rows={1} placeholder={animatedPlaceholder ? '' : placeholder} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          onFocus={onFocus} onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          style={{ width: '100%', border: 'none', borderRadius: 0, padding: '2px 0', fontSize: 14, lineHeight: '24px', fontFamily: 'inherit', resize: 'none', outline: 'none', color: C.slate900, opacity: disabled ? 0.5 : 1, boxSizing: 'border-box', background: 'transparent' }} />
        {animatedPlaceholder && !value && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', padding: '2px 0', fontSize: 14, lineHeight: '24px', color: C.slate400, opacity: animatedPlaceholderOpacity, transition: 'opacity 0.35s ease' }}>
            {animatedPlaceholder}
          </div>
        )}
      </div>
      <span style={{ color: C.slate400, fontSize: 14, flexShrink: 0 }}>🎤</span>
    </div>
  );
}

// Shared pill-style bottom input bar — used on Sources, Overview, Chat screens
function BottomInputBar({ placeholder, value, onChange, onSubmit, disabled }) {
  return (
    <div style={{ flexShrink: 0, background: '#FAF9F6', padding: '8px 24px 10px' }}>
      <div style={{ border: `1px solid ${C.slate200}`, borderRadius: 999, background: disabled ? '#F4F3F0' : '#fff', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 52, transition: 'background 0.15s' }}>
        <button className="icon-btn" style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0, opacity: disabled ? 0.4 : 1 }}>
          <img src="/icons/Add.svg" width={22} height={22} alt="Add" style={{ display: 'block' }} />
        </button>
        <input
          value={value}
          onChange={e => !disabled && onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !disabled) { e.preventDefault(); onSubmit?.(); } }}
          placeholder={placeholder}
          disabled={disabled}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 400, color: C.slate900, background: 'transparent', fontFamily: 'inherit', padding: 0, margin: 0, lineHeight: 'normal', display: 'block', opacity: disabled ? 0.4 : 1 }}
        />
        {value.trim() && !disabled ? (
          <button onClick={onSubmit} style={{ width: 36, height: 36, borderRadius: '50%', background: '#06465C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : (
          <MicButton size={22} className="icon-btn" btnStyle={{ opacity: disabled ? 0.4 : 1 }}
            onTranscript={(t, isFinal) => { if (!disabled) onChange(t); }} />
        )}
      </div>
    </div>
  );
}

function AddTertiaryBtn({ label = 'Add', onClick, style }) {
  return (
    <button onClick={onClick} className="add-tertiary-btn"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: '#0E151C', padding: '8px', ...style }}>
      <img src="/icons/Add.svg" width={14} height={14} alt="" style={{ display: 'block', flexShrink: 0 }} />
      {label}
    </button>
  );
}

function ChoiceRow({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', background: selected ? C.slate100 : '#fff', border: `1px solid ${selected ? C.slate300 : C.slate200}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, fontWeight: selected ? 600 : 400, color: C.slate900, textAlign: 'left' }}>
      {label}{selected && <span style={{ color: C.slate600, fontSize: 14 }}>→</span>}
    </button>
  );
}

function OtherChoiceRow({ onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (expanded && inputRef.current) inputRef.current.focus(); }, [expanded]);
  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)} style={{ width: '100%', background: C.slate100, border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: C.slate500, textAlign: 'left' }}>
        Other…
      </button>
    );
  }
  return (
    <div style={{ background: C.slate100, border: `1px solid ${C.slate300}`, borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && text.trim()) onSubmit(text.trim()); }}
        placeholder="Describe your situation…"
        style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 13, color: C.slate900, outline: 'none', padding: '2px 0' }} />
      <button onClick={() => text.trim() && onSubmit(text.trim())}
        style={{ width: 30, height: 30, background: text.trim() ? C.slate900 : C.slate300, color: '#fff', border: 'none', borderRadius: 6, cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, fontFamily: 'inherit' }}>→</button>
    </div>
  );
}

function NavButtons({ onBack, onSkip }) {
  const btn = { background: 'none', border: `1px solid ${C.slate200}`, borderRadius: 7, padding: '6px 14px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', color: C.slate600 };
  return (
    <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '8px 12px', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
      {onBack && <button onClick={onBack} style={btn}>Back</button>}
      {onSkip && <button onClick={onSkip} style={btn}>Skip</button>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ flex: 1 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: C.slate400, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', border: `1px solid ${C.slate200}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, color: C.slate900, background: '#fff', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>{typeof o === 'string' ? o : o.label}</option>)}
      </select>
    </div>
  );
}

const PLATFORMS = [
  { id: 'Forms', label: 'Forms', color: '#673AB7' },
  { id: 'Docs', label: 'Docs', color: '#4285F4' },
  { id: 'Slides', label: 'Slides', color: '#FBBC05' },
];
function PlatformSelector({ value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate400, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 }}>Platform</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => onChange(p.id)} style={{ flex: 1, padding: '8px 6px', border: `1.5px solid ${value === p.id ? p.color : C.slate200}`, borderRadius: 8, background: value === p.id ? `${p.color}12` : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: value === p.id ? 700 : 400, color: value === p.id ? p.color : C.slate600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, background: p.color, borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ label, noBorder }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.slate400, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '14px 14px 6px', borderTop: noBorder ? 'none' : `1px solid ${C.slate200}` }}>{label}</div>;
}

function CurriculumCard({ unit, title, loading, onSwap, url }) {
  const openUrl = url ? () => window.open(url, '_blank', 'noopener,noreferrer') : null;
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ width: 36, height: 36, background: '#fee2e2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📄</div>
      <div
        style={{ flex: 1, cursor: openUrl ? 'pointer' : 'default' }}
        onClick={!loading ? openUrl : undefined}
        title={url ? 'Open source page' : undefined}
      >
        {loading
          ? <><div style={{ height: 12, background: C.slate200, borderRadius: 4, width: '55%', marginBottom: 6 }} /><div style={{ height: 10, background: C.slate100, borderRadius: 4, width: '75%' }} /></>
          : <><div style={{ fontWeight: 700, fontSize: 13, color: C.slate900 }}>{unit}</div><div style={{ fontSize: 12, color: C.slate600, marginTop: 2 }}>{title}</div></>}
      </div>
      <div style={{ display: 'flex', gap: 8, color: C.slate400, fontSize: 16, flexShrink: 0 }}>
        {onSwap && <span onClick={!loading ? onSwap : undefined} style={{ cursor: loading ? 'default' : 'pointer' }} title="Try a different unit">⇄</span>}
        <span onClick={!loading ? openUrl : undefined} style={{ cursor: openUrl && !loading ? 'pointer' : 'default' }} title={url ? 'Open source page' : undefined}>↗</span>
      </div>
    </div>
  );
}

function StrategyCard({ name, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.amber50, border: `1px solid ${C.amber200}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', cursor: onClick ? 'pointer' : 'default' }} title={onClick ? `Open ${name} teacher guide` : undefined}>
      <div style={{ width: 36, height: 36, background: C.amber200, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📁</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.slate900 }}>{name} Guide</div>
        <div style={{ fontSize: 12, color: C.slate600, marginTop: 2 }}>District Instructional Strategy</div>
      </div>
      <span style={{ color: C.slate400, fontSize: 16 }}>↗</span>
    </div>
  );
}

function QuizCard({ title, subject, subtitleText, onBriskIt, onEdit }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ width: 36, height: 36, background: '#ede9fe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>⊞</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ fontSize: 12, color: C.slate600, marginTop: 2 }}>{subtitleText || `${subject} • 10 questions`}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <span onClick={onEdit} style={{ color: onEdit ? C.slate600 : C.slate300, cursor: onEdit ? 'pointer' : 'default', fontSize: 15, lineHeight: 1 }}>✏️</span>
        {onBriskIt && <button onClick={onBriskIt} style={{ background: C.slate900, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>Brisk It</button>}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 6 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: C.slate400, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </span>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid ${C.slate200}`, borderTopColor: C.green, animation: 'spin 0.75s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ChatScroll({ children }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; });
  return (
    <div ref={ref} className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

// ── Loading screen components ──────────────────────────────────

function ProgressBar() {
  const [width, setWidth] = useState(2);
  useEffect(() => { const t = setTimeout(() => setWidth(88), 80); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 20, background: 'rgba(255,255,255,0.15)' }}>
      <div style={{ height: '100%', background: C.green, width: `${width}%`, transition: 'width 14s cubic-bezier(0.05, 0.5, 0.3, 1)', borderRadius: '0 2px 2px 0' }} />
    </div>
  );
}

function DiamondLoader() {
  return (
    <div style={{ position: 'relative', width: 72, height: 96, margin: '0 auto', flexShrink: 0 }}>
      <style>{`@keyframes dpulse{0%,60%,100%{opacity:0.2;transform:translateX(-50%) rotate(45deg) scale(0.78)}30%{opacity:1;transform:translateX(-50%) rotate(45deg) scale(1)}}`}</style>
      {[
        { top: 62, bg: '#fef9c3', delay: '0s' },
        { top: 31, bg: '#d1fae5', delay: '0.45s' },
        { top: 0,  bg: '#dbeafe', delay: '0.9s' },
      ].map(({ top, bg, delay }) => (
        <div key={top} style={{ position: 'absolute', left: '50%', top, width: 46, height: 46, borderRadius: 6, background: bg, animation: `dpulse 2.2s ease-in-out ${delay} infinite` }} />
      ))}
    </div>
  );
}

function CheckItem({ label, delay, pulsing }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: show ? 1 : 0, transition: 'opacity 0.5s ease', fontSize: 13, color: C.slate700, marginBottom: 8 }}>
      {pulsing
        ? <span style={{ color: C.green, fontWeight: 700, fontSize: 11, animation: 'pulse 1.4s ease-in-out infinite' }}>●</span>
        : <span style={{ color: C.green, fontWeight: 700 }}>✓</span>}
      <span>{label}{pulsing && <LoadingDots />}</span>
      <style>{`@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}`}</style>
    </div>
  );
}

// ── Version dropdown ───────────────────────────────────────────
function VersionDropdown({ versions, activeIdx, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = versions[activeIdx];

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!versions.length) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: `1px solid ${C.slate200}`, borderRadius: 8, background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: C.slate900, cursor: 'pointer', width: '100%', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Version {activeIdx + 1}</span>
          <span style={{ color: C.slate400, fontSize: 11 }}>—</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: C.slate700 }}>{active?.quizData?.title || 'Quiz'}</span>
        </div>
        <span style={{ color: C.slate400, fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▾'}</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
          {versions.map((v, i) => (
            <div key={v.id} onClick={() => { onChange(i); setOpen(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', background: i === activeIdx ? C.slate100 : '#fff', borderBottom: i < versions.length - 1 ? `1px solid ${C.slate100}` : 'none', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: i === activeIdx ? C.green : C.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Version {i + 1}</span>
              <span style={{ color: C.slate300, fontSize: 11 }}>—</span>
              <span style={{ fontSize: 12, color: C.slate700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{v.quizData?.title || 'Quiz'}</span>
              <span style={{ fontSize: 11, color: C.slate400, flexShrink: 0 }}>{v.subtitle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single version tile for chat thread ────────────────────────
function VersionTile({ version, versionNum, isActive, onClick }) {
  return (
    <div onClick={onClick} style={{ background: isActive ? C.slate100 : '#fff', border: `1.5px solid ${isActive ? C.slate300 : C.slate200}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.green : C.slate400, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>V{versionNum}</span>
      <span style={{ color: C.slate300, fontSize: 11 }}>—</span>
      <span style={{ fontSize: 12, color: C.slate700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{version?.quizData?.title || 'Quiz'}</span>
      {isActive && <span style={{ fontSize: 11, color: C.green, flexShrink: 0 }}>✓ Viewing</span>}
    </div>
  );
}

// ── Clean Google Forms quiz (no interactivity, no answers) ─────
function GoogleFormsPreview({ quiz, title }) {
  return (
    <div style={{ minHeight: '100%', background: '#f0ebff', padding: '32px 28px 80px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Title card */}
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 12, border: '1px solid #e8e8e8' }}>
          <div style={{ background: C.formsPurple, height: 8 }} />
          <div style={{ padding: '22px 24px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 400, color: '#202124', lineHeight: 1.3 }}>{title || 'Quiz'}</div>
            <div style={{ fontSize: 14, color: '#70757a', marginTop: 4, lineHeight: '24px' }}>Form description</div>
          </div>
        </div>

        {/* Vocabulary warm-up — amber card */}
        {quiz?.warmup?.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '16px 24px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{quiz.warmupLabel || 'Warm-Up'}</div>
            {quiz.warmup.map((w, i) => (
              <div key={i} style={{ fontSize: 14, color: '#202124', marginBottom: 6, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>{w.term}</span> — {w.definition}
              </div>
            ))}
          </div>
        )}

        {/* Questions */}
        {quiz?.questions?.map((q, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '18px 24px', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#202124', lineHeight: 1.6, marginBottom: q.hint ? 8 : 14 }}>
              {q.question}
              {q.required && <span style={{ color: '#c62828', marginLeft: 2 }}>*</span>}
            </div>
            {q.hint && (
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginBottom: 12 }}>💡 Hint: {q.hint}</div>
            )}
            {q.options?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #9e9e9e', flexShrink: 0, background: '#fff' }} />
                    <span style={{ fontSize: 14, color: '#202124', lineHeight: 1.5 }}>{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ borderBottom: '1px solid #9e9e9e', paddingBottom: 4, color: '#9e9e9e', fontSize: 14 }}>Your answer</div>
            )}
          </div>
        ))}

        {!quiz && (
          <div style={{ textAlign: 'center', color: '#b39ddb', fontSize: 14, padding: 64 }}>Quiz will appear here</div>
        )}
      </div>
    </div>
  );
}

// ── Google Doc-style preview ───────────────────────────────────
function GoogleDocPreview({ quiz, title }) {
  return (
    <div style={{ minHeight: '100%', background: '#f1f3f4', fontFamily: 'Arial, sans-serif' }}>
      {/* App bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/icons/Docs.svg" width={30} height={30} alt="" style={{ display: 'block', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, color: '#202124', fontWeight: 400, fontFamily: 'Google Sans, Arial, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Untitled document'}</div>
          <div style={{ fontSize: 11, color: '#5f6368', marginTop: 1, fontFamily: 'Google Sans, Arial, sans-serif' }}>File &nbsp; Edit &nbsp; View &nbsp; Insert &nbsp; Format &nbsp; Tools &nbsp; Extensions &nbsp; Help</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#1a73e8', color: '#fff', fontSize: 13, fontWeight: 500, padding: '7px 20px', borderRadius: 4, fontFamily: 'Google Sans, Arial, sans-serif' }}>Share</div>
        </div>
      </div>
      {/* Toolbar strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '2px 16px', display: 'flex', alignItems: 'center', gap: 2 }}>
        {['↩', '↪', '🖨', 'B', 'I', 'U', 'A', '≡', '≣', '⇥'].map((icon, i) => (
          <div key={i} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontSize: i <= 2 ? 14 : 12, color: '#444', cursor: 'default' }}>{icon}</div>
        ))}
      </div>
      {/* Page */}
      <div style={{ padding: '32px 28px 80px' }}>
        <div style={{ maxWidth: 816, margin: '0 auto', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', minHeight: 1056, padding: '96px 96px 96px' }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: '#202124', marginBottom: 24, lineHeight: 1.3 }}>{title || 'Untitled document'}</h1>
          {quiz?.warmup?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#202124', marginBottom: 10 }}>{quiz.warmupLabel || 'Warm-Up'}</h2>
              {quiz.warmup.map((w, i) => (
                <p key={i} style={{ fontSize: 11, color: '#202124', marginBottom: 6, lineHeight: 1.8 }}>
                  <strong>{w.term}</strong> — {w.definition}
                </p>
              ))}
            </div>
          )}
          {quiz?.questions?.map((q, i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 11, color: '#202124', lineHeight: 1.8, marginBottom: 4 }}>
                <strong>{i + 1}.</strong> {q.question}
              </p>
              {q.options?.length > 0 ? (
                <div style={{ paddingLeft: 20 }}>
                  {q.options.map((opt, j) => (
                    <p key={j} style={{ fontSize: 11, color: '#202124', lineHeight: 1.8, margin: 0 }}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </p>
                  ))}
                </div>
              ) : (
                <div style={{ borderBottom: '1px solid #bbb', width: '55%', marginTop: 10 }} />
              )}
              {q.explanation && (
                <p style={{ fontSize: 10, color: '#5f6368', fontStyle: 'italic', marginTop: 4, lineHeight: 1.6 }}>{q.explanation}</p>
              )}
            </div>
          ))}
          {!quiz && <p style={{ color: '#aaa', fontSize: 11, paddingTop: 40, textAlign: 'center' }}>Document will appear here</p>}
        </div>
      </div>
    </div>
  );
}

// ── Google Slides-style preview ────────────────────────────────
function GoogleSlidesPreview({ quiz, title }) {
  const slides = [];
  if (quiz) {
    // Title slide
    slides.push({ type: 'title', heading: title || 'Untitled', sub: quiz.warmupLabel || '' });
    // Warmup slide
    if (quiz.warmup?.length > 0) {
      slides.push({ type: 'warmup', heading: quiz.warmupLabel || 'Warm-Up', items: quiz.warmup });
    }
    // One slide per question (group 2 per slide)
    const qs = quiz.questions || [];
    for (let i = 0; i < qs.length; i += 2) {
      slides.push({ type: 'questions', items: qs.slice(i, i + 2), startIdx: i });
    }
  }
  const [active, setActive] = useState(0);
  const current = slides[active];

  function SlideContent({ slide }) {
    if (!slide) return null;
    if (slide.type === 'title') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 60px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, marginBottom: 16 }}>{slide.heading}</div>
        {slide.sub && <div style={{ fontSize: 16, color: '#5f6368' }}>{slide.sub}</div>}
      </div>
    );
    if (slide.type === 'warmup') return (
      <div style={{ padding: '32px 48px', height: '100%' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 18, borderBottom: '2px solid #4285f4', paddingBottom: 8 }}>{slide.heading}</div>
        {slide.items.map((w, i) => (
          <div key={i} style={{ fontSize: 14, color: '#202124', marginBottom: 10, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 700, color: '#1a73e8' }}>{w.term}</span> — {w.definition}
          </div>
        ))}
      </div>
    );
    if (slide.type === 'questions') return (
      <div style={{ padding: '28px 48px', height: '100%' }}>
        {slide.items.map((q, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.5, marginBottom: 8 }}>
              Q{slide.startIdx + i + 1}. {q.question}
            </div>
            {q.options?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {q.options.map((opt, j) => (
                  <div key={j} style={{ fontSize: 13, color: '#444', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: '#4285f4', flexShrink: 0 }}>{String.fromCharCode(65 + j)}.</span> {opt}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
    return null;
  }

  return (
    <div style={{ minHeight: '100%', background: '#1e1e1e', fontFamily: 'Google Sans, Arial, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* App bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <img src="/icons/Slides.svg" width={30} height={30} alt="" style={{ display: 'block', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, color: '#202124', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Untitled presentation'}</div>
          <div style={{ fontSize: 11, color: '#5f6368', marginTop: 1 }}>File &nbsp; Edit &nbsp; View &nbsp; Insert &nbsp; Format &nbsp; Slide &nbsp; Tools &nbsp; Help</div>
        </div>
        <div style={{ background: '#fbbc04', color: '#000', fontSize: 13, fontWeight: 500, padding: '7px 20px', borderRadius: 4 }}>Share</div>
      </div>
      {/* Toolbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '2px 16px', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {['↩', '↪', 'T', '⬛', '○', '◁', 'B', 'I', 'U'].map((icon, i) => (
          <div key={i} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, fontSize: 12, color: '#444', cursor: 'default' }}>{icon}</div>
        ))}
      </div>
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Slide strip */}
        <div style={{ width: 160, background: '#2d2d2d', overflowY: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          {slides.map((s, i) => (
            <div key={i} onClick={() => setActive(i)}
              style={{ background: active === i ? '#4285f4' : '#fff', borderRadius: 3, padding: 3, cursor: 'pointer', outline: active === i ? '2px solid #4285f4' : 'none', outlineOffset: 1 }}>
              <div style={{ background: '#fff', aspectRatio: '16/9', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
                <div style={{ fontSize: 5, color: '#333', lineHeight: 1.4, overflow: 'hidden', maxHeight: '100%', width: '100%', textAlign: 'center' }}>
                  {s.type === 'title' ? s.heading :
                   s.type === 'warmup' ? s.heading :
                   `Q${s.startIdx + 1}${s.items.length > 1 ? `–${s.startIdx + s.items.length}` : ''}`}
                </div>
              </div>
              <div style={{ fontSize: 9, color: active === i ? '#fff' : '#aaa', textAlign: 'center', marginTop: 3 }}>{i + 1}</div>
            </div>
          ))}
          {!quiz && <div style={{ color: '#888', fontSize: 10, textAlign: 'center', marginTop: 20 }}>Slides will appear here</div>}
        </div>
        {/* Active slide */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: 800, aspectRatio: '16/9', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
            {/* Slide accent bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, #4285f4, #34a853)' }} />
            {current ? <SlideContent slide={current} /> : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 14 }}>No slides yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Animated skeleton while page is scraping ──────────────────
function SkeletonBackground() {
  return (
    <div style={{ height: '100vh', background: '#f0f0f0', padding: '48px 64px 80px', overflowY: 'hidden' }}>
      <style>{`@keyframes skpulse{0%,100%{opacity:.35}50%{opacity:.8}}`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '48px 56px' }}>
        <div style={{ height: 12, background: '#e2e2e2', borderRadius: 4, width: '35%', marginBottom: 28, animation: 'skpulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 26, background: '#e2e2e2', borderRadius: 4, width: '88%', marginBottom: 10, animation: 'skpulse 1.5s ease-in-out 0.1s infinite' }} />
        <div style={{ height: 26, background: '#e2e2e2', borderRadius: 4, width: '64%', marginBottom: 36, animation: 'skpulse 1.5s ease-in-out 0.2s infinite' }} />
        {[100, 93, 97, 88, 95, 80, 92, 86, 98, 75, 91, 84, 96].map((w, i) => (
          <div key={i} style={{ height: 13, background: '#ebebeb', borderRadius: 4, width: `${w}%`, marginBottom: 11, animation: `skpulse 1.5s ease-in-out ${(0.3 + i * 0.06).toFixed(2)}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ── Reader Mode view after scraping completes ──────────────────
function ReaderModeBackground({ ctx }) {
  const domain = (() => { try { return new URL(ctx.url).hostname.replace(/^www\./, ''); } catch { return ctx.url; } })();
  if (ctx.failed) {
    return (
      <div style={{ height: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 64px' }}>
        <div style={{ maxWidth: 480, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '32px 40px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <img src={`https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(domain)}`} alt="" width={24} height={24} style={{ borderRadius: 4, marginTop: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#222', marginBottom: 4 }}>{domain}</div>
            <div style={{ fontSize: 13, color: '#888', wordBreak: 'break-all', marginBottom: 8 }}>{ctx.url}</div>
            <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>Using this page as context</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ height: '100vh', background: '#f5f5f5', overflowY: 'auto', padding: '48px 64px 80px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', background: '#fff', borderRadius: 4, boxShadow: '0 2px 16px rgba(0,0,0,0.09)', padding: '48px 56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 20 }}>
          <img src={`https://www.google.com/s2/favicons?sz=16&domain=${encodeURIComponent(domain)}`} alt="" width={14} height={14} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
          <span style={{ fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
        </div>
        {ctx.title && (
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, margin: '0 0 28px', fontFamily: 'Georgia, serif' }}>{ctx.title}</h1>
        )}
        {(ctx.bodyText || ctx.preview) && (
          <div style={{ fontSize: 17, color: '#333', lineHeight: 1.8, fontFamily: 'Georgia, serif' }}>
            {(ctx.bodyText || ctx.preview).split(/\n+/).filter(p => p.trim().length > 20).slice(0, 30).map((para, i) => (
              <p key={i} style={{ margin: '0 0 18px' }}>{para.trim()}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TOOL CREATION SCREEN
// ══════════════════════════════════════════════════════════════
const FORMAT_OPTIONS = {
  quiz: [
    { value: 'Forms',   label: 'Google Forms',   icon: '/icons/Forms.svg'   },
    { value: 'Docs',    label: 'Google Doc',      icon: '/icons/Docs.svg'    },
    { value: 'Kahoot',  label: 'Kahoot',          icon: '/icons/Kahoot.svg'  },
    { value: 'Nearpod', label: 'Nearpod',         icon: '/icons/Nearpod.svg' },
  ],
  doc: [
    { value: 'Docs',   label: 'Google Doc',      icon: '/icons/Docs.svg'   },
    { value: 'Slides', label: 'Google Slides',   icon: '/icons/Slides.svg' },
    { value: 'Word',   label: 'Microsoft Word',  icon: '/icons/Word.svg'   },
  ],
  presentation: [
    { value: 'Slides',     label: 'Google Slides',       icon: '/icons/Slides.svg'     },
    { value: 'Powerpoint', label: 'Microsoft PowerPoint', icon: '/icons/Powerpoint.svg' },
  ],
};

function FormatDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUp: false });
  const triggerRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  function handleOpen() {
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuHeight = options.length * 44 + 8; // approx height
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 12;
      setMenuPos({
        left: rect.left,
        top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
        openUp,
      });
    }
    setOpen(true);
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button ref={triggerRef} onClick={handleOpen}
        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 10px 0 8px', border: '1px solid #E2E1DE', borderRadius: 20, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: '#0E151C', cursor: 'pointer', outline: 'none' }}>
        <img src={selected.icon} width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />
        <span>{selected.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 1L5 5L9 1" stroke="#78716c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, minWidth: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)', zIndex: 9999, overflow: 'hidden', padding: '4px 0' }}>
            {options.map(opt => {
              const isSel = opt.value === value;
              return (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#0E151C', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F5F4F2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                  <img src={opt.icon} width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {isSel && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="#1B6B6B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ToolCreationScreen({ toolName, toolIcon, toolType = 'quiz', promptPlaceholder, input, onInputChange, prefs, onPrefsChange, pageContext, pageChipVisible, onDismissChip, onAddClick, onBriskIt, onBack, onClose }) {
  const textareaRef = useRef(null);
  const addBtnRef = useRef(null);
  const promptBoxRef = useRef(null);
  const chevron = (
    <svg style={{ position: 'absolute', right: 10, pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none">
      <path d="M1 1L5 5L9 1" stroke="#78716c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const pillSelect = (value, options, onChange, leftIcon) => (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {leftIcon && <div style={{ position: 'absolute', left: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center', zIndex: 1 }}>{leftIcon}</div>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: `7px 28px 7px ${leftIcon ? '34px' : '12px'}`, border: '1px solid #E2E1DE', borderRadius: 20, fontFamily: 'inherit', fontSize: 13, color: '#0E151C', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none' }}>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
      {chevron}
    </div>
  );
  return (
    <>
      {/* Header */}
      <div style={{ background: '#FAF9F6', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #e7e5e4', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, gap: 8 }}>
          <ModalBackBtn onClick={onBack} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/icons/Help.svg" width={20} height={20} alt="Help" style={{ display: 'block', cursor: 'pointer' }} />
            <img src="/icons/Home.svg" width={16} height={16} alt="Home" style={{ display: 'block', cursor: 'pointer' }} />
            <ModalMenuBtn />
            <ModalCloseBtn onClick={onClose} />
          </div>
        </div>
      </div>

      {/* Fixed heading — stack vertically when title is long enough to wrap */}
      {(() => {
        const headingText = `What\u2019s your ${toolName.toLowerCase()} about?`;
        const stacked = headingText.length > 32;
        const iconSize = stacked ? 40 : 32;
        const isSlidesDefault = toolType === 'doc' && (toolName.toLowerCase().includes('presentation') || toolName.toLowerCase().includes('slide'));
        const effectiveDocFormat = prefs.docFormat || (isSlidesDefault ? 'Slides' : 'Docs');
        const docIcon = effectiveDocFormat === 'Word' ? 'Word' : effectiveDocFormat === 'Powerpoint' ? 'Powerpoint' : effectiveDocFormat === 'Slides' ? 'Slides' : 'Docs';
        const icon = <img src={toolType === 'doc' ? `/icons/${docIcon}.svg` : `/icons/${prefs.platform || 'Forms'}.svg`} width={iconSize} height={iconSize} alt={toolName} style={{ display: 'block', flexShrink: 0 }} />;
        return (
          <div style={{ flexShrink: 0, padding: '20px 24px 12px', display: 'flex', flexDirection: stacked ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: stacked ? 8 : 10, background: '#FAF9F6', textAlign: stacked ? 'center' : 'left' }}>
            {icon}
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0E151C', lineHeight: '26px', letterSpacing: '-0.02em', ...(stacked ? { padding: '0 24px' } : {}) }}>{headingText}</div>
          </div>
        );
      })()}

      {/* Fixed prompt box — min 185px tall so the input area feels spacious */}
      <div style={{ flexShrink: 0, background: '#FAF9F6', padding: '0 24px 12px' }}>
        <div ref={promptBoxRef} style={{ background: '#fff', border: '1px solid #E5E4E2', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', minHeight: 185, display: 'flex', flexDirection: 'column' }}>
          {pageChipVisible && pageContext && (
            <div style={{ padding: '8px 10px 2px' }}>
              <div className="page-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #E5E4E2', borderRadius: 6, padding: '5px 8px 5px 6px', minWidth: 0 }}>
                <img src="/icons/Web - Stroke.svg" width={14} height={14} alt="" style={{ display: 'block', flexShrink: 0, opacity: 0.5 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#475467', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>{pageContext.title}</span>
                <button onClick={onDismissChip} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#475467" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 4, padding: '10px 8px 10px' }}>
            <button ref={addBtnRef} className="icon-btn"
              onClick={() => { const r = addBtnRef.current?.getBoundingClientRect(); if (r && onAddClick) onAddClick({ top: r.bottom + 6, left: r.left }); }}
              style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0 }}>
              <img src="/icons/Add.svg" width={20} height={20} alt="Add" style={{ display: 'block' }} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                onInputChange(e.target.value);
                const el = textareaRef.current;
                if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; }
              }}
              placeholder={promptPlaceholder}
              rows={1}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 400, color: '#0E151C', background: 'transparent', fontFamily: 'inherit', lineHeight: '22px', resize: 'none', overflowY: 'hidden', minHeight: 140, paddingTop: 5 }}
            />
            <MicButton size={20} className="icon-btn"
              onTranscript={(t) => { onInputChange(t); const el = textareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; } }} />
          </div>
        </div>
      </div>

      <IntentChips
        toolName={toolName}
        input={input}
        onInputChange={onInputChange}
        pageContext={pageContext}
        pageChipVisible={pageChipVisible}
        promptBoxRef={promptBoxRef}
      />

      {/* Scrollable body */}
      <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', background: '#FAF9F6', padding: '8px 24px 0' }}>

        {/* Audience */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 8, lineHeight: '18px' }}>Audience</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', rowGap: 8 }}>
            {pillSelect(prefs.grade, ['K','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(g => ({ value: g, label: `${g} Grade` })), v => onPrefsChange({ grade: v }))}
            {pillSelect(prefs.language, ['English','Spanish','French','Mandarin','Arabic'], v => onPrefsChange({ language: v }))}
          </div>
        </div>

        {/* Format */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#78716c', marginBottom: 8, lineHeight: '18px' }}>Format</div>
          {toolType === 'doc' ? (
            <FormatDropdown
              options={isSlidesDefault ? FORMAT_OPTIONS.presentation : FORMAT_OPTIONS.doc}
              value={prefs.docFormat || (isSlidesDefault ? 'Slides' : 'Docs')}
              onChange={v => onPrefsChange({ docFormat: v })}
            />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', rowGap: 8, marginBottom: 8 }}>
                <FormatDropdown
                  options={FORMAT_OPTIONS.quiz}
                  value={prefs.platform || 'Forms'}
                  onChange={v => onPrefsChange({ platform: v })}
                />
                {pillSelect(prefs.questionType, ['Multiple choice','Short Answer','True/False'], v => onPrefsChange({ questionType: v }))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', rowGap: 8 }}>
                {pillSelect(String(prefs.numQuestions), ['5','10','15','20'].map(n => ({ value: n, label: `${n} questions` })), v => onPrefsChange({ numQuestions: Number(v) }))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Action buttons — pinned to bottom */}
      <div style={{ flexShrink: 0, padding: '12px 12px 16px', background: '#FAF9F6', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        <button onClick={onBriskIt} style={{ height: 40, padding: '0 24px', border: 'none', borderRadius: 20, background: '#06465C', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Brisk It
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
const DEFAULT_PREFS = { language: 'English', grade: '8th', questionType: 'Multiple choice', numQuestions: 10, platform: 'Forms', includeSources: false };

export default function Home() {
  const [sessionId] = useState(() => genUUID());
  const [screen, setScreen] = useState('welcome');
  const [userType, setUserType] = useState('Teacher');
  const [input, setInput] = useState('');

  const [topic, setTopic] = useState('');
  const [curriculumCard, setCurriculumCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [hardestThing, setHardestThing] = useState('');
  const [fluencyAnswer, setFluencyAnswer] = useState('');
  const [needs2Data, setNeeds2Data] = useState(null);
  const [needs2Loading, setNeeds2Loading] = useState(false);
  const [needs2Answer, setNeeds2Answer] = useState('');
  const [needs2Selections, setNeeds2Selections] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [detectedSubject, setDetectedSubject] = useState('');
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [scaffolds, setScaffolds] = useState([]);
  const [versions, setVersions] = useState([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(0);
  const [chatLog, setChatLog] = useState([]);
  const [maxScreenReached, setMaxScreenReached] = useState(0);
  const [panelPos, setPanelPos] = useState(null); // null = default bottom-right
  const [activeTab, setActiveTab] = useState('Overview');
  const [expandedSource, setExpandedSource] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuPos, setAddMenuPos] = useState({ top: 0, left: 0 });
  const addBtnRef = useRef(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [classPickerPos, setClassPickerPos] = useState({ top: 0, left: 0 });
  const classBtnRef = useRef(null);
  const welcomeTextareaRef = useRef(null);
  const createTextareaRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pageChipVisible, setPageChipVisible] = useState(true);
  const [chipDismissing, setChipDismissing] = useState(false);
  function dismissChip() {
    setChipDismissing(true);
    setTimeout(() => { setPageChipVisible(false); setChipDismissing(false); }, 220);
  }
  const [welcomeScroll, setWelcomeScroll] = useState(0);
  const [createScroll, setCreateScroll] = useState(0);
  const [welcomeSearch, setWelcomeSearch] = useState('');
  const [createSearch, setCreateSearch] = useState('');
  const [debouncedWelcomeSearch, setDebouncedWelcomeSearch] = useState('');
  const [debouncedCreateSearch, setDebouncedCreateSearch] = useState('');
  const [semanticLibResults, setSemanticLibResults] = useState({ my: [], district: [] });
  const [semanticLibResultsCS, setSemanticLibResultsCS] = useState({ my: [], district: [] });
  const panelRef = useRef(null);
  const retryFeedbackRef = useRef('');
  const retryQuizRef = useRef(null);
  const currentQuizRef = useRef(null); // always holds the latest quiz, bypasses stale closure

  // Class picker
  const [selectedClass, setSelectedClass] = useState('');
  const [classOverridden, setClassOverridden] = useState(false);
  const [classFlashing, setClassFlashing] = useState(false);

  // Page context (Screen 0)
  const [pageUrl, setPageUrl] = useState('');
  const [pageContext, setPageContext] = useState(null);
  const [pageContextLoading, setPageContextLoading] = useState(false);
  useEffect(() => { if (pageContext) setPageChipVisible(true); }, [pageContext]);
  useEffect(() => {
    if (pageContext && !classOverridden) {
      const detected = detectClassFromTopic(pageContext.title || pageContext.url || '');
      if (detected) setSelectedClass(detected);
    }
  }, [pageContext]);
  const fileInputRef = useRef(null);

  // Dynamic rotating placeholder suggestions (Screen 2)
  const [needsSuggestions, setNeedsSuggestions] = useState([]);
  const [needsSuggestionsLoading, setNeedsSuggestionsLoading] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderOpacity, setPlaceholderOpacity] = useState(1);
  const [needsInputFocused, setNeedsInputFocused] = useState(false);

  // Dynamic rotating placeholder suggestions (Screen 6)
  const [scaffoldSuggestions, setScaffoldSuggestions] = useState([]);
  const [scaffoldPlaceholderIdx, setScaffoldPlaceholderIdx] = useState(0);
  const [scaffoldPlaceholderOpacity, setScaffoldPlaceholderOpacity] = useState(1);
  const [scaffoldInputFocused, setScaffoldInputFocused] = useState(false);
  const [warmupAnswered, setWarmupAnswered] = useState('');

  // Chat detail screen state
  const [chatToolName, setChatToolName] = useState('Ask Brisk');
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');
  const [chatAnswers, setChatAnswers] = useState([]); // [{q, a}]
  const [chatCurrentQ, setChatCurrentQ] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatOpenTextVal, setChatOpenTextVal] = useState('');
  const [chatLoadingMsgIdx, setChatLoadingMsgIdx] = useState(0);
  const [chatQCurrentSel, setChatQCurrentSel] = useState('');
  const [chatOtherMode, setChatOtherMode] = useState(false); // "Something else" inline text
  const [chatOtherText, setChatOtherText] = useState('');
  const [chatIsRouting, setChatIsRouting] = useState(false);   // routing to a tool
  const [chatRoutingTarget, setChatRoutingTarget] = useState(null); // {type, label, topic}

  // Screen 1 tool type ('quiz' | 'doc') and label
  const [screenOneToolType, setScreenOneToolType] = useState('quiz');
  const [screenOneToolLabel, setScreenOneToolLabel] = useState('Quiz');

  // Quiz generation flow (screen 'quiz-gen')
  const [quizGenTab, setQuizGenTab] = useState('Overview');
  const [quizGenPhase, setQuizGenPhase] = useState('q1'); // 'q1' | 'q2' | 'answered' | 'done'
  const [quizGenQ1Sels, setQuizGenQ1Sels] = useState([]);
  const [quizGenQ2, setQuizGenQ2] = useState('');
  const [quizGenAnswers, setQuizGenAnswers] = useState([]); // [{q, a}]
  const [quizGenLoadingIdx, setQuizGenLoadingIdx] = useState(0);
  const [quizGenKey, setQuizGenKey] = useState(0);
  // sourcesReady is derived below near isDockedRight
  const [sourcesViewed, setSourcesViewed] = useState(false);
  const [quizGenExpandedSource, setQuizGenExpandedSource] = useState(null);
  const [qgQuizData, setQgQuizData] = useState(null);
  const [qgFormsLoading, setQgFormsLoading] = useState(false);
  const qgScrollRef = useRef(null);
  const qgSummaryRef = useRef(null);
  const qgBottomRef = useRef(null);
  const [qgUserReply, setQgUserReply] = useState('');
  const [qgIterationHistory, setQgIterationHistory] = useState([]); // [{msg}] — chip/prompt history
  const [qgNeedsText, setQgNeedsText] = useState('');
  const [qgQ1OtherText, setQgQ1OtherText] = useState('');
  const [qgQ1OtherActive, setQgQ1OtherActive] = useState(false);
  const [qgQ2OtherText, setQgQ2OtherText] = useState('');
  const [qgQ2OtherActive, setQgQ2OtherActive] = useState(false);

  const SCREEN_NAMES = {
    0: 'page-context', 1: 'topic', 2: 'curriculum-card', 3: 'needs-1', 4: 'needs-2',
    5: 'scaffolds-loading', 6: 'scaffold-recommendation',
    7: 'create-summary', '7b': 'edit-preferences', '7c': 'scaffolds-editor',
    8: 'generation-loading', 9: 'final-output',
  };

  useEffect(() => {
    logStep(sessionId, 'page_loaded', '', '', { user_type: userType });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect class from topic input while on Screen 1
  useEffect(() => {
    if (screen !== 1 || classOverridden || !input.trim()) return;
    const detected = detectClassFromTopic(input);
    if (detected && detected !== selectedClass) {
      setSelectedClass(detected);
      setClassFlashing(true);
      const t = setTimeout(() => setClassFlashing(false), 700);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  // Auto-fetch page metadata when URL is pasted
  useEffect(() => {
    if (!pageUrl.trim()) return;
    if (!/^https?:\/\//i.test(pageUrl.trim())) return;
    const t = setTimeout(() => handleFetchPage(pageUrl.trim()), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrl]);

  function go(next, userInput = '', aiResponse = '') {
    logStep(sessionId, SCREEN_NAMES[next] || `screen_${next}`, userInput, aiResponse, { user_type: userType });
    setScreen(next);
    setInput('');
    if (typeof next === 'number') {
      setMaxScreenReached(prev => Math.max(prev, next));
    }
  }

  function handleBreadcrumbNav(step) {
    const map = { Topic: 2, Needs: 3, Scaffolds: 6, Create: versions.length > 0 ? 9 : 7 };
    if (map[step] !== undefined) { setScreen(map[step]); setInput(''); }
  }

  useEffect(() => {
    if (screen !== 'chat') return;
    setChatLoadingMsgIdx(0);
    const id = setInterval(() => setChatLoadingMsgIdx(i => i + 1), 2200);
    return () => clearInterval(id);
  }, [screen, chatCurrentQ]);

  // Quiz-gen: rotate loading messages every 2.5s
  useEffect(() => {
    if (screen !== 'quiz-gen') return;
    setQuizGenLoadingIdx(0);
    const id = setInterval(() => setQuizGenLoadingIdx(i => i + 1), 2500);
    return () => clearInterval(id);
  }, [screen, quizGenKey]);

  // Quiz-gen: transition to 'done' phase 3s after all questions answered
  // But wait if the user is actively typing (input non-empty) — let them finish
  useEffect(() => {
    if (screen !== 'quiz-gen' || quizGenPhase !== 'answered') return;
    if (input.trim()) return; // user is typing — don't push yet
    const t = setTimeout(() => setQuizGenPhase('done'), 3000);
    return () => clearTimeout(t);
  }, [screen, quizGenPhase, input]);

  // Chat routing: B shimmer shows briefly then transitions to ToolCreationScreen
  useEffect(() => {
    if (!chatIsRouting || !chatRoutingTarget) return;
    const t = setTimeout(() => {
      setScreenOneToolType(chatRoutingTarget.type);
      setScreenOneToolLabel(chatRoutingTarget.label);
      setInput(chatRoutingTarget.topic);
      setChatIsRouting(false);
      setChatRoutingTarget(null);
      setScreen(1);
    }, 1600);
    return () => clearTimeout(t);
  }, [chatIsRouting, chatRoutingTarget]);

  // Quiz-gen: scroll so newest content is always visible
  useEffect(() => {
    if (screen !== 'quiz-gen') return;
    // When first transitioning to done with no iteration, scroll to summary (Brisk's message)
    if (quizGenPhase === 'done' && qgIterationHistory.length === 0 && qgSummaryRef.current) {
      qgSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const el = qgBottomRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [screen, quizGenAnswers, quizGenPhase, quizGenLoadingIdx, qgIterationHistory]);

  // Quiz-gen: generate resource once questions answered
  useEffect(() => {
    if (screen !== 'quiz-gen' || quizGenPhase !== 'answered') return;
    setQgFormsLoading(true);
    setQgQuizData(null);
    const cls = CLASSES.find(c => c.id === selectedClass);
    const grade = cls?.grade || prefs.grade || '8th';
    const subject = cls?.subject || detectedSubject || 'ELA';
    const struggleAnswer = quizGenAnswers[0]?.a || '';
    const goalAnswer = quizGenAnswers[1]?.a || 'check understanding';
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic, subject, grade,
        toolName: screenOneToolLabel || 'Quiz',
        hardestThing: struggleAnswer,
        struggleAnswer: goalAnswer,
        questionType: prefs.questionType || 'Multiple choice',
        numQuestions: prefs.numQuestions || 10,
        pageContextTitle: pageContext?.title || '',
        pageContextPreview: pageContext?.preview || '',
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.questions) setQgQuizData(data); })
      .catch(() => {})
      .finally(() => setQgFormsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizGenPhase]);

  // Quiz-gen: re-generate forms when user submits a refinement request
  useEffect(() => {
    if (!qgUserReply) return;
    setQgFormsLoading(true);
    const cls = CLASSES.find(c => c.id === selectedClass);
    const grade = cls?.grade || prefs.grade || '8th';
    const subject = cls?.subject || detectedSubject || 'ELA';
    const struggleAnswer = quizGenAnswers[0]?.a || '';
    const goalAnswer = quizGenAnswers[1]?.a || 'check understanding';
    const numQ = qgUserReply === 'Make it shorter'
      ? Math.max(3, (prefs.numQuestions || 10) - 3)
      : prefs.numQuestions || 10;
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        subject, grade,
        toolName: screenOneToolLabel || 'Quiz',
        hardestThing: struggleAnswer,
        struggleAnswer: goalAnswer,
        questionType: qgUserReply === 'Make it harder' ? 'Multiple choice' : (prefs.questionType || 'Multiple choice'),
        numQuestions: numQ,
        pageContextTitle: pageContext?.title || '',
        pageContextPreview: pageContext?.preview || '',
      }),
    })
      .then(r => r.json())
      .then(data => { if (data.questions) setQgQuizData(data); })
      .catch(() => {})
      .finally(() => setQgFormsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qgUserReply]);

  // Search debounce — 400ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => setDebouncedWelcomeSearch(welcomeSearch), 400);
    return () => clearTimeout(t);
  }, [welcomeSearch]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCreateSearch(createSearch), 400);
    return () => clearTimeout(t);
  }, [createSearch]);

  // Semantic library search — main panel
  useEffect(() => {
    const q = debouncedWelcomeSearch.trim();
    if (q.length < 2) { setSemanticLibResults({ my: [], district: [] }); return; }
    let cancelled = false;
    fetch('/api/library-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, panel: 'main' }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setSemanticLibResults(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedWelcomeSearch]);

  // Semantic library search — create/class panel
  useEffect(() => {
    const q = debouncedCreateSearch.trim();
    if (q.length < 2) { setSemanticLibResultsCS({ my: [], district: [] }); return; }
    let cancelled = false;
    fetch('/api/library-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, panel: 'create' }),
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setSemanticLibResultsCS(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedCreateSearch]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(v => !v);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleClose() {
    setIsOpen(false);
    setScreen('welcome'); setWelcomeScroll(0); setCreateScroll(0); setTopic(''); setCurriculumCard(null); setCardLoading(false);
    setHardestThing(''); setFluencyAnswer(''); setNeeds2Data(null);
    setNeeds2Loading(false); setNeeds2Answer(''); setNeeds2Selections([]); setStrategy(null);
    setQuizLoading(false); setApiError(''); setDetectedSubject('');
    setScaffolds([]); setPrefs(DEFAULT_PREFS); setInput('');
    setVersions([]); setActiveVersionIdx(0); setChatLog([]); setMaxScreenReached(0);
    setSelectedClass(''); setClassOverridden(false); setClassFlashing(false);
    setPageUrl(''); setPageContext(null); setPageContextLoading(false);
    setNeedsSuggestions([]); setNeedsSuggestionsLoading(false);
    setPlaceholderIdx(0); setPlaceholderOpacity(1); setNeedsInputFocused(false);
    setWarmupAnswered('');
    setPanelPos(null);
    setChatToolName('Ask Brisk'); setChatInitialPrompt(''); setChatAnswers([]); setChatCurrentQ(0); setChatInput(''); setChatOpenTextVal('');
    currentQuizRef.current = null;
  }

  function handlePromptSend() {
    const p = welcomeSearch.trim();
    if (!p) return;
    setWelcomeSearch('');
    setChatAnswers([]);
    setChatCurrentQ(0);
    setChatInput('');
    setChatOpenTextVal('');
    setChatOtherMode(false);
    setChatOtherText('');

    const detected = detectToolAndTopic(p);
    if (detected) {
      // Topic + tool detected — go straight to ToolCreationScreen with full text preserved
      setScreenOneToolType(detected.type);
      setScreenOneToolLabel(detected.label);
      setInput(p);
      setScreen(1);
    } else {
      const toolName = classifyPrompt(p);
      setChatToolName(toolName);
      setChatInitialPrompt(p);
      setScreen('chat');
    }
  }

  async function handleFetchPage(urlOverride) {
    const u = (urlOverride || pageUrl).trim();
    if (!u) return;
    setPageContextLoading(true);
    try {
      const res = await fetch('/api/fetch-page', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) });
      const data = await res.json();
      const failed = !data.title && !data.bodyText;
      setPageContext({ type: 'url', url: u, title: data.title || '', preview: data.preview || '', bodyText: data.bodyText || '', subject_hint: data.subject_hint || '', failed });
    } catch {
      setPageContext({ type: 'url', url: u, title: '', preview: '', bodyText: '', subject_hint: '', failed: true });
    } finally { setPageContextLoading(false); }
  }

  async function handleScreenshotUpload(file) {
    if (!file) return;
    setPageContextLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target.result;
      // Show screenshot as background immediately — don't wait for Claude
      setPageContext({ type: 'screenshot', imageDataUrl, title: '', subject: '', grade: '', preview: '' });
      try {
        const base64 = imageDataUrl.split(',')[1];
        const mediaType = file.type || 'image/jpeg';
        const res = await fetch('/api/analyze-screenshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, mediaType }) });
        const data = await res.json();
        setPageContext({ type: 'screenshot', imageDataUrl, title: data.topic || 'Uploaded content', subject: data.subject || '', grade: data.grade || '', preview: data.description || '' });
      } catch {
        setPageContext(prev => ({ ...prev, title: 'Uploaded content' }));
      } finally { setPageContextLoading(false); }
    };
    reader.readAsDataURL(file);
  }

  async function handleAboutThisPage() {
    // Ensure background reader fetch is running if not already
    if (!pageContext && pageUrl && !pageContextLoading) handleFetchPage(pageUrl.trim());
    const t = pageContext?.title || pageUrl || '';
    setTopic(t);
    const ds = pageContext?.subject_hint || pageContext?.subject || detectSubjectFromTopic(t);
    setDetectedSubject(ds);
    const detectedClassId = detectClassFromTopic(t) || CLASSES.find(c => c.subject === ds)?.id || null;
    if (detectedClassId) { setSelectedClass(detectedClassId); }
    const classData = CLASSES.find(c => c.id === (detectedClassId || selectedClass));
    if (classData) setPrefs(p => ({ ...p, grade: classData.grade }));
    setCardLoading(true); setCurriculumCard(null);
    logStep(sessionId, 'page_context_selected', t, '', { topic: t, subjectDetected: ds, user_type: userType });
    setMaxScreenReached(prev => Math.max(prev, 2));
    setScreen(2); setInput('');
    try {
      const res = await fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: t }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCurriculumCard(data);
    } catch {
      setCurriculumCard({ unit: 'Unit 2, Lesson 5', title: t, subject: ds });
    } finally { setCardLoading(false); }
  }

  useEffect(() => {
    if (curriculumCard?.subject) setPrefs(p => ({ ...p, grade: inferGrade(curriculumCard.subject) }));
  }, [curriculumCard]);

  function handleQuizBriskIt() {
    const t = input.trim() || pageContext?.title || screenOneToolLabel || 'Topic';
    setTopic(t);
    setQuizGenTab('Overview');
    setQuizGenPhase('q1');
    setQuizGenQ1Sels([]);
    setQuizGenQ2('');
    setQuizGenAnswers([]);
    setQuizGenLoadingIdx(0);
    setQuizGenKey(k => k + 1);
    setSourcesViewed(false);
    setQuizGenExpandedSource(null);
    setQgQuizData(null);
    setQgFormsLoading(false);
    setQgUserReply('');
    setQgIterationHistory([]);
    setQgNeedsText('');
    setQgQ1OtherText('');
    setQgQ1OtherActive(false);
    setQgQ2OtherText('');
    setQgQ2OtherActive(false);
    setScreen('quiz-gen');
    setInput('');
  }

  async function handleTopicSubmit() {
    if (!input.trim()) return;
    const t = input.trim();
    setTopic(t);
    const classData = CLASSES.find(c => c.id === selectedClass);
    const ds = classData?.subject || detectSubjectFromTopic(t);
    setDetectedSubject(ds);
    if (classData) setPrefs(p => ({ ...p, grade: classData.grade }));
    setCardLoading(true);
    setCurriculumCard(null);
    logStep(sessionId, 'topic_submitted', t, '', { topic: t, subjectDetected: ds, user_type: userType });
    go(2, t, "Got it — looks like you're on this unit.");
    try {
      const res = await fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: t }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCurriculumCard(data);
    } catch {
      setCurriculumCard({ unit: 'Unit 2, Lesson 5', title: t, subject: ds });
    } finally {
      setCardLoading(false);
    }
  }

  async function handleHardestThingSubmit() {
    if (!input.trim() || cardLoading) return;
    const h = input.trim();
    setHardestThing(h);
    setNeeds2Loading(true);
    setNeeds2Data(null);
    const subj = detectedSubject || curriculumCard?.subject || 'this subject';
    go(3, h, `Are any students working below grade level on ${subj}?`);
    try {
      const res = await fetch('/api/question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, hardestThing: h }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNeeds2Data(data);
    } catch {
      setNeeds2Data({ question: 'Are students struggling more with understanding the concept or applying it?', options: ['Understanding the concept', 'Applying it', 'Both equally'] });
    } finally {
      setNeeds2Loading(false);
    }
  }

  function handleFluencySelect(opt) {
    setFluencyAnswer(opt);
    logStep(sessionId, 'needs_fluency', opt, '', { topic, subjectDetected: detectedSubject, user_type: userType });
    go(4, opt, '');
  }

  function handleNeeds2Select(opt) {
    setNeeds2Answer(opt);
    const s = pickStrategy(detectedSubject || curriculumCard?.subject || '', hardestThing, opt);
    setStrategy(s);
    logStep(sessionId, 'needs_struggle', opt, '', { topic, subjectDetected: detectedSubject, scaffoldStrategy: s?.name, user_type: userType });
    go(5, opt, "Checking your district's instructional strategies...");
  }

  function openEditPrefs() {
    if (scaffolds.length === 0 && strategy) setScaffolds([{ id: genUUID(), text: `${strategy.name} — ${strategy.desc}` }]);
    logStep(sessionId, 'edit-preferences', '', '', { user_type: userType });
    setScreen('7b');
  }

  async function handleSwapCurriculum() {
    setCardLoading(true);
    setCurriculumCard(null);
    try {
      const res = await fetch('/api/curriculum', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCurriculumCard(data);
    } catch {
      setCurriculumCard({ unit: 'Unit 2, Lesson 5', title: topic, subject: detectedSubject });
    } finally { setCardLoading(false); }
  }

  function openStrategyGuide() {
    const params = new URLSearchParams({ name: strat.name, topic, subject: subj, struggle: hardestThing });
    window.open(`/scaffold-guide?${params}`, '_blank');
  }

  function addScaffold() { setScaffolds(s => [...s, { id: genUUID(), text: '' }]); }
  function removeScaffold(id) { setScaffolds(s => s.filter(x => x.id !== id)); }
  function updateScaffold(id, text) { setScaffolds(s => s.map(x => x.id === id ? { ...x, text } : x)); }

  // Reset placeholder index when new suggestions arrive
  useEffect(() => {
    setPlaceholderIdx(0);
    setPlaceholderOpacity(1);
  }, [needsSuggestions]);

  // Cycle rotating placeholder every 3 seconds
  useEffect(() => {
    if (screen !== 2 || needsSuggestions.length === 0 || needsInputFocused || input) return;
    let swapTimeout;
    const cycle = setInterval(() => {
      setPlaceholderOpacity(0);
      swapTimeout = setTimeout(() => {
        setPlaceholderIdx(i => (i + 1) % needsSuggestions.length);
        setPlaceholderOpacity(1);
      }, 350);
    }, 3000);
    return () => { clearInterval(cycle); clearTimeout(swapTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, needsSuggestions, needsInputFocused, input]);

  // Reset scaffold placeholder index when new suggestions arrive
  useEffect(() => {
    setScaffoldPlaceholderIdx(0);
    setScaffoldPlaceholderOpacity(1);
  }, [scaffoldSuggestions]);

  // Cycle scaffold placeholder every 3 seconds on Screen 6
  useEffect(() => {
    if (screen !== 6 || scaffoldSuggestions.length === 0 || scaffoldInputFocused || input) return;
    let swapTimeout;
    const cycle = setInterval(() => {
      setScaffoldPlaceholderOpacity(0);
      swapTimeout = setTimeout(() => {
        setScaffoldPlaceholderIdx(i => (i + 1) % scaffoldSuggestions.length);
        setScaffoldPlaceholderOpacity(1);
      }, 350);
    }, 3000);
    return () => { clearInterval(cycle); clearTimeout(swapTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, scaffoldSuggestions, scaffoldInputFocused, input]);

  // Fetch scaffold suggestions when arriving on Screen 6
  useEffect(() => {
    if (screen !== 6 || !topic) return;
    setScaffoldSuggestions([]);
    const classData = CLASSES.find(c => c.id === selectedClass);
    fetch('/api/suggest-scaffolds', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, subject: detectedSubject || classData?.subject || '', grade: prefs.grade, strategy: strategy?.name || '', fluencyAnswer, struggleAnswer: needs2Answer }),
    })
      .then(r => r.json())
      .then(data => setScaffoldSuggestions(data.suggestions || []))
      .catch(() => setScaffoldSuggestions([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Fetch dynamic suggestion chips when arriving on Screen 2
  useEffect(() => {
    if (screen !== 2 || !topic) return;
    setNeedsSuggestionsLoading(true);
    setNeedsSuggestions([]);
    const classData = CLASSES.find(c => c.id === selectedClass);
    fetch('/api/suggest-needs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, subject: detectedSubject || classData?.subject || '', grade: prefs.grade }),
    })
      .then(r => r.json())
      .then(data => setNeedsSuggestions(data.suggestions || []))
      .catch(() => setNeedsSuggestions([]))
      .finally(() => setNeedsSuggestionsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Screen 5 → 6 auto-advance
  useEffect(() => {
    if (screen !== 5) return;
    const t = setTimeout(() => {
      const s = strategy || { name: 'Scaffolded Notes', desc: '' };
      logStep(sessionId, 'scaffold_shown', '', `${s.name}: ${s.desc}`, { topic, subjectDetected: detectedSubject, scaffoldStrategy: s.name, user_type: userType });
      go(6, '', `Your district has 3 core instructional strategies for ${subj}. ${s.name} is a strong fit.`);
    }, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Screen 8 → call Claude (appends to versions array)
  useEffect(() => {
    if (screen !== 8) return;
    setQuizLoading(true);
    setApiError('');
    const scaffoldTexts = scaffolds.map(s => s.text).filter(Boolean);
    fetch('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, subject: detectedSubject || curriculumCard?.subject, grade: prefs.grade, fluencyAnswer, struggleAnswer: needs2Answer, hardestThing, scaffoldStrategy: strategy?.name || '', scaffoldStrategyDesc: strategy?.desc || '', teacherScaffolds: scaffoldTexts, questionType: prefs.questionType, numQuestions: prefs.numQuestions, className: CLASSES.find(c => c.id === selectedClass)?.label || '', pageContextTitle: pageContext?.title || '', pageContextPreview: pageContext?.preview || '', pageContextBodyText: pageContext?.bodyText || '' }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        currentQuizRef.current = data;
        const subtitle = `${CLASSES.find(c => c.id === selectedClass)?.label || detectedSubject || curriculumCard?.subject || ''} • ${data.questions?.length || prefs.numQuestions} questions`;
        const newVersion = { id: genUUID(), quizData: data, subtitle };
        const newIdx = versions.length;
        setVersions(prev => [...prev, newVersion]);
        setActiveVersionIdx(newIdx);
        const iterN = newIdx + 1;
        logStep(sessionId, 'quiz_generated', '', data.title, { topic, subjectDetected: detectedSubject, scaffoldStrategy: strategy?.name, customScaffolds: scaffoldTexts.join('; '), iterationNumber: iterN, user_type: userType });
        setChatLog([
          { id: genUUID(), type: 'brisk', text: "Here's your quiz. Does anything need to change for your students?" },
          { id: genUUID(), type: 'version', versionIdx: newIdx },
        ]);
        setActiveTab('Overview');
        go(9, '', "Here's the latest quiz.");
      })
      .catch(err => {
        setApiError(err.message);
        go(9, '', 'Error generating quiz.');
      })
      .finally(() => setQuizLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function handleRefineSubmit() {
    if (!input.trim() || quizLoading) return;
    const feedback = input.trim();
    const latestQuiz = currentQuizRef.current;
    console.log('[handleRefineSubmit] currentQuizRef.current Q1:', latestQuiz?.questions?.[0]?.question?.slice(0, 60) ?? 'NULL');
    if (!latestQuiz) { console.error('[handleRefineSubmit] No quiz in ref — aborting'); return; }
    setInput('');
    retryFeedbackRef.current = feedback;
    retryQuizRef.current = latestQuiz;
    const updatingId = genUUID();
    setChatLog(prev => [
      ...prev,
      { id: genUUID(), type: 'teacher', text: feedback },
      { id: updatingId, type: 'brisk', text: "Got it — updating your quiz…", isUpdating: true },
    ]);
    doRefine(feedback, latestQuiz, updatingId);
  }

  async function doRefine(feedback, previousQuiz, updatingId) {
    setQuizLoading(true);
    // Reset bubble to loading state (handles retry)
    setChatLog(prev => prev.map(m => m.id === updatingId
      ? { ...m, text: "Got it — updating your quiz…", isUpdating: true, hasRetry: false }
      : m
    ));
    const scaffoldTexts = scaffolds.map(s => s.text).filter(Boolean);
    const className = CLASSES.find(c => c.id === selectedClass)?.label || '';
    try {
      const res = await fetch('/api/refine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: feedback, previousQuiz, topic,
          subject: detectedSubject || curriculumCard?.subject,
          grade: prefs.grade, fluencyAnswer,
          struggleAnswer: needs2Answer, hardestThing,
          scaffoldStrategy: strategy?.name || '',
          scaffolds: scaffoldTexts,
          questionType: prefs.questionType, numQuestions: prefs.numQuestions,
          className, pageContextTitle: pageContext?.title || '',
          pageContextPreview: pageContext?.preview || '',
          pageContextBodyText: pageContext?.bodyText || '',
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      currentQuizRef.current = data;
      console.log('[doRefine] V_new title:', data.title, '| questions:', data.questions?.length);
      console.log('[doRefine] V_prev Q1:', previousQuiz?.questions?.[0]?.question?.slice(0, 60));
      console.log('[doRefine] V_new Q1:', data.questions?.[0]?.question?.slice(0, 60));
      console.log('[doRefine] V_new Q1 hint:', data.questions?.[0]?.hint || '(no hint field)');
      const identical = JSON.stringify(data) === JSON.stringify(previousQuiz);
      if (identical) console.warn('[doRefine] WARNING: V_new is identical to V_prev!');
      const subtitle = `${detectedSubject || curriculumCard?.subject || 'ELA'} • ${data.questions?.length || prefs.numQuestions} questions`;
      const newIdx = versions.length;
      setVersions(prev => [...prev, { id: genUUID(), quizData: data, subtitle }]);
      setActiveVersionIdx(newIdx);
      setChatLog(prev => [
        ...prev.map(m => m.id === updatingId ? { ...m, isUpdating: false, hasRetry: false } : m),
        { id: genUUID(), type: 'version', versionIdx: newIdx },
      ]);
      const n = versions.length + 1;
      logStep(sessionId, `iteration_${n}`, feedback, data.title, { topic, subjectDetected: detectedSubject, scaffoldStrategy: strategy?.name, customScaffolds: scaffoldTexts.join('; '), adjustmentRequest: feedback, iterationNumber: n, user_type: userType });
    } catch {
      setChatLog(prev => prev.map(m => m.id === updatingId
        ? { ...m, isUpdating: false, text: "Something went wrong — try again?", hasRetry: true }
        : m
      ));
    } finally { setQuizLoading(false); }
  }

  // ── Derived values ────────────────────────────────────────────
  const subj = detectedSubject || curriculumCard?.subject || 'this subject';
  const unit = curriculumCard?.unit || '';
  const cardTitle = curriculumCard?.title || topic;
  const strat = strategy || { name: 'Scaffolded Notes', desc: 'breaks complex content into structured steps students can follow' };
  const shortTopic = topic.split(' ').slice(0, 4).join(' ');
  const activeQuiz = versions[activeVersionIdx]?.quizData || null;
  const quizTitle = activeQuiz?.title || `${shortTopic} Quiz`;
  const strugglePhrase = needs2Answer && needs2Answer !== 'skipped' ? needs2Answer.toLowerCase() : hardestThing || 'student struggle';
  const activeScaffolds = scaffolds.filter(s => s.text.trim());
  const firstScaffoldName = activeScaffolds.length > 0 ? activeScaffolds[0].text.split(' — ')[0].substring(0, 28) : strat.name;
  const scaffoldLabel = `${firstScaffoldName} + ${Math.max(0, activeScaffolds.length - 1)} more`;
  const quizSubtitleS7 = `${subj} • ${prefs.numQuestions} questions`;
  const isNumericScreen = typeof screen === 'number';
  const quizExists = versions.length > 0;

  // Visited stages for breadcrumb (based on max screen ever reached, not current)
  const visitedSteps = (() => {
    const visited = [];
    if (maxScreenReached >= 3) visited.push('Topic');
    if (maxScreenReached >= 5) visited.push('Needs');
    if (maxScreenReached >= 7) visited.push('Scaffolds');
    if (versions.length > 0) visited.push('Create'); // always clickable once quiz exists
    return visited;
  })();

  // ── Drag handler ─────────────────────────────────────────────
  function handlePanelMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, select, textarea, a')) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientY - rect.top > 52) return; // header area only
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = rect.left, startTop = rect.top;
    function onMove(ev) {
      const w = panelRef.current?.offsetWidth || 402;
      const h = panelRef.current?.offsetHeight || 620;
      setPanelPos({
        left: Math.max(8, Math.min(window.innerWidth - w - 8, startLeft + ev.clientX - startX)),
        top: Math.max(8, Math.min(window.innerHeight - h - 8, startTop + ev.clientY - startY)),
      });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // ── Prompt mode detection (uses debounced value — no shape/mode change mid-keystroke) ──
  const _wsq = debouncedWelcomeSearch.trim();
  const _wsWords = _wsq ? _wsq.split(/\s+/).filter(Boolean) : [];
  const WS_MATCH_LABELS = [
    'Create', 'Give Feedback', 'Inspect Writing', 'Change Level', 'Boost Activity', 'Get Teaching Ideas', 'Ask Brisk Anything',
    'Make a presentation, quiz, etc.', 'Comment on student work', 'Analyze structure and clarity',
    'Adjust reading complexity', 'Add engagement to a task', 'Lesson hooks and strategies', 'Open-ended question',
    'Summer of Mariposa Quiz Pt. 1', 'Summer of Mariposa Quiz Pt. 2', 'Point of View Quiz',
  ];
  const wsIsPromptMode = _wsq.length > 0 && (_wsWords.length >= 4 || !WS_MATCH_LABELS.some(s => fuzzyMatch(_wsq, s)));

  const _csq = debouncedCreateSearch.trim();
  const _csWords = _csq ? _csq.split(/\s+/).filter(Boolean) : [];
  const CS_MATCH_LABELS = CREATE_TOOL_SECTIONS.flatMap(s => s.tools.flatMap(t => [t.label, ...(t.sub ? [t.sub] : [])]));
  const csIsPromptMode = _csq.length > 0 && (_csWords.length >= 4 || !CS_MATCH_LABELS.some(s => fuzzyMatch(_csq, s)));

  function handleCreatePromptSend() {
    const p = createSearch.trim();
    if (!p) return;
    setCreateSearch('');
    const detected = detectToolAndTopic(p);
    if (detected) {
      setScreenOneToolType(detected.type);
      setScreenOneToolLabel(detected.label);
      setInput(p);
      setScreen(1);
    } else {
      const toolName = classifyPrompt(p);
      setChatToolName(toolName);
      setChatInitialPrompt(p);
      setChatAnswers([]);
      setChatCurrentQ(0);
      setChatInput('');
      setChatOpenTextVal('');
      setScreen('chat');
    }
  }

  // ── Styles ────────────────────────────────────────────────────
  const outerStyle = { minHeight: '100vh' };

  // sourcesReady: true once API has returned data (resource panel shows skeleton until then)
  const sourcesReady = !!qgQuizData;
  const isDockedRight = screen === 'quiz-gen' && quizGenPhase === 'done' && sourcesReady;
  const panelStyle = {
    background: '#FAF9F6',
    borderRadius: 12,
    border: '1px solid #E5E4E2',
    boxShadow: '0 24px 64px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', position: 'fixed', zIndex: 10,
    ...(panelPos
      ? { width: 402, top: panelPos.top, left: panelPos.left, height: 'min(624px, calc(100vh - 80px))' }
      : isDockedRight
        ? { width: 402, top: 24, right: 24, height: 'min(624px, calc(100vh - 48px))' }
        : { width: 'min(402px, calc(100vw - 48px))', top: 40, left: 'max(24px, calc(50vw - 201px))', height: 'min(624px, calc(100vh - 80px))' }
    ),
  };

  // ── Panel content ────────────────────────────────────────────
  const panelContent = (
    <div ref={panelRef} style={panelStyle} onMouseDown={handlePanelMouseDown}>
      {/* Progress bar only on screen 8 */}
      {screen === 8 && <ProgressBar />}

      {/* Header — screens 1, 3, 4, 9 render their own headers */}
      {isNumericScreen && screen !== 0 && screen !== 1 && screen !== 3 && screen !== 4 && screen !== 9
        ? (quizExists ? <HeaderFlat onClose={handleClose} selectedClass={selectedClass} classBtnRef={classBtnRef} onClassClick={() => { const r = classBtnRef.current?.getBoundingClientRect(); if (r) setClassPickerPos({ top: r.bottom + 4, left: r.left }); setClassPickerOpen(v => !v); }} /> : <Header onClose={handleClose} selectedClass={selectedClass} classBtnRef={classBtnRef} onClassClick={() => { const r = classBtnRef.current?.getBoundingClientRect(); if (r) setClassPickerPos({ top: r.bottom + 4, left: r.left }); setClassPickerOpen(v => !v); }} />)
        : !isNumericScreen
          ? (screen === '7b'
            ? <PrefsHeader title="Quiz Settings" subtitle={`Quiz: ${topic}`} onBack={() => go(7)} onClose={handleClose} />
            : screen === '7c'
              ? <PrefsHeader title="Scaffolds" onBack={() => setScreen('7b')} onClose={handleClose} />
              : null)
          : null}

      {/* ── WELCOME / MAIN MENU (Screen 2) ── */}
      {screen === 'welcome' && (
        <>
          {/* Fixed header */}
          <Header onClose={handleClose} selectedClass={selectedClass} classBtnRef={classBtnRef} onClassClick={() => { const r = classBtnRef.current?.getBoundingClientRect(); if (r) setClassPickerPos({ top: r.bottom + 4, left: r.left }); setClassPickerOpen(v => !v); }} />

          {/* Fixed title */}
          <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0, background: '#FAF9F6' }}>
            <BriskLogo size={30} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.slate900, letterSpacing: '-0.02em', lineHeight: '24px' }}>What do you need today?</div>
          </div>

          {/* Fixed prompt box */}
          <div style={{ flexShrink: 0, background: '#FAF9F6', padding: '4px 24px 8px', position: 'relative' }}>
            <div className="search-container" style={{ border: '1px solid #E5E4E2', borderRadius: (pageChipVisible && !chipDismissing) ? 12 : 100, background: '#FFFFFF', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {(pageChipVisible || chipDismissing) && (
                <div className={chipDismissing ? 'chip-exit' : 'chip-enter'} style={{ padding: '8px 10px 2px', overflow: 'hidden' }}>
                  <div className="page-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #E5E4E2', borderRadius: 6, padding: '5px 8px 5px 6px', minWidth: 0 }}>
                    <img src="/icons/Web - Stroke.svg" width={14} height={14} alt="" style={{ display: 'block', flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ flex: 1, fontSize: 12, color: '#475467', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>
                      {pageContext?.title || 'Jennifer Wong - Point of View in Summer of M...'}
                    </span>
                    <button onClick={dismissChip} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#475467" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: (pageChipVisible && !chipDismissing) ? '6px 8px 10px' : '6px 8px' }}>
                <button ref={addBtnRef} className="icon-btn"
                  onClick={() => {
                    const r = addBtnRef.current?.getBoundingClientRect();
                    if (r) setAddMenuPos({ top: r.bottom + 6, left: r.left });
                    setAddMenuOpen(v => !v);
                  }}
                  style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0, alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center' }}>
                  <img src="/icons/Add.svg" width={20} height={20} alt="Add" style={{ display: 'block' }} />
                </button>
                <textarea
                  ref={welcomeTextareaRef}
                  value={welcomeSearch}
                  onChange={e => {
                    setWelcomeSearch(e.target.value);
                    const el = welcomeTextareaRef.current;
                    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
                  }}
                  placeholder="Search or type what you need"
                  rows={1}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 400, color: '#0E151C', background: 'transparent', fontFamily: 'inherit', lineHeight: '22px', resize: 'none', overflowY: 'hidden', minHeight: 22 }}
                />
                <MicButton size={20} className="icon-btn" btnStyle={{ alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center' }}
                  onTranscript={(t) => { setWelcomeSearch(t); const el = welcomeTextareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; } }} />
                {wsIsPromptMode && welcomeSearch.trim() && (
                  <button onClick={handlePromptSend} style={{ width: 32, height: 32, borderRadius: '50%', background: '#06465C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center', marginLeft: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tool rows — only this scrolls */}
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', background: '#FAF9F6', paddingBottom: 4 }}>
            {(() => {
              const q = debouncedWelcomeSearch.trim();
              const topTools = [
                { svg: '/icons/Create.svg',        label: 'Create',             sub: 'Make a presentation, quiz, etc.', onClick: () => setScreen('create') },
                { svg: '/icons/Give Feedback.svg', label: 'Give Feedback',      sub: 'Comment on student work',         onClick: null },
                { svg: '/icons/Inspect.svg',       label: 'Inspect Writing',    sub: 'Analyze structure and clarity',   onClick: null },
                { svg: '/icons/Change Level.svg',  label: 'Change Level',       sub: 'Adjust reading complexity',       onClick: null },
                { svg: '/icons/Boost.svg',         label: 'Boost Activity',     sub: 'Add engagement to a task',        onClick: null },
                { svg: '/icons/Ideas.svg',         label: 'Get Teaching Ideas', sub: 'Lesson hooks and strategies',     onClick: null },
                { svg: '/icons/Ask Brisk.svg',     label: 'Ask Brisk Anything', sub: 'Open-ended question',             onClick: () => { setChatToolName('Ask Anything'); setChatInitialPrompt(''); setChatAnswers([]); setChatCurrentQ(0); setChatInput(''); setChatOpenTextVal(''); setScreen('chat'); } },
              ];
              const allToolRows = topTools.map(item => (
                <ToolRow key={item.label} svg={item.svg} label={item.label} sub={item.sub} onClick={item.onClick} />
              ));

              if (!q) return <>{allToolRows}<div style={{ height: 4 }} /></>;

              // PROMPT MODE — only show a suggested tool if there's a confident keyword match
              if (wsIsPromptMode) {
                const TOOL_KW = /\b(feedback|comment|review|grade|quiz|test|question|inspect|analy|level|simplif|complex|boost|engag|idea|lesson|strateg|create|make|build|presentation|slide|podcast)\b/i;
                const kwMatch = TOOL_KW.exec(q);
                let suggestedTool = null;
                if (kwMatch) {
                  const kw = kwMatch[1].toLowerCase();
                  if (/feedback|comment|review|grade/.test(kw)) suggestedTool = topTools[1];
                  else if (/quiz|test|question|create|make|build|presentation|slide|podcast/.test(kw)) suggestedTool = topTools[0];
                  else if (/inspect|analy/.test(kw)) suggestedTool = topTools[2];
                  else if (/level|simplif|complex/.test(kw)) suggestedTool = topTools[3];
                  else if (/boost|engag/.test(kw)) suggestedTool = topTools[4];
                  else if (/idea|lesson|strateg/.test(kw)) suggestedTool = topTools[5];
                }
                if (suggestedTool) return (
                  <>
                    <div style={{ padding: '10px 16px 4px', fontSize: 12, fontWeight: 500, color: '#475467', lineHeight: '18px' }}>Suggested</div>
                    <ToolRow svg={suggestedTool.svg} label={suggestedTool.label} sub={suggestedTool.sub} onClick={suggestedTool.onClick} />
                    <div style={{ height: 4 }} />
                  </>
                );
                // No tool keyword — fall through to search mode to show library/reco results
              }

              // SEARCH MODE
              const TOOL_KW_RE = /\b(feedback|comment|review|grade|quiz|test|question|inspect|analy|level|simplif|complex|boost|engag|idea|lesson|strateg|create|make|build|presentation|slide|podcast)\b/gi;
              const FILLER_RE  = /\b(give|get|make|do|use|add|set|the|a|an|for|on|in|of|to|my|i|want|need|some|this|that|with|and|or)\b/gi;
              const rawTopicPart = q.replace(TOOL_KW_RE, '').replace(/\s+/g, ' ').trim();
              const topicPart = rawTopicPart.replace(FILLER_RE, '').replace(/\s+/g, ' ').trim();
              const hasTopicComponent = topicPart.length > 2;
              const searchTerm = hasTopicComponent ? topicPart : q;

              const isFeedbackQuery = /\b(feedback|comment|review|grade|annotate|assess)\b/i.test(q);

              // Current class subject — use class, then query, then page context title as fallback
              const _detectCtx = !selectedClass ? detectSubjectFromTopic((pageContext?.title || '') + ' ' + searchTerm) : null;
              const rawSubject = (CLASSES.find(c => c.id === selectedClass)?.subject || _detectCtx || '').toLowerCase();
              const subjectIsELA     = /ela|english|reading|writing|language/.test(rawSubject);
              const subjectIsMath    = /math/.test(rawSubject);
              const subjectIsHistory = /social studies|history/.test(rawSubject);
              const subjectIsScience = /science|biology|chemistry|physics/.test(rawSubject);

              // Also surface individual create tools (Quiz, Presentation, etc.) when searched directly
              const flatCreateTools = CREATE_TOOL_SECTIONS.flatMap(s => s.tools).map(t => ({
                svg: t.svg, label: t.label, sub: t.sub,
                onClick: t.onClick === 'quiz'
                  ? () => { setScreenOneToolType('quiz'); setScreenOneToolLabel('Quiz'); setScreen(1); setInput(''); }
                  : (t.onClick === 'doc' || t.onClick === null) && t.label !== 'Boost Student Activity'
                    ? () => { setScreenOneToolType('doc'); setScreenOneToolLabel(t.label); setScreen(1); setInput(''); }
                    : () => setScreen('create'),
              }));
              const allSearchableTools = [
                ...topTools,
                ...flatCreateTools.filter(ct => !topTools.some(tt => tt.label === ct.label)),
              ];
              const matchedTop = topMatches(q, allSearchableTools, t => t.label, 3);
              // Also try matching tools on extracted topic (e.g. "create a syllabus" → topicPart="syllabus" → Syllabus tool)
              const matchedTopTopic = (hasTopicComponent && topicPart !== q)
                ? topMatches(topicPart, allSearchableTools, t => t.label, 3).filter(t => !matchedTop.some(m => m.label === t.label))
                : [];
              const allMatchedTools = [...matchedTop, ...matchedTopTopic];

              // Library data — subject field gates visibility per class
              const MY_LIBRARY_DATA = [
                { label: 'Summer of Mariposas Quiz Pt. 1',   sub: 'Modified 2 days ago',   icon: '/icons/Forms.svg', subject: 'ela',     tags: 'mariposas mariposa summer reading novel' },
                { label: 'Summer of Mariposas Quiz Pt. 2',   sub: 'Modified 5 days ago',   icon: '/icons/Forms.svg', subject: 'ela',     tags: 'mariposas mariposa summer reading novel' },
                { label: 'Point of View Quiz',               sub: 'Modified 3 weeks ago',  icon: '/icons/Forms.svg', subject: 'ela',     tags: 'point view pov reading author perspective' },
                { label: 'Character Analysis Graphic Org.',  sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'ela',     tags: 'character analysis novel reading gatsby mariposas' },
                { label: 'Reading Response Journal',         sub: 'Modified 3 weeks ago',  icon: '/icons/Docs.svg',  subject: 'ela',     tags: 'reading response journal novel text' },
                { label: 'Ratios and Proportions Quiz',      sub: 'Modified 1 week ago',   icon: '/icons/Forms.svg', subject: 'math',    tags: 'ratio ratios proportion proportions' },
                { label: 'Fractions Review',                 sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'math',    tags: 'fraction fractions numbers divide' },
                { label: 'Anchor Chart — Math Vocabulary',  sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'math',    tags: 'math vocabulary anchor chart' },
                { label: 'Cause & Effect Notes',             sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'history', tags: 'cause effect history event war revolution washington colonial' },
                { label: 'Primary Source Analysis Sheet',   sub: 'Modified 1 month ago',  icon: '/icons/PDF.svg',   subject: 'history', tags: 'primary source document analysis history washington colonial revolution' },
                { label: 'Timeline Activity',               sub: 'Modified 3 weeks ago',  icon: '/icons/Docs.svg',  subject: 'history', tags: 'timeline history events sequence war revolution washington' },
                { label: 'Lab Report Template',             sub: 'Modified 2 weeks ago',  icon: '/icons/Docs.svg',  subject: 'science', tags: 'lab report science experiment data' },
                { label: 'Vocabulary Graphic Organizer',    sub: 'Modified 1 month ago',  icon: '/icons/Docs.svg',  subject: 'science', tags: 'science vocabulary terms definitions' },
              ];
              const DISTRICT_LIBRARY_DATA = [
                { label: 'Summer of Mariposas Close Reading Ch.1', sub: 'District · ELA Dept',          icon: '/icons/PDF.svg',   subject: 'ela',     tags: 'mariposas mariposa summer reading novel close' },
                { label: 'Summer of Mariposas Close Reading Ch.2', sub: 'District · ELA Dept',          icon: '/icons/PDF.svg',   subject: 'ela',     tags: 'mariposas mariposa summer reading novel close' },
                { label: 'Figurative Language Quiz',               sub: 'District · ELA Dept',          icon: '/icons/Forms.svg', subject: 'ela',     tags: 'figurative language metaphor simile' },
                { label: 'Text Evidence Practice',                 sub: 'District · ELA Dept',          icon: '/icons/Docs.svg',  subject: 'ela',     tags: 'text evidence cite citing gatsby mariposas novel' },
                { label: 'Literary Analysis Rubric',               sub: 'District · ELA Dept',          icon: '/icons/Docs.svg',  subject: 'ela',     tags: 'literary analysis essay rubric novel reading' },
                { label: 'Ratios Grade 7 Assessment',              sub: 'District · Math Dept',         icon: '/icons/Forms.svg', subject: 'math',    tags: 'ratio ratios proportion' },
                { label: 'Number Sense Practice',                  sub: 'District · Math Dept',         icon: '/icons/Docs.svg',  subject: 'math',    tags: 'number sense arithmetic operations' },
                { label: 'Fractions Unit Assessment',              sub: 'District · Math Dept',         icon: '/icons/Forms.svg', subject: 'math',    tags: 'fraction fractions unit assessment' },
                { label: 'US History Standards Alignment',         sub: 'District · Social Studies Dept', icon: '/icons/PDF.svg', subject: 'history', tags: 'history standards washington colonial revolution war civil rights' },
                { label: 'DBQ: Primary Source Analysis Guide',     sub: 'District · Social Studies Dept', icon: '/icons/Docs.svg', subject: 'history', tags: 'primary source dbq document history washington revolution war colonial' },
                { label: 'Social Studies Vocabulary Bank',         sub: 'District · Social Studies Dept', icon: '/icons/Docs.svg', subject: 'history', tags: 'vocabulary history social studies terms washington colonial revolution' },
                { label: 'Science Lab Safety & Procedures',        sub: 'District · Science Dept',      icon: '/icons/PDF.svg',   subject: 'science', tags: 'science lab safety procedures experiment' },
                { label: 'NGSS Standards Alignment Guide',         sub: 'District · Science Dept',      icon: '/icons/Docs.svg',  subject: 'science', tags: 'science standards ngss biology chemistry physics' },
              ];

              // Detect subject even when no class selected (for pure topic queries)
              const topicSubjectDetect = !selectedClass ? detectSubjectFromTopic(searchTerm) : null;
              const effectiveSubjectIsELA     = subjectIsELA     || topicSubjectDetect === 'ELA';
              const effectiveSubjectIsMath    = subjectIsMath    || topicSubjectDetect === 'Math';
              const effectiveSubjectIsHistory = subjectIsHistory || topicSubjectDetect === 'Social Studies' || /\b(washington|lincoln|colonial|revolution|civil war|world war|constitution|amendment|president|congress|senate|slavery|civil rights|gatsby|steinbeck|history)\b/i.test(searchTerm);
              const effectiveSubjectIsScience = subjectIsScience || topicSubjectDetect === 'Science';
              const effectiveSubjectIsELAFull = effectiveSubjectIsELA || /\b(mariposa|gatsby|mockingbird|romeo|juliet|hamlet|novel|poem|poetry|author|character|theme|plot|setting|narrative|figurative|metaphor|simile|reading|writing|essay)\b/i.test(searchTerm);

              // Filter by effective subject
              const subjectFilter = item => {
                if (effectiveSubjectIsELAFull && item.subject === 'ela')     return true;
                if (effectiveSubjectIsMath    && item.subject === 'math')    return true;
                if (effectiveSubjectIsHistory && item.subject === 'history') return true;
                if (effectiveSubjectIsScience && item.subject === 'science') return true;
                return false;
              };

              const recoGrade = CLASSES.find(c => c.id === selectedClass)?.grade || prefs.grade || '8th';
              const subjectDept = effectiveSubjectIsELAFull ? 'ELA' : effectiveSubjectIsMath ? 'Math' : effectiveSubjectIsHistory ? 'Social Studies' : effectiveSubjectIsScience ? 'Science' : null;

              // Tool match takes priority — if a tool was found (by full query or topic part), suppress library
              const isPureToolQuery = allMatchedTools.length > 0 || isFeedbackQuery;

              // For topic queries with no hardcoded subject match, show generic subject-appropriate items
              const noSubjectMatch = !effectiveSubjectIsELAFull && !effectiveSubjectIsMath && !effectiveSubjectIsHistory && !effectiveSubjectIsScience;
              const GENERIC_MY = hasTopicComponent && !isPureToolQuery && noSubjectMatch ? [
                { label: 'Graphic Organizer — Notes',  sub: 'Modified 2 weeks ago', icon: '/icons/Docs.svg' },
                { label: 'Guided Reading Questions',   sub: 'Modified 1 month ago', icon: '/icons/Docs.svg' },
              ] : [];
              const GENERIC_DIST = hasTopicComponent && !isPureToolQuery && noSubjectMatch ? [
                { label: 'Standards-Aligned Unit Guide', sub: 'District · Curriculum Dept', icon: '/icons/PDF.svg' },
                { label: 'Vocabulary & Key Terms Bank',  sub: 'District · Curriculum Dept', icon: '/icons/Docs.svg' },
              ] : [];

              const hardcodedMy   = isPureToolQuery ? [] : semanticLibResults.my;
              const hardcodedDist = isPureToolQuery ? [] : semanticLibResults.district;
              const myLibrary    = hardcodedMy.length > 0 ? hardcodedMy    : GENERIC_MY;
              const districtLibrary = hardcodedDist.length > 0 ? hardcodedDist : GENERIC_DIST;

              // Assignments to grade — shown when query is feedback/grading related
              const assignmentSubject = subjectIsHistory ? 'Social Studies' : subjectIsMath ? 'Math' : subjectIsScience ? 'Science' : subjectIsELA ? 'ELA' : null;
              const ASSIGNMENT_TEMPLATES = {
                'Social Studies': [
                  { label: 'Cause & Effect Essay', sub: '24 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Primary Sources Analysis', sub: '18 submissions pending', icon: '/icons/PDF.svg' },
                  { label: 'Document-Based Question (DBQ)', sub: '21 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Timeline Activity', sub: '15 submissions pending', icon: '/icons/Docs.svg' },
                ],
                'Math': [
                  { label: 'Problem Set — Unit Review', sub: '28 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Word Problems Assignment', sub: '22 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Chapter Test', sub: '30 submissions pending', icon: '/icons/Forms.svg' },
                ],
                'ELA': [
                  { label: 'Literary Analysis Essay', sub: '19 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Reading Response Journal', sub: '25 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Annotation Assignment', sub: '23 submissions pending', icon: '/icons/PDF.svg' },
                ],
                'Science': [
                  { label: 'Lab Report', sub: '17 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Research Project', sub: '20 submissions pending', icon: '/icons/Docs.svg' },
                  { label: 'Observation Journal', sub: '26 submissions pending', icon: '/icons/Docs.svg' },
                ],
              };
              const assignmentsToGrade = isFeedbackQuery
                ? (ASSIGNMENT_TEMPLATES[assignmentSubject] || [
                    { label: 'Pending Assignment', sub: '20 submissions pending', icon: '/icons/Docs.svg' },
                    { label: 'Recent Classwork', sub: '14 submissions pending', icon: '/icons/Docs.svg' },
                  ])
                : [];

              // Recommendations — only when topic looks complete (all words ≥ 3 chars, total ≥ 6)
              const recoTopic = hasTopicComponent ? topicPart : q;
              const recoWords = recoTopic.trim().split(/\s+/);
              const recoTopicComplete = recoTopic.trim().length >= 6 && recoWords.every(w => w.length >= 3);
              const recommendations = (!isPureToolQuery && recoTopicComplete && (hasTopicComponent || !/\b(feedback|comment|review|grade|quiz|test|question|inspect|analy|level|simplif|complex|boost|engag|idea|lesson|strateg|create|make|build|presentation|slide|podcast)\b/i.test(q)))
                ? recoItems(recoTopic, recoGrade, {
                    quiz:   () => { setScreenOneToolType('quiz'); setScreenOneToolLabel('Quiz'); setInput(recoTopic); setScreen(1); },
                    slides: () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Presentation'); setInput(recoTopic); setScreen(1); },
                    doc:    () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Guided Notes'); setInput(recoTopic); setScreen(1); },
                    lesson: () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Lesson Plan'); setInput(recoTopic); setScreen(1); },
                  })
                : [];

              const LibraryRow = ({ item }) => (
                <div style={{ padding: '0 8px' }}>
                  <button className="tool-row lib-row" style={{ width: '100%', padding: '8px 10px', border: 'none', borderRadius: 10, background: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <img src={item.icon} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0, borderRadius: 7 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                      <div className="lib-sub">{item.sub}</div>
                    </div>
                  </button>
                </div>
              );

              const RecoRow = ({ item }) => (
                <div style={{ padding: '0 8px' }}>
                  <button className="tool-row lib-row" onClick={item.onClick || undefined} style={{ width: '100%', padding: '8px 10px', border: 'none', borderRadius: 10, background: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: item.onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}>
                    <img src={item.svg} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div className="lib-sub">{item.tooltip}</div>
                    </div>
                  </button>
                </div>
              );

              const secLabel = (txt, first = false) => (
                <div style={{ padding: `${first ? 10 : 16}px 16px 4px`, fontSize: 12, fontWeight: 500, color: '#475467', lineHeight: '18px' }}>{txt}</div>
              );

              // Chained query (tool + topic): e.g. "manifest destiny quiz" → show a direct prompt shortcut
              const chainedTopic = allMatchedTools.length > 0 && hasTopicComponent && topicPart.trim().length > 2 ? topicPart.trim() : null;
              const chainedTool  = chainedTopic ? allMatchedTools[0] : null;
              const chainedPromptBtn = chainedTool ? (() => {
                const isQuizType = /quiz|test|exit|formative|check/i.test(chainedTool.label);
                const toolType   = isQuizType ? 'quiz' : 'doc';
                const displayTopic = chainedTopic.charAt(0).toUpperCase() + chainedTopic.slice(1);
                return (
                  <div style={{ padding: '6px 12px 2px' }}>
                    <button
                      onClick={() => { setScreenOneToolType(toolType); setScreenOneToolLabel(chainedTool.label); setInput(q); setScreen(1); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid #D0E8F0', borderRadius: 10, background: '#F0F8FB', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <img src={chainedTool.svg} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: '#0E151C', fontWeight: 500, lineHeight: '20px' }}>Create: {displayTopic} {chainedTool.label}</div>
                        <div style={{ fontSize: 12, color: '#475467', lineHeight: '17px', marginTop: 1 }}>Jump straight in — topic pre-loaded</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#06465C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                );
              })() : null;

              const hasAny = chainedPromptBtn || allMatchedTools.length > 0 || myLibrary.length > 0 || districtLibrary.length > 0 || assignmentsToGrade.length > 0 || recommendations.length > 0;
              if (!hasAny) return <>{allToolRows}<div style={{ height: 4 }} /></>;
              return (
                <>
                  {(() => {
                    let isFirst = true;
                    const sec = txt => { const el = secLabel(txt, isFirst); isFirst = false; return el; };
                    return (
                      <>
                        {chainedPromptBtn}
                        {allMatchedTools.length > 0 && <>{sec('Tools')}{allMatchedTools.map(t => <ToolRow key={t.label} svg={t.svg} label={t.label} sub={t.sub} onClick={t.onClick} />)}</>}
                        {assignmentsToGrade.length > 0 && <>{sec('Assignments to Grade')}{assignmentsToGrade.map(a => <LibraryRow key={a.label} item={a} />)}</>}
                        {myLibrary.length > 0 && <>{sec('My Library')}{myLibrary.map(l => <LibraryRow key={l.label} item={l} />)}</>}
                        {districtLibrary.length > 0 && <>{sec('District Library')}{districtLibrary.map(l => <LibraryRow key={l.label} item={l} />)}</>}
                        {recommendations.length > 0 && <>{sec('Recommendations')}{recommendations.map(r => <RecoRow key={r.title} item={r} />)}</>}
                      </>
                    );
                  })()}
                  <div style={{ height: 4 }} />
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* ── CREATE TOOLS SUBMENU ── */}
      {screen === 'create' && (() => {
        return (
        <>
          {/* Header — collapses on scroll */}
          <div style={{ background: '#FAF9F6', borderRadius: '12px 12px 0 0', borderBottom: createScroll > 40 ? 'none' : `1px solid ${C.slate200}`, flexShrink: 0, overflow: 'hidden', maxHeight: createScroll > 40 ? 0 : 60, transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), border 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', gap: 6, height: 52 }}>
              <ModalBackBtn onClick={() => { setScreen('welcome'); setCreateScroll(0); }} />
              <button ref={classBtnRef} onClick={() => { const r = classBtnRef.current?.getBoundingClientRect(); if (r) setClassPickerPos({ top: r.bottom + 4, left: r.left }); setClassPickerOpen(v => !v); }} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 6px' }}>
                <span style={{ fontSize: 12, color: '#475467', fontWeight: 500, letterSpacing: '-0.01em' }}>{selectedClass ? CLASSES.find(c => c.id === selectedClass)?.label : 'Select Class'}</span>
                <svg width="10" height="14" viewBox="0 0 10 14" fill="none"><path d="M2 5.5L5 2.5L8 5.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 8.5L5 11.5L8 8.5" stroke={C.slate500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src="/icons/Help.svg" width={20} height={20} alt="Help" style={{ display: 'block', cursor: 'pointer' }} />
                <img src="/icons/Home.svg" width={16} height={16} alt="Home" style={{ display: 'block', cursor: 'pointer' }} />
                <ModalMenuBtn />
                <ModalCloseBtn onClick={handleClose} />
              </div>
            </div>
          </div>

          {/* Collapsing heading — same position as Welcome */}
          <div style={{ overflow: 'hidden', maxHeight: createScroll > 40 ? 0 : 80, opacity: createScroll > 40 ? 0 : 1, padding: createScroll > 40 ? '0 14px' : '20px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexShrink: 0, background: '#FAF9F6', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, padding 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
            <img src="/icons/Create.svg" width={28} height={28} alt="" style={{ flexShrink: 0, display: 'block' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.slate900, letterSpacing: '-0.02em', lineHeight: '24px' }}>What do you want to create?</div>
          </div>

          {/* Fixed search box — same padding as Welcome */}
          <div style={{ flexShrink: 0, background: '#FAF9F6', padding: `${createScroll > 40 ? 12 : 4}px ${createScroll > 40 ? 12 : 24}px 8px`, position: 'relative', transition: 'padding 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
            <div className="search-container" style={{ border: '1px solid #E5E4E2', borderRadius: (pageChipVisible && !chipDismissing) ? 12 : 100, background: '#FFFFFF', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {(pageChipVisible || chipDismissing) && (
                <div className={chipDismissing ? 'chip-exit' : 'chip-enter'} style={{ padding: '8px 10px 2px', overflow: 'hidden' }}>
                  <div className="page-chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '1px solid #E5E4E2', borderRadius: 6, padding: '5px 8px 5px 6px', minWidth: 0 }}>
                    <img src="/icons/Web - Stroke.svg" width={14} height={14} alt="" style={{ display: 'block', flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ flex: 1, fontSize: 12, color: '#475467', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>
                      {pageContext?.title || 'Jennifer Wong - Point of View in Summer of M...'}
                    </span>
                    <button onClick={dismissChip} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', lineHeight: 1, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#475467" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: (pageChipVisible && !chipDismissing) ? '6px 8px 10px' : '6px 8px' }}>
                <button ref={addBtnRef} className="icon-btn"
                  onClick={() => {
                    const r = addBtnRef.current?.getBoundingClientRect();
                    if (r) setAddMenuPos({ top: r.bottom + 6, left: r.left });
                    setAddMenuOpen(v => !v);
                  }}
                  style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0, alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center' }}>
                  <img src="/icons/Add.svg" width={20} height={20} alt="Add" style={{ display: 'block' }} />
                </button>
                <textarea ref={createTextareaRef} value={createSearch}
                  onChange={e => { setCreateSearch(e.target.value); const el = createTextareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; } }}
                  placeholder="Search or type what you need"
                  rows={1}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 400, color: '#0E151C', background: 'transparent', fontFamily: 'inherit', lineHeight: '22px', resize: 'none', overflowY: 'hidden', minHeight: 22 }}
                />
                <MicButton size={20} className="icon-btn" btnStyle={{ alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center' }}
                  onTranscript={(t) => { setCreateSearch(t); const el = createTextareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; } }} />
                {csIsPromptMode && createSearch.trim() && (
                  <button onClick={handleCreatePromptSend} style={{ width: 32, height: 32, borderRadius: '50%', background: '#06465C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, alignSelf: (pageChipVisible && !chipDismissing) ? 'flex-start' : 'center', marginLeft: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11V3M7 3L3.5 6.5M7 3L10.5 6.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable tool list */}
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', background: '#FAF9F6' }} onScroll={e => setCreateScroll(e.currentTarget.scrollTop)}>
            {(() => {
              const q = debouncedCreateSearch.trim();
              const sectionLabel = txt => (
                <div style={{ padding: '10px 16px 4px', fontSize: 12, fontWeight: 500, color: '#475467', lineHeight: '18px' }}>{txt}</div>
              );
              const resolveOnClick = t => {
                if (t.onClick === 'quiz') return () => { setScreenOneToolType('quiz'); setScreenOneToolLabel('Quiz'); logStep(sessionId, 'welcome_screen', userType, '', { user_type: userType }); setScreen(1); setInput(''); };
                if (t.onClick === 'doc' || (t.onClick === null && t.label !== 'Boost Student Activity')) return () => { setScreenOneToolType('doc'); setScreenOneToolLabel(t.label); setScreen(1); setInput(''); };
                return t.onClick;
              };
              const resolveChips = t => t.chips === 'quiz' ? QUIZ_CHIPS : t.chips;

              const allSections = CREATE_TOOL_SECTIONS.map(({ section, tools }) => (
                <div key={section}>
                  {sectionLabel(section)}
                  {tools.map(t => (
                    <CreateToolRow key={t.label} svg={t.svg} label={t.label} sub={t.sub} chips={resolveChips(t)} onClick={resolveOnClick(t)} />
                  ))}
                </div>
              ));

              if (!q) return <>{allSections}<div style={{ height: 4 }} /></>;

              // PROMPT MODE — show a suggested tool if there's a confident keyword match, else fall through
              let suggestedCreateTool = null;
              if (csIsPromptMode) {
                const TOOL_KW = /\b(quiz|test|question|presentation|slide|podcast|nearpod|worksheet|lesson plan|rubric|graphic organizer|reading guide|discussion)\b/i;
                const kwMatch = TOOL_KW.exec(q);
                if (kwMatch) {
                  const allTools = CREATE_TOOL_SECTIONS.flatMap(s => s.tools);
                  const kw = kwMatch[1].toLowerCase();
                  suggestedCreateTool = allTools.find(t => fuzzyMatch(kw.split(' ')[0], t.label)) || null;
                }
                if (suggestedCreateTool) return (
                  <>
                    {sectionLabel('Suggested')}
                    <CreateToolRow svg={suggestedCreateTool.svg} label={suggestedCreateTool.label} sub={suggestedCreateTool.sub} chips={resolveChips(suggestedCreateTool)} onClick={resolveOnClick(suggestedCreateTool)} />
                    <div style={{ height: 4 }} />
                  </>
                );
                // No tool keyword — fall through to show library/reco results
              }

              // Topic extraction
              const TOOL_KW_RE_CS = /\b(quiz|test|question|presentation|slide|podcast|nearpod|worksheet|lesson|rubric|organizer|reading|discussion|feedback|comment|review|grade|inspect|analy|level|simplif|complex|boost|engag|idea|strateg|create|make|build)\b/gi;
              const topicPartCS = q.replace(TOOL_KW_RE_CS, '').replace(/\s+/g, ' ').trim();
              const hasTopicCS = topicPartCS.length > 2;
              const searchTermCS = hasTopicCS ? topicPartCS : q;

              // Subject-aware library data (same as welcome screen)
              const _detectCtxCS = !selectedClass ? detectSubjectFromTopic((pageContext?.title || '') + ' ' + searchTermCS) : null;
              const rawSubjectCS = (CLASSES.find(c => c.id === selectedClass)?.subject || _detectCtxCS || '').toLowerCase();
              const subjectIsELA_CS     = /ela|english|reading|writing|language/.test(rawSubjectCS);
              const subjectIsMath_CS    = /math/.test(rawSubjectCS);
              const subjectIsHistory_CS = /social studies|history/.test(rawSubjectCS);
              const subjectIsScience_CS = /science|biology|chemistry|physics/.test(rawSubjectCS);

              const MY_LIB_CS = [
                { label: 'Summer of Mariposas Quiz Pt. 1', sub: 'Modified 2 days ago',  icon: '/icons/Forms.svg', subject: 'ela',  tags: 'mariposas mariposa summer reading novel' },
                { label: 'Summer of Mariposas Quiz Pt. 2', sub: 'Modified 5 days ago',  icon: '/icons/Forms.svg', subject: 'ela',  tags: 'mariposas mariposa summer reading novel' },
                { label: 'Point of View Quiz',             sub: 'Modified 3 weeks ago', icon: '/icons/Forms.svg', subject: 'ela',  tags: 'point view pov reading author perspective' },
                { label: 'Ratios and Proportions Quiz',    sub: 'Modified 1 week ago',  icon: '/icons/Forms.svg', subject: 'math', tags: 'ratio ratios proportion proportions' },
                { label: 'Fractions Review',               sub: 'Modified 2 weeks ago', icon: '/icons/Docs.svg',  subject: 'math', tags: 'fraction fractions numbers divide' },
                { label: 'Anchor Chart — Math Vocabulary', sub: 'Modified 1 month ago', icon: '/icons/Docs.svg',  subject: 'math', tags: 'math vocabulary anchor chart' },
              ];
              const DIST_LIB_CS = [
                { label: 'Summer of Mariposas Close Reading Ch.1', sub: 'District · ELA Dept',  icon: '/icons/PDF.svg',   subject: 'ela',  tags: 'mariposas mariposa summer reading novel close' },
                { label: 'Summer of Mariposas Close Reading Ch.2', sub: 'District · ELA Dept',  icon: '/icons/PDF.svg',   subject: 'ela',  tags: 'mariposas mariposa summer reading novel close' },
                { label: 'Figurative Language Quiz',               sub: 'District · ELA Dept',  icon: '/icons/Forms.svg', subject: 'ela',  tags: 'figurative language metaphor simile' },
                { label: 'Text Evidence Practice',                 sub: 'District · ELA Dept',  icon: '/icons/Docs.svg',  subject: 'ela',  tags: 'text evidence cite citing' },
                { label: 'Ratios Grade 7 Assessment',              sub: 'District · Math Dept', icon: '/icons/Forms.svg', subject: 'math', tags: 'ratio ratios proportion' },
                { label: 'Number Sense Practice',                  sub: 'District · Math Dept', icon: '/icons/Docs.svg',  subject: 'math', tags: 'number sense arithmetic operations' },
                { label: 'Fractions Unit Assessment',              sub: 'District · Math Dept', icon: '/icons/Forms.svg', subject: 'math', tags: 'fraction fractions unit assessment' },
              ];

              const subjectFilterCS = item => {
                if (!selectedClass) return true;
                if (subjectIsELA_CS     && item.subject === 'ela')     return true;
                if (subjectIsMath_CS    && item.subject === 'math')    return true;
                if (subjectIsHistory_CS && item.subject === 'history') return true;
                if (subjectIsScience_CS && item.subject === 'science') return true;
                return false;
              };
              const topicMatchCS = (item, term) => {
                const hay = (item.label + ' ' + (item.tags || '')).toLowerCase();
                return term.toLowerCase().split(/\s+/).some(w => w.length > 2 && hay.includes(w));
              };

              // SEARCH MODE — scored tool match, max 3 per section
              const matched = CREATE_TOOL_SECTIONS.map(({ section, tools }) => ({
                section,
                tools: topMatches(q, tools, t => t.label, 3),
              })).filter(s => s.tools.length > 0);
              // Also match on topic part (e.g. "create a rubric" → topicPart="rubric" → Rubric tool)
              const matchedOnTopic = (hasTopicCS && topicPartCS !== q)
                ? CREATE_TOOL_SECTIONS.map(({ section, tools }) => ({
                    section,
                    tools: topMatches(topicPartCS, tools, t => t.label, 3).filter(t => !matched.some(s => s.tools.some(m => m.label === t.label))),
                  })).filter(s => s.tools.length > 0)
                : [];
              const allMatchedCS = matched.length > 0 ? matched : matchedOnTopic;
              // If any tool matched, suppress library to avoid noise
              const isPureToolQueryCS = allMatchedCS.some(s => s.tools.length > 0);

              const recoGradeCS = CLASSES.find(c => c.id === selectedClass)?.grade || prefs.grade || '8th';
              const subjectDeptCS = subjectIsELA_CS ? 'ELA' : subjectIsMath_CS ? 'Math' : subjectIsHistory_CS ? 'Social Studies' : subjectIsScience_CS ? 'Science' : null;
              const hardcodedMyCS   = isPureToolQueryCS ? [] : semanticLibResultsCS.my;
              const hardcodedDistCS = isPureToolQueryCS ? [] : semanticLibResultsCS.district;
              // Only show real hardcoded library items — no generated fakes
              const myLibCS = hardcodedMyCS;
              const distLibCS = hardcodedDistCS;
              const recoTopicCS = hasTopicCS ? topicPartCS : q;
              const noToolKw = !/\b(quiz|test|question|presentation|slide|podcast|nearpod|worksheet|lesson|rubric|discussion)\b/i.test(q);
              const recoCS = (hasTopicCS || noToolKw)
                ? recoItems(recoTopicCS, recoGradeCS, {
                    quiz:   () => { setScreenOneToolType('quiz'); setScreenOneToolLabel('Quiz'); setInput(recoTopicCS); setScreen(1); },
                    slides: () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Presentation'); setInput(recoTopicCS); setScreen(1); },
                    doc:    () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Guided Notes'); setInput(recoTopicCS); setScreen(1); },
                    lesson: () => { setScreenOneToolType('doc'); setScreenOneToolLabel('Lesson Plan'); setInput(recoTopicCS); setScreen(1); },
                  })
                : [];

              const LibRowCS = ({ item }) => (
                <div style={{ padding: '0 8px' }}>
                  <button className="tool-row lib-row" style={{ width: '100%', padding: '8px 10px', border: 'none', borderRadius: 10, background: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <img src={item.icon} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0, borderRadius: 7 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                      <div className="lib-sub">{item.sub}</div>
                    </div>
                  </button>
                </div>
              );
              const RecoRowCS = ({ item }) => (
                <div style={{ padding: '0 8px' }}>
                  <button className="tool-row lib-row" onClick={item.onClick || undefined} style={{ width: '100%', padding: '8px 10px', border: 'none', borderRadius: 10, background: 'none', display: 'flex', alignItems: 'center', gap: 12, cursor: item.onClick ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}>
                    <img src={item.svg} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.slate900, fontWeight: 400, lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div className="lib-sub">{item.tooltip}</div>
                    </div>
                  </button>
                </div>
              );

              const secLabelCS = (txt, first = false) => (
                <div style={{ padding: `${first ? 10 : 16}px 16px 4px`, fontSize: 12, fontWeight: 500, color: '#475467', lineHeight: '18px' }}>{txt}</div>
              );

              const hasAnyCS = allMatchedCS.length > 0 || myLibCS.length > 0 || distLibCS.length > 0 || recoCS.length > 0;
              if (!hasAnyCS) return <>{allSections}<div style={{ height: 4 }} /></>;

              return (
                <>
                  {(() => {
                    let firstCS = true;
                    const secCS = txt => { const el = secLabelCS(txt, firstCS); firstCS = false; return el; };
                    return (
                      <>
                        {allMatchedCS.length > 0 && allMatchedCS.map(({ section, tools }) => (
                          <div key={section}>
                            {secCS(section)}
                            {tools.map(t => <CreateToolRow key={t.label} svg={t.svg} label={t.label} sub={t.sub} chips={resolveChips(t)} onClick={resolveOnClick(t)} />)}
                          </div>
                        ))}
                        {myLibCS.length > 0 && <>{secCS('My Library')}{myLibCS.map(l => <LibRowCS key={l.label} item={l} />)}</>}
                        {distLibCS.length > 0 && <>{secCS('District Library')}{distLibCS.map(l => <LibRowCS key={l.label} item={l} />)}</>}
                        {recoCS.length > 0 && <>{secCS('Recommendations')}{recoCS.map(r => <RecoRowCS key={r.title} item={r} />)}</>}
                      </>
                    );
                  })()}
                  <div style={{ height: 4 }} />
                </>
              );
            })()}
          </div>
        </>
        );
      })()}

      {/* ── SCREEN 0 — Page Context ── */}
      {screen === 0 && (
        <>
          <Header onClose={handleClose} selectedClass={selectedClass} classBtnRef={classBtnRef} onClassClick={() => { const r = classBtnRef.current?.getBoundingClientRect(); if (r) setClassPickerPos({ top: r.bottom + 4, left: r.left }); setClassPickerOpen(v => !v); }} />
          <SubHeader onBack={() => setScreen('welcome')} label="Quiz" />
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.slate900, marginBottom: 4 }}>Simulate your current page</div>
            <div style={{ fontSize: 13, color: C.slate500, marginBottom: 14 }}>In the real Brisk extension, we&apos;d read the page you&apos;re on automatically. For this demo, paste a URL or upload a screenshot to simulate that.</div>

            {/* URL + upload row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={userType} onChange={e => setUserType(e.target.value)}
                style={{ border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.slate900, background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                <option value="Brisk Employee">Brisk Employee</option>
                <option value="Teacher">Teacher</option>
                <option value="District Admin">District Admin</option>
              </select>
              <input
                type="url"
                value={pageUrl}
                onChange={e => {
                  const v = e.target.value;
                  setPageUrl(v);
                  if (!v.trim()) { setPageContext(null); }
                }}
                onKeyDown={e => { if (e.key === 'Enter' && pageUrl.trim()) handleFetchPage(pageUrl.trim()); }}
                placeholder="Paste the URL of the page you're teaching from"
                style={{ flex: 1, border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: C.slate900 }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px 11px', border: `1px solid ${C.slate200}`, borderRadius: 8, background: '#fff', fontFamily: 'inherit', fontSize: 12, color: C.slate600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                📷 Screenshot
              </button>
            </div>

            {/* Loading indicator */}
            {pageContextLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.slate500, fontSize: 12, marginBottom: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.slate200}`, borderTopColor: C.green, animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Reading page…
              </div>
            )}

            {/* URL context pill — shown after fetch completes */}
            {pageContext?.type === 'url' && !pageContextLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', background: C.slate100, borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>🌐</span>
                <span style={{ fontSize: 12, color: C.slate700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {pageContext.title || pageContext.url}
                </span>
                {pageContext.failed && <span style={{ fontSize: 11, color: C.slate400, flexShrink: 0 }}>preview unavailable</span>}
              </div>
            )}

            {/* Screenshot context card (just shows title after analysis) */}
            {pageContext?.type === 'screenshot' && pageContext.title && !pageContextLoading && (
              <div style={{ border: `1px solid ${C.slate200}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.slate900 }}>{pageContext.title}</div>
                  {pageContext.preview && <div style={{ fontSize: 12, color: C.slate500, marginTop: 1 }}>{pageContext.preview}</div>}
                </div>
              </div>
            )}

            {/* Quick reply buttons — appear as soon as URL is entered OR screenshot uploaded */}
            {(pageUrl.trim().length > 4 || pageContext?.type === 'screenshot') && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button onClick={handleAboutThisPage}
                  style={{ padding: '9px 16px', border: `1.5px solid ${C.slate900}`, borderRadius: 20, background: C.slate900, color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Make a quiz about this
                </button>
                <button onClick={() => { setScreen(1); setInput(''); }}
                  style={{ padding: '9px 16px', border: `1.5px solid ${C.slate200}`, borderRadius: 20, background: '#fff', color: C.slate700, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>
                  Start from scratch
                </button>
              </div>
            )}

            {/* Skip link */}
            <button onClick={() => { setScreen(1); setInput(''); }}
              style={{ background: 'none', border: 'none', color: C.slate400, fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Skip — I&apos;ll describe my topic instead
            </button>
          </div>
        </>
      )}

      {/* ── SCREEN 1 — Tool creation ── */}
      {screen === 1 && (
        <ToolCreationScreen
          toolName={screenOneToolLabel}
          toolType={screenOneToolType}
          toolIcon={screenOneToolType === 'doc' ? '/icons/Docs.svg' : '/icons/Quiz.svg'}
          promptPlaceholder={buildPromptPlaceholder(screenOneToolType, screenOneToolLabel, pageChipVisible ? pageContext : null)}
          input={input}
          onInputChange={setInput}
          prefs={prefs}
          onPrefsChange={delta => setPrefs(p => ({ ...p, ...delta }))}
          pageContext={pageContext}
          pageChipVisible={pageChipVisible}
          onDismissChip={dismissChip}
          onAddClick={({ top, left }) => { setAddMenuPos({ top, left }); setAddMenuOpen(v => !v); }}
          onBriskIt={handleQuizBriskIt}
          onBack={() => setScreen('create')}
          onClose={handleClose}
        />
      )}

      {/* ── SCREEN 2 ── */}
      {screen === 2 && (
        <>
          <SubHeader onBack={() => go(1)} />
          <Breadcrumb active="Topic" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            {pageContext ? (
              <BriskBubble>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{pageContext.type === 'screenshot' ? '🖼️' : '🌐'}</span>
                  <span style={{ fontSize: 12, color: C.slate600, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageContext.title}</span>
                </div>
                <CurriculumCard unit={unit} title={cardTitle} loading={cardLoading} onSwap={handleSwapCurriculum} url={pageContext?.url || ''} />
                <div style={{ marginTop: 8 }}>Got it — based on where your class is in the curriculum, here&apos;s the unit and lesson I&apos;ll ground this quiz in.</div>
                <InlineClassPicker value={selectedClass} onChange={v => { setSelectedClass(v); setClassOverridden(true); const cd = CLASSES.find(c => c.id === v); if (cd) setPrefs(p => ({ ...p, grade: cd.grade })); }} />
              </BriskBubble>
            ) : (
              <>
                <TeacherBubble>{topic}</TeacherBubble>
                <BriskBubble>
                  <CurriculumCard unit={unit} title={cardTitle} loading={cardLoading} onSwap={handleSwapCurriculum} url={''} />
                  <div style={{ marginTop: 8 }}>Got it — based on where your class is in the curriculum, here&apos;s the unit and lesson I&apos;ll ground this quiz in.</div>
                  <InlineClassPicker value={selectedClass} onChange={v => { setSelectedClass(v); setClassOverridden(true); const cd = CLASSES.find(c => c.id === v); if (cd) setPrefs(p => ({ ...p, grade: cd.grade })); }} />
                </BriskBubble>
              </>
            )}
            <BriskBubble>What are your students&apos; needs or circumstances right now? Are they struggling with anything specific?</BriskBubble>
          </ChatScroll>
          <TextInput
            placeholder="e.g. They don't understand how to…"
            animatedPlaceholder={needsSuggestions.length > 0 ? needsSuggestions[placeholderIdx] : undefined}
            animatedPlaceholderOpacity={placeholderOpacity}
            value={input} onChange={setInput} onSubmit={handleHardestThingSubmit} disabled={cardLoading}
            onFocus={() => setNeedsInputFocused(true)}
            onBlur={() => setNeedsInputFocused(false)}
          />
        </>
      )}

      {/* ── SCREEN 3 — Follow-up question a. ── */}
      {screen === 3 && (
        <>
          <QuizHeader onBack={() => go(2)} onClose={handleClose} activeTab="Overview" onTabChange={null} />
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {/* Quiz context */}
            <div style={{ fontSize: 14, fontWeight: 600, color: C.slate900, marginBottom: 4, lineHeight: '21px' }}>{topic || 'Quiz topic'}</div>
            {curriculumCard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '6px 10px', background: C.slate100, borderRadius: 6, border: `1px solid ${C.slate200}` }}>
                <input type="checkbox" checked readOnly style={{ accentColor: C.green, cursor: 'default', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.slate600, lineHeight: '20px' }}>Closing curriculum in {curriculumCard.unit || 'Module 1, Unit 2'}</span>
              </div>
            )}

            {/* Question + counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontSize: 14, color: C.slate900, lineHeight: 1.5, flex: 1, paddingRight: 12 }}>
                Are any students working below grade level on {subj}?
              </div>
              <span style={{ fontSize: 12, color: C.slate400, flexShrink: 0, lineHeight: '21px' }}>1 of 2</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Some of them', 'No', 'It varies'].map(opt => (
                <ChoiceRow key={opt} label={opt} selected={fluencyAnswer === opt} onClick={() => handleFluencySelect(opt)} />
              ))}
              <OtherChoiceRow onSubmit={handleFluencySelect} />
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
            <button onClick={() => go(2)} style={{ padding: '8px 16px', border: `1px solid ${C.slate200}`, borderRadius: 20, background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: C.slate700, cursor: 'pointer' }}>Back</button>
            <button onClick={() => { setFluencyAnswer('skipped'); logStep(sessionId, 'needs_fluency', 'skipped', '', { topic, subjectDetected: detectedSubject, user_type: userType }); go(4, 'skipped', ''); }}
              style={{ padding: '8px 16px', border: `1px solid ${C.slate200}`, borderRadius: 20, background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: C.slate700, cursor: 'pointer' }}>Skip</button>
          </div>
        </>
      )}

      {/* ── SCREEN 4 — Follow-up question b. ── */}
      {screen === 4 && (
        <>
          <QuizHeader onBack={() => go(3)} onClose={handleClose} activeTab="Overview" onTabChange={null} />
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.slate900, marginBottom: 10, lineHeight: '21px' }}>{topic || 'Quiz topic'}</div>

            {/* Loading district guidance */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.slate100, borderRadius: 6, border: `1px solid ${C.slate200}`, marginBottom: 14 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.slate200}`, borderTopColor: C.green, animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: C.slate500, lineHeight: '20px' }}>Loading district guidance…</span>
            </div>

            {/* Question + counter */}
            {needs2Loading
              ? <div style={{ fontSize: 14, color: C.slate500, lineHeight: 1.5 }}>Loading question<LoadingDots /></div>
              : needs2Data && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, color: C.slate900, lineHeight: 1.5, flex: 1, paddingRight: 12 }}>{needs2Data.question}</div>
                    <span style={{ fontSize: 12, color: C.slate400, flexShrink: 0, lineHeight: '21px' }}>2 of 2</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {needs2Data.options.map(opt => (
                      <button key={opt} onClick={() => setNeeds2Selections(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])}
                        style={{ width: '100%', background: needs2Selections.includes(opt) ? C.slate100 : '#fff', border: `1px solid ${needs2Selections.includes(opt) ? C.slate300 : C.slate200}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, color: C.slate900, textAlign: 'left' }}>
                        {opt}
                        {needs2Selections.includes(opt) && <span style={{ color: C.slate600, fontSize: 14 }}>→</span>}
                      </button>
                    ))}
                    <OtherChoiceRow onSubmit={handleNeeds2Select} />
                  </div>
                </>
              )}
          </div>
          <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
            <button onClick={() => go(3)} style={{ padding: '8px 16px', border: `1px solid ${C.slate200}`, borderRadius: 20, background: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: C.slate700, cursor: 'pointer' }}>Back</button>
            <button onClick={() => needs2Selections.length > 0 ? handleNeeds2Select(needs2Selections.join('; ')) : (setNeeds2Selections([]), setNeeds2Answer('skipped'), go(5, 'skipped', ''))}
              style={{ padding: '8px 20px', border: 'none', borderRadius: 20, background: C.slate900, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              {needs2Selections.length > 0 ? 'Finish' : 'Skip'}
            </button>
          </div>
        </>
      )}

      {/* ── SCREEN 5 ── */}
      {screen === 5 && (
        <>
          <SubHeader onBack={() => go(4)} />
          <Breadcrumb active="Scaffolds" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll><BriskBubble>Checking your district&apos;s instructional strategies…<LoadingDots /></BriskBubble></ChatScroll>
        </>
      )}

      {/* ── SCREEN 6 ── */}
      {screen === 6 && (
        <>
          <SubHeader onBack={() => go(4)} />
          <Breadcrumb active="Scaffolds" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            <BriskBubble>
              Your district has 3 core instructional strategies for {subj}. Based on what you shared — <em>{strugglePhrase}</em> — <strong>{strat.name}</strong> is a strong fit. It {strat.desc}.
              <StrategyCard name={strat.name} onClick={openStrategyGuide} />
            </BriskBubble>
            <BriskBubble>Want me to open with a warm-up using this approach?</BriskBubble>
            {!warmupAnswered && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Yes', 'No'].map(opt => (
                  <ChoiceRow key={opt} label={opt} selected={false} onClick={() => setWarmupAnswered(opt)} />
                ))}
              </div>
            )}
            {warmupAnswered && (
              <>
                <TeacherBubble>{warmupAnswered}</TeacherBubble>
                <BriskBubble>Any other scaffolds you&apos;d like me to include? Type one below or skip to continue.</BriskBubble>
              </>
            )}
          </ChatScroll>
          {!!warmupAnswered && (
            <TextInput
              placeholder="e.g. sentence frames, word bank, graphic organizer"
              value={input} onChange={setInput}
              animatedPlaceholder={scaffoldSuggestions.length > 0 ? scaffoldSuggestions[scaffoldPlaceholderIdx] : undefined}
              animatedPlaceholderOpacity={scaffoldPlaceholderOpacity}
              onFocus={() => setScaffoldInputFocused(true)}
              onBlur={() => setScaffoldInputFocused(false)}
              onSubmit={() => {
                if (!input.trim()) return;
                setScaffolds(s => [...s, { id: genUUID(), text: input.trim() }]);
                logStep(sessionId, 'scaffold_custom_chat', input.trim(), '', { topic, subjectDetected: detectedSubject, scaffoldStrategy: strat?.name, customScaffoldsAdded: input.trim(), user_type: userType });
                go(7, input.trim(), "Here's what I'll build…");
              }} />
          )}
        </>
      )}

      {/* ── SCREEN 7 ── */}
      {screen === 7 && (
        <>
          <SubHeader onBack={() => go(6)} />
          <Breadcrumb active="Create" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            <BriskBubble>
              Here&apos;s what I&apos;ll build: a quiz grounded in {unit || 'your current unit'} — that&apos;s where your students are right now. I&apos;ll open with a <strong>{strat.name}</strong> warm-up and include references so students know exactly where to look.
            </BriskBubble>
            <BriskBubble>
              Adjust anything below, then create.
              <div style={{ marginTop: 8 }}>
                <QuizCard title={`${shortTopic} Quiz`} subject={subj} subtitleText={quizSubtitleS7}
                  onBriskIt={() => go(8, 'Brisk It', 'Creating your quiz…')} onEdit={openEditPrefs} />
              </div>
            </BriskBubble>
          </ChatScroll>
          <TextInput placeholder="Add more details to make adjustments" value={input} onChange={setInput} onSubmit={() => setInput('')} />
        </>
      )}

      {/* ── SCREEN 7b ── */}
      {screen === '7b' && (
        <>
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto' }}>
            <SectionLabel label="Settings" noBorder />
            <div style={{ padding: '0 14px 12px', display: 'flex', gap: 10 }}>
              <SelectField label="Language" value={prefs.language} onChange={v => setPrefs(p => ({ ...p, language: v }))} options={['English', 'Spanish', 'French', 'Mandarin', 'Arabic']} />
              <SelectField label="Grade" value={prefs.grade} onChange={v => setPrefs(p => ({ ...p, grade: v }))} options={['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']} />
            </div>
            <SectionLabel label="Format" />
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 10 }}>
              <SelectField label="Question Type" value={prefs.questionType} onChange={v => setPrefs(p => ({ ...p, questionType: v }))} options={['Multiple Choice', 'Short Answer', 'True/False']} />
              <SelectField label="# Questions" value={String(prefs.numQuestions)} onChange={v => setPrefs(p => ({ ...p, numQuestions: Number(v) }))} options={['5', '10', '15', '20']} />
            </div>
            <div style={{ padding: '0 14px 14px' }}>
              <PlatformSelector value={prefs.platform} onChange={v => setPrefs(p => ({ ...p, platform: v }))} />
            </div>
            <SectionLabel label="Scaffolds" />
            <div onClick={() => setScreen('7c')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', background: '#fff', borderBottom: `1px solid ${C.slate200}` }}>
              <span style={{ fontSize: 13, color: C.slate700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{scaffoldLabel}</span>
              <span style={{ color: C.slate400, fontSize: 16, flexShrink: 0, marginLeft: 8 }}>›</span>
            </div>
            <div style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="includeSources" checked={prefs.includeSources} onChange={e => setPrefs(p => ({ ...p, includeSources: e.target.checked }))} style={{ cursor: 'pointer', width: 16, height: 16, accentColor: C.slate900 }} />
              <label htmlFor="includeSources" style={{ fontSize: 13, color: C.slate700, cursor: 'pointer', userSelect: 'none' }}>Include sources</label>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
            <button onClick={() => {
              logStep(sessionId, 'preferences_saved', JSON.stringify(prefs), '', { topic, subjectDetected: detectedSubject, scaffoldStrategy: strategy?.name, user_type: userType });
              go(7, '', 'Preferences saved.');
            }} style={{ background: C.slate900, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
          </div>
        </>
      )}

      {/* ── SCREEN 7c ── */}
      {screen === '7c' && (
        <>
          <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            {scaffolds.length === 0 && <div style={{ padding: '20px 24px', textAlign: 'center', color: C.slate400, fontSize: 13 }}>No scaffolds yet. Add one below.</div>}
            {scaffolds.map(s => (
              <div key={s.id} style={{ padding: '6px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea value={s.text} onChange={e => updateScaffold(s.id, e.target.value)}
                  placeholder="Describe a scaffold or strategy (e.g. sentence frames, graphic organizer, visual supports)"
                  rows={4} style={{ flex: 1, border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, resize: 'none', outline: 'none', color: C.slate900, lineHeight: 1.5, minHeight: 88 }} />
                <button onClick={() => removeScaffold(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate400, fontSize: 18, padding: '8px 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <div style={{ padding: '8px 14px' }}>
              <button onClick={addScaffold} style={{ width: '100%', background: 'none', border: `1.5px dashed ${C.slate300}`, borderRadius: 8, padding: '11px 16px', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', color: C.slate600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, lineHeight: 1, fontWeight: 300 }}>+</span> Add scaffold
              </button>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 14px', display: 'flex', justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
            <button onClick={() => {
              logStep(sessionId, 'scaffold_custom_editor', scaffolds.map(s => s.text).filter(Boolean).join('; '), '', { topic, subjectDetected: detectedSubject, scaffoldStrategy: strategy?.name, customScaffoldsAdded: scaffolds.map(s => s.text).filter(Boolean).join('; '), user_type: userType });
              setScreen('7b');
            }} style={{ background: C.slate900, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Done</button>
          </div>
        </>
      )}

      {/* ── SCREEN 8 — Loading ── */}
      {screen === 8 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 32px', gap: 24 }}>
          <DiamondLoader />
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.slate900, marginBottom: 4 }}>Creating your quiz</div>
            <div style={{ fontSize: 12, color: C.slate500, marginBottom: 22, animation: 'shimmer 2s ease-in-out infinite' }}>
              Based on your customizations and curriculum sources
            </div>
            <style>{`@keyframes shimmer{0%,100%{opacity:0.55}50%{opacity:1}}`}</style>
            <CheckItem label="Personalizing to classroom context" delay={200} />
            <CheckItem label="Applying your pedagogical approach" delay={1000} />
            <CheckItem label="Generating questions" delay={1800} pulsing />
          </div>
          {/* Summary */}
          <div style={{ fontSize: 11, color: C.slate400, lineHeight: 2, textAlign: 'center', marginTop: 4 }}>
            {topic && <div><span style={{ color: C.slate500 }}>Topic:</span> {topic}</div>}
            {hardestThing && <div><span style={{ color: C.slate500 }}>Struggle:</span> {hardestThing}</div>}
            {strat?.name && <div><span style={{ color: C.slate500 }}>Scaffold:</span> {strat.name}</div>}
            {activeScaffolds.map((s, i) => (
              <div key={i}><span style={{ color: C.slate500 }}>+ </span>{s.text.split(' — ')[0]}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── SCREEN 9 — Quiz Loaded / Iteration ── */}
      {screen === 9 && (
        <>
          <QuizHeader onBack={null} onClose={handleClose} activeTab={activeTab} onTabChange={setActiveTab} sourcesCount={11} />

          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <>
              <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                {/* AI summary */}
                {chatLog.filter(e => e.type === 'brisk' || e.type === 'teacher').length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {chatLog.map(entry => {
                      if (entry.type === 'teacher') {
                        return (
                          <div key={entry.id} style={{ marginBottom: 8, fontSize: 14, color: C.slate700, lineHeight: 1.5, fontStyle: 'italic' }}>
                            You told me: {entry.text}
                          </div>
                        );
                      }
                      if (entry.type === 'brisk') {
                        return (
                          <div key={entry.id} style={{ marginBottom: 10, fontSize: 14, color: C.slate700, lineHeight: 1.5 }}>
                            {entry.text}{entry.isUpdating && <LoadingDots />}
                            {entry.hasRetry && (
                              <button onClick={() => doRefine(retryFeedbackRef.current, retryQuizRef.current, entry.id)}
                                style={{ display: 'block', marginTop: 8, background: C.slate900, color: '#fff', border: 'none', borderRadius: 20, padding: '6px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                                Retry
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {apiError && (
                  <div style={{ background: '#fef3f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: C.slate700, marginBottom: 14 }}>
                    <div style={{ marginBottom: 8 }}>Having trouble — try again?</div>
                    <button onClick={() => { setApiError(''); setScreen(8); }}
                      style={{ background: C.slate900, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 18px', fontFamily: 'inherit', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>Retry</button>
                  </div>
                )}

                {/* Improvement pills */}
                {!quizLoading && versions.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.slate700, marginBottom: 8, lineHeight: '20px' }}>Anything you want to improve?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['Make it shorter', 'Make it harder', 'Something else'].map(pill => (
                        <button key={pill} onClick={() => setInput(pill)}
                          style={{ padding: '6px 12px', border: `1px solid ${C.slate300}`, borderRadius: 20, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate700, cursor: 'pointer', lineHeight: '20px' }}>
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <TextInput placeholder="Share what you'd like to revise" value={input} onChange={setInput} onSubmit={handleRefineSubmit} disabled={quizLoading} />
            </>
          )}

          {/* SOURCES TAB */}
          {activeTab === 'Sources' && (
            <>
              <div className="scroll-area" style={{ flex: 1, overflowY: 'auto' }}>
                {[
                  { id: 'needs', label: 'Student Needs & Goals', count: '5 total', icon: '/icons/Diploma.svg',
                    content: <div style={{ fontSize: 14, color: C.slate700, lineHeight: 1.5, padding: '10px 14px 14px' }}>Your students need help tracking whose perspective controls the story — particularly how the cultural background shapes what they notice. Your goal is to check if they understood the reading before moving on.</div> },
                  { id: 'curriculum', label: 'Curriculum', count: '3 total', icon: '/icons/CI Lightening.svg',
                    content: (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                        {[
                          { svg: '/icons/Docs.svg', name: 'Teaching Guide Ch 3' },
                          { svg: '/icons/PDF.svg', name: '5th Grade Reading Strategies' },
                          { svg: '/icons/Docs.svg', name: 'Narrative Elements Anchor Charts' },
                        ].sort((a, b) => a.name.length - b.name.length).map(d => (
                          <div key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, paddingLeft: 8, paddingRight: 6, background: '#fff', border: '1px solid #E2E1DE', borderRadius: 8, flex: '0 0 auto', maxWidth: '100%' }}>
                            <img src={d.svg} width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: C.slate900, whiteSpace: 'nowrap' }}>{d.name}</span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
                              <img src="/icons/Close.svg" width={12} height={12} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                            </button>
                          </div>
                        ))}
                        <AddTertiaryBtn style={{ marginTop: 4 }} />
                      </div>
                    ) },
                  { id: 'standards', label: 'Standards', count: '2 total', icon: '/icons/Standards.svg',
                    content: (
                      <div style={{ padding: '0 14px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['RL 2.3', 'RL 2.4', 'RL 2.6', 'RL 2.8'].map(s => (
                            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px', background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 6, fontSize: 12, color: C.slate900 }}>
                              {s}
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                                <img src="/icons/Close.svg" width={10} height={10} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                              </button>
                            </span>
                          ))}
                          <AddTertiaryBtn />
                        </div>
                      </div>
                    ) },
                  { id: 'district', label: 'District Guidance', count: '2 sources', icon: '/icons/School.svg',
                    content: (
                      <div style={{ padding: '0 14px 14px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                        {[
                          { svg: '/icons/Docs.svg', name: '7-step Vocabulary Guidance' },
                          { svg: '/icons/PDF.svg', name: 'ELA Scaffolds' },
                        ].sort((a, b) => a.name.length - b.name.length).map(d => (
                          <div key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, paddingLeft: 8, paddingRight: 6, background: '#fff', border: '1px solid #E2E1DE', borderRadius: 8, flex: '0 0 auto', maxWidth: '100%' }}>
                            <img src={d.svg} width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: C.slate900, whiteSpace: 'nowrap' }}>{d.name}</span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
                              <img src="/icons/Close.svg" width={12} height={12} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                            </button>
                          </div>
                        ))}
                        <AddTertiaryBtn style={{ marginTop: 4 }} />
                      </div>
                    ) },
                  { id: 'data', label: 'Student Data', count: '3 sources', icon: '/icons/Graph.svg',
                    content: (
                      <div style={{ padding: '0 14px 14px' }}>
                        {['Class avg: 78% (Unit 1 - Narrative Writing)', 'Class avg: 75% (Unit 3 - Poetry & Figurative Language)'].map(d => (
                          <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                            <div style={{ width: 16, height: 16, background: '#1B6B6B', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <span style={{ flex: 1, fontSize: 13, color: C.slate700, lineHeight: '20px' }}>{d}</span>
                          </div>
                        ))}
                        <AddTertiaryBtn style={{ marginTop: 6 }} />
                      </div>
                    ) },
                ].map(section => (
                  <div key={section.id} style={{ borderBottom: `1px solid ${C.slate200}` }}>
                    <button onClick={() => setExpandedSource(expandedSource === section.id ? null : section.id)}
                      style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <img src={section.icon} width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 400, color: C.slate900, lineHeight: '21px' }}>{section.label}</span>
                      <span style={{ fontSize: 12, color: C.slate500, lineHeight: '18px', marginRight: 6 }}>{section.count}</span>
                      <img src={expandedSource === section.id ? '/icons/Chevron Up.svg' : '/icons/Chevron Down.svg'} width={14} height={14} alt="" style={{ display: 'block', flexShrink: 0 }} />
                    </button>
                    {expandedSource === section.id && section.content}
                  </div>
                ))}
                <div style={{ padding: '12px 14px' }}>
                  <button style={{ width: '100%', padding: '10px 0', border: `1px solid ${C.slate200}`, borderRadius: 8, background: 'none', fontFamily: 'inherit', fontSize: 14, color: C.slate700, cursor: 'pointer' }}>+ Add Source</button>
                </div>
              </div>
              <BottomInputBar placeholder="Ask about sources" value={input} onChange={setInput} onSubmit={() => setInput('')} />
            </>
          )}
        </>
      )}

      {/* ── QUIZ GENERATION SCREEN ── */}
      {screen === 'quiz-gen' && (() => {
        // Derive class/subject context
        const qgCls = CLASSES.find(c => c.id === selectedClass);
        const qgSubject = qgCls?.subject || detectedSubject || 'ELA';
        const qgGrade = qgCls?.grade || prefs.grade || '8th';
        const qgSubjectL = qgSubject.toLowerCase();
        const qgPageTitle = pageContext?.title || '';
        // Derive a clean short topic: strip site names after " - " or " | ", cap at 50 chars
        const qgRawTopic = topic || qgPageTitle || 'this topic';
        const qgShortTopic = qgRawTopic.replace(/\s*[-|]\s*[^-|]{3,}$/, '').trim().slice(0, 50) || qgRawTopic;

        // Dynamic loading messages tied to actual context
        const isDocTool = screenOneToolType === 'doc';
        const resourceLabel = screenOneToolLabel || 'Quiz';
        const QUIZ_GEN_LOADING_MSGS = isDocTool ? [
          qgPageTitle ? `Reading "${qgPageTitle}"…` : `Analyzing ${qgShortTopic}…`,
          'Loading district guidance…',
          `Checking ${qgGrade} grade standards…`,
          `Almost ready — wrapping up your ${resourceLabel}…`,
        ] : [
          qgPageTitle ? `Reading "${qgPageTitle}"…` : `Analyzing ${qgShortTopic}…`,
          'Loading district guidance…',
          `Checking ${qgGrade} grade student data…`,
          `Almost ready — wrapping up your ${resourceLabel}…`,
        ];

        // Resource-specific Q1/Q2 for doc tools; subject-aware fallback for quiz tools
        let QG_Q1, QG_Q2;
        if (isDocTool) {
          const rl = resourceLabel.toLowerCase();
          if (rl.includes('syllabus')) {
            QG_Q1 = {
              type: 'multi-select',
              text: `What should your ${qgShortTopic} syllabus include?`,
              options: ['Learning objectives', 'Grading breakdown', 'Weekly schedule', 'Required materials'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: 'Who is the primary audience for this syllabus?',
              options: ['Students', 'Parents & guardians', 'Both students and families', 'Administrator review'],
            };
          } else if (rl.includes('rubric')) {
            QG_Q1 = {
              type: 'multi-select',
              text: `What should the ${qgShortTopic} rubric assess?`,
              options: ['Content & accuracy', 'Organization & structure', 'Writing quality', 'Evidence & citations'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: `How will students use this rubric for ${qgShortTopic}?`,
              options: [
                'Grade a final project or essay',
                'Help students self-assess their work',
                'Provide feedback during drafting',
                'Share expectations upfront',
              ],
            };
          } else if (rl.includes('lesson')) {
            QG_Q1 = {
              type: 'multi-select',
              text: `What should your ${qgShortTopic} lesson emphasize?`,
              options: ['Direct instruction', 'Group discussion', 'Hands-on activities', 'Independent practice'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: `What's the primary goal for this ${qgShortTopic} lesson?`,
              options: [
                'Introduce a new concept',
                'Practice and reinforce prior learning',
                'Review before an assessment',
                'Differentiate for varied learners',
              ],
            };
          } else if (rl.includes('facilitation') || rl.includes('discussion')) {
            QG_Q1 = {
              type: 'multi-select',
              text: `What should the ${qgShortTopic} facilitation guide include?`,
              options: ['Discussion questions', 'Student grouping strategies', 'Timing & pacing notes', 'Common misconceptions'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: `How do you want students to discuss ${qgShortTopic}?`,
              options: ['Whole-class discussion', 'Small group breakouts', 'Fishbowl or Socratic seminar', 'Pair & share'],
            };
          } else if (rl.includes('slide') || rl.includes('presentation')) {
            QG_Q1 = {
              type: 'multi-select',
              text: `What should the ${qgShortTopic} presentation cover?`,
              options: ['Key concepts & definitions', 'Real-world examples', 'Discussion or reflection prompts', 'Practice problems or checks'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: `Who is the audience for this ${qgShortTopic} presentation?`,
              options: ['Students following along', 'Teacher-led direct instruction', 'Student-created project', 'Family or community sharing'],
            };
          } else {
            // Generic doc fallback
            QG_Q1 = {
              type: 'multi-select',
              text: `What should this ${qgShortTopic} ${resourceLabel.toLowerCase()} focus on?`,
              options: ['Key concepts & vocabulary', 'Student practice opportunities', 'Real-world connections', 'Assessment or review'],
            };
            QG_Q2 = {
              type: 'single-select',
              text: `What's your main goal for this ${resourceLabel.toLowerCase()}?`,
              options: [
                'Support student understanding',
                'Provide structured practice',
                'Differentiate for diverse learners',
                'Share with families or admin',
              ],
            };
          }
        } else {
          // Quiz tool: subject-aware Q1 options, made specific to page content when available
          const hasPage = !!qgPageTitle;
          const q1Options = qgSubjectL.includes('math') ? [
            `Setting up ${qgShortTopic} problems correctly`,
            'Understanding the concept behind the steps',
            'Connecting it to real-world contexts',
            'Checking their work for errors',
          ] : qgSubjectL.includes('science') ? [
            `Understanding key vocabulary in ${qgShortTopic}`,
            'Applying concepts to new situations',
            'Analyzing data and drawing conclusions',
            'Connecting ideas to the bigger unit',
          ] : (qgSubjectL.includes('social') || qgSubjectL.includes('history')) ? [
            hasPage ? `Grasping the significance of ${qgShortTopic}` : 'Analyzing primary sources',
            'Understanding cause and effect relationships',
            'Identifying multiple perspectives',
            'Connecting events or ideas to today',
          ] : [
            hasPage ? `Tracking what happens in ${qgShortTopic} and why` : 'Finding and using evidence from the text',
            hasPage ? `Understanding the author's choices in ${qgShortTopic}` : "Understanding the author's purpose or perspective",
            'Making inferences beyond the literal meaning',
            'Connecting themes across the text',
          ];

          QG_Q1 = {
            type: 'multi-select',
            text: `What are students finding hardest about ${qgShortTopic}?`,
            options: q1Options,
          };

          QG_Q2 = {
            type: 'single-select',
            text: `What do you want this ${resourceLabel.toLowerCase()} to do?`,
            options: [
              `Check if students understood ${qgShortTopic}`,
              'Help students practice and apply what they learned',
              'Prep them for an upcoming assessment',
              'Catch who needs more support before moving on',
            ],
          };
        }

        const currentCard = quizGenPhase === 'q1' ? QG_Q1 : quizGenPhase === 'q2' ? QG_Q2 : null;
        // Only show "you told me" summary after the output has loaded — not during generation
        const showSummary = quizGenPhase === 'done' && !qgFormsLoading && sourcesReady;
        // Don't show the generic loading shimmer during chip refinements — the iteration shimmer handles that
        const showLoading = !qgUserReply && (quizGenPhase !== 'done' || !sourcesReady);

        // Sources badge
        const CIRC = (2 * Math.PI * 9.5).toFixed(1);
        const sourcesTabActive = quizGenTab === 'Sources';
        const sourcesBadge = (() => {
          if (sourcesViewed) {
            return <span style={{ width: 22, height: 22, borderRadius: '50%', background: sourcesTabActive ? '#ECEBE9' : '#DAD9D4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#475467', fontWeight: 400, flexShrink: 0, marginLeft: 4 }}>11</span>;
          }
          if (sourcesReady) {
            return <span style={{ width: 22, height: 22, borderRadius: '50%', background: sourcesTabActive ? '#06465C' : '#DAD9D4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: sourcesTabActive ? '#fff' : '#475467', fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>11</span>;
          }
          return (
            <span style={{ position: 'relative', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4, verticalAlign: 'middle' }}>
              <style>{`@keyframes qg-arc{from{stroke-dashoffset:${CIRC}}to{stroke-dashoffset:0}}`}</style>
              <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute' }}>
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#E2E1DE" strokeWidth="2.5"/>
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="#06465C" strokeWidth="2.5"
                  strokeDasharray={CIRC} strokeDashoffset={CIRC} strokeLinecap="round"
                  transform="rotate(-90 12 12)"
                  style={{ animation: 'qg-arc 12s linear forwards' }}/>
              </svg>
              <span style={{ fontSize: 9, fontWeight: 400, color: '#475467', lineHeight: 1, position: 'relative' }}>11</span>
            </span>
          );
        })();

        // Sources accordion data — fully tied to user context
        const showStudentNeeds = quizGenAnswers.length > 0 || quizGenQ1Sels.length > 0;
        const struggle = quizGenAnswers[0]?.a || (quizGenQ1Sels.length > 0 ? quizGenQ1Sels.join(', ') : '');
        const goal = quizGenAnswers[1]?.a || '';
        const needsSummary = struggle
          ? `Students are struggling with: ${struggle}.${goal ? ` Goal: ${goal}.` : ''}`
          : `Students need support with ${qgShortTopic}.`;
        // Sync editable needs text when summary changes (first time)
        const needsDisplayText = qgNeedsText || needsSummary;

        // Pick a teaching strategy based on what we know
        const qgStrategy = pickStrategy(qgSubject, struggle, goal);

        // Curriculum docs: lead with the page context source if available
        const curriculumDocs = [
          qgPageTitle
            ? { svg: '/icons/Docs.svg', name: qgPageTitle }
            : { svg: '/icons/Docs.svg', name: `${qgShortTopic} — Teacher Guide` },
          { svg: '/icons/PDF.svg', name: `${qgGrade} Grade ${qgSubject} Strategies` },
          { svg: '/icons/Docs.svg', name: `${qgSubject} Anchor Charts` },
        ];

        // District guidance docs tied to detected strategy
        const districtDocs = [
          { svg: '/icons/Docs.svg', name: `${qgStrategy.name} Guidance` },
          { svg: '/icons/PDF.svg', name: `${qgSubject} Scaffolds` },
        ];

        // Student data tied to subject
        const studentDataRows = [
          `Class avg: 78% (${qgShortTopic} — Unit Pre-Assessment)`,
          `Class avg: 75% (${qgSubject} — Prior Unit)`,
        ];

        const qgSources = [
          ...(showStudentNeeds ? [{ id: 'needs', label: 'Student Needs & Goals', count: 3, icon: '/icons/Diploma.svg',
            content: (
              <div style={{ borderTop: '1px solid #E2E1DE', margin: '0 -14px', padding: '12px 14px 12px' }}>
                <textarea
                  value={needsDisplayText}
                  onChange={e => setQgNeedsText(e.target.value)}
                  placeholder="Describe student needs and goals…"
                  style={{ width: '100%', minHeight: 90, fontSize: 13, color: C.slate700, lineHeight: '20px', background: '#fff', border: '1px solid #E2E1DE', borderRadius: 8, padding: '10px 12px', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ) }] : []),
          { id: 'curriculum', label: 'Curriculum', count: curriculumDocs.length, icon: '/icons/CI Lightening.svg',
            content: (
              <div style={{ borderTop: '1px solid #E2E1DE', margin: '0 -14px', padding: '12px 14px 12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                  {[...curriculumDocs].sort((a, b) => a.name.length - b.name.length).map(d => (
                    <div key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, paddingLeft: 8, paddingRight: 6, background: '#fff', border: '1px solid #E2E1DE', borderRadius: 8, flex: '0 0 auto', maxWidth: '100%' }}>
                      <img src={d.svg} width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#0E151C', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
                        <img src="/icons/Close.svg" width={12} height={12} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                      </button>
                    </div>
                  ))}
                </div>
                <AddTertiaryBtn style={{ marginTop: 12 }} />
              </div>
            ) },
          { id: 'standards', label: 'Standards', count: 4, icon: '/icons/Standards.svg',
            content: (
              <div style={{ borderTop: '1px solid #E2E1DE', margin: '0 -14px', padding: '12px 14px 12px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {['RL 2.3', 'RL 2.4', 'RL 2.6', 'RL 2.8'].sort((a, b) => a.length - b.length).map(s => (
                    <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px', background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: 6, fontSize: 12, color: '#0E151C' }}>
                      {s}
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <img src="/icons/Close.svg" width={10} height={10} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                      </button>
                    </span>
                  ))}
                </div>
                <AddTertiaryBtn style={{ marginTop: 8 }} />
              </div>
            ) },
          { id: 'district', label: 'District Guidance', count: districtDocs.length, icon: '/icons/School.svg',
            content: (
              <div style={{ borderTop: '1px solid #E2E1DE', margin: '0 -14px', padding: '12px 14px 12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                  {[...districtDocs].sort((a, b) => a.name.length - b.name.length).map(d => (
                    <div key={d.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, paddingLeft: 8, paddingRight: 6, background: '#fff', border: '1px solid #E2E1DE', borderRadius: 8, flex: '0 0 auto', maxWidth: '100%' }}>
                      <img src={d.svg} width={16} height={16} alt="" style={{ display: 'block', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#0E151C', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: 4 }}>
                        <img src="/icons/Close.svg" width={12} height={12} alt="Remove" style={{ display: 'block', opacity: 0.4 }} />
                      </button>
                    </div>
                  ))}
                </div>
                <AddTertiaryBtn style={{ marginTop: 12 }} />
              </div>
            ) },
          { id: 'data', label: 'Student Data', count: studentDataRows.length, icon: '/icons/Graph.svg',
            content: (
              <div style={{ borderTop: '1px solid #E2E1DE', margin: '0 -14px', padding: '12px 14px 12px' }}>
                {studentDataRows.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <div style={{ width: 16, height: 16, background: '#1B6B6B', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: C.slate700, lineHeight: '20px' }}>{d}</span>
                  </div>
                ))}
              </div>
            ) },
        ];
        const sourcesCount = qgSources.reduce((s, c) => s + c.count, 0);

        return (
          <>
            {/* Header bar + segmented control */}
            <div style={{ background: '#FAF9F6', borderRadius: '12px 12px 0 0', flexShrink: 0, borderBottom: `1px solid ${C.slate200}` }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, gap: 8 }}>
                <ModalBackBtn onClick={() => setScreen(1)} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.slate900, textAlign: 'center', letterSpacing: '-0.01em' }}>{resourceLabel}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <ModalMenuBtn />
                  <ModalCloseBtn onClick={handleClose} />
                </div>
              </div>
              {/* Segmented control — inside header */}
              <div style={{ padding: '0 24px 12px' }}>
                <div style={{ display: 'flex', background: '#EEEDE9', borderRadius: 10, padding: 4, height: 40 }}>
                  {['Overview', 'Sources'].map(tab => {
                    const isActive = quizGenTab === tab;
                    return (
                      <button key={tab} onClick={() => { setQuizGenTab(tab); if (tab === 'Sources') setSourcesViewed(true); }}
                        style={{ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? C.slate900 : C.slate500, background: isActive ? '#fff' : 'transparent', border: 'none', outline: 'none', borderRadius: 8, boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'background 0.15s' }}>
                        {tab}
                        {tab === 'Sources' && sourcesBadge}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* OVERVIEW TAB */}
            {quizGenTab === 'Overview' && (
              <>
                <div ref={qgScrollRef} className="scroll-area" style={{ flex: 1, overflowY: 'auto', background: '#FAF9F6' }}>
                  <div style={{ padding: '20px 24px 8px' }}>

                    {/* ── HISTORY (oldest first, natural order) ── */}
                    {topic && (
                      <div className="msg-slide" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <div style={{ background: '#E9E8E6', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                          {topic}
                        </div>
                      </div>
                    )}
                    {quizGenAnswers.map((pair, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <div style={{ background: '#E9E8E6', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                          <div style={{ marginBottom: 6 }}>Q: {pair.q}</div>
                          <div>A: {pair.a}</div>
                        </div>
                      </div>
                    ))}

                    {/* ── LATEST CONTENT (newest at bottom) ── */}

                    {/* Loading shimmer */}
                    {showLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingTop: 8 }}>
                        <BriskLogo size={20} style={{ animation: 'shimmer 1.6s ease-in-out infinite', opacity: 0.7 }} />
                        <span key={quizGenPhase === 'q1' || quizGenPhase === 'q2' ? quizGenLoadingIdx : 'finalizing'} className="fade-in" style={{ fontSize: 13, color: C.slate500, fontStyle: 'italic', animation: 'shimmer 1.6s ease-in-out infinite, fadeIn 0.15s ease-out both' }}>
                          {(quizGenPhase === 'answered' || quizGenPhase === 'done')
                            ? `Almost ready — finalizing your ${resourceLabel}…`
                            : QUIZ_GEN_LOADING_MSGS[quizGenLoadingIdx % QUIZ_GEN_LOADING_MSGS.length]}
                        </span>
                      </div>
                    )}

                    {/* AI summary + iteration */}
                    {showSummary && (
                      <>
                        {/* Summary text */}
                        <div ref={qgSummaryRef} className="fade-in" style={{ fontSize: 14, color: C.slate700, lineHeight: '22px', marginBottom: 16, paddingTop: 8 }}>
                          {(() => {
                            const districtStrat = strategy;
                            const teacherScaffoldList = activeScaffolds.map(s => s.text.trim()).filter(Boolean);
                            const hasDistrict = !!districtStrat;
                            const hasTeacher = teacherScaffoldList.length > 0;
                            const needPhrase = struggle ? struggle.toLowerCase() : null;
                            const goalPhrase = goal ? goal.toLowerCase() : null;

                            return (
                              <>
                                {/* Context line */}
                                {needPhrase && (
                                  <div style={{ marginBottom: 10 }}>
                                    Your {resourceLabel.toLowerCase()} is tailored for students struggling with <strong>{needPhrase}</strong>{goalPhrase ? <> with the goal to <strong>{goalPhrase}</strong></> : null}.
                                  </div>
                                )}

                                {/* District instructional strategy */}
                                {hasDistrict && (
                                  <div style={{ marginBottom: hasTeacher ? 8 : 0 }}>
                                    <strong>{districtStrat.name}</strong> is your district&apos;s instructional strategy for {qgSubject || 'this subject'} — {districtStrat.desc}. It&apos;s applied here to give students a consistent, familiar structure as they work through {qgShortTopic || 'this content'}.
                                  </div>
                                )}

                                {/* Teacher scaffolds */}
                                {hasTeacher && (
                                  <div style={{ marginTop: hasDistrict ? 0 : 0 }}>
                                    {teacherScaffoldList.length === 1
                                      ? <><strong>{teacherScaffoldList[0]}</strong> is also included to further support student access.</>
                                      : <>Also included: {teacherScaffoldList.map((s, i) => <span key={i}><strong>{s}</strong>{i < teacherScaffoldList.length - 1 ? ', ' : ''}</span>)}.</>
                                    }
                                  </div>
                                )}

                                {/* Fallback — no district or teacher scaffolds */}
                                {!hasDistrict && !hasTeacher && (
                                  <div>
                                    {needPhrase
                                      ? <>I used the <strong>{qgStrategy.name}</strong> approach — {qgStrategy.desc} — to help address this.</>
                                      : <>Your {resourceLabel.toLowerCase()} on <strong>{topic}</strong> is ready.</>
                                    }
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* Improvement chips */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.slate700, marginBottom: 12 }}>Anything you want to improve?</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(isDocTool
                              ? ['Make it shorter', 'Add more detail', 'Something else']
                              : ['Make it shorter', 'Make it harder', 'Something else']
                            ).map(pill => (
                              <button key={pill} onClick={() => { if (!qgFormsLoading) { setQgIterationHistory(h => [...h, pill]); setQgUserReply(pill); setInput(pill); } }}
                                style={{ padding: '6px 12px', border: `1px solid ${qgUserReply === pill ? C.slate400 : C.slate300}`, borderRadius: 20, background: qgUserReply === pill ? C.slate100 : '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate700, cursor: qgFormsLoading ? 'default' : 'pointer', lineHeight: '20px', opacity: qgFormsLoading && qgUserReply !== pill ? 0.5 : 1 }}>
                                {pill}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* User iteration history bubbles */}
                        {qgIterationHistory.map((msg, i) => (
                          <div key={i} className="msg-slide" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <div style={{ background: '#E9E8E6', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                              {msg}
                            </div>
                          </div>
                        ))}

                        {/* Iteration shimmer — newest, at very bottom */}
                        {qgUserReply && qgFormsLoading && (() => {
                          const r = qgUserReply.toLowerCase();
                          const iterMsgs =
                            /short|fewer|less/.test(r) ? ['Trimming the content…', 'Shortening for your class…', 'Almost done…'] :
                            /hard|rigorous|challeng|difficult|advanced/.test(r) ? ['Raising the difficulty…', 'Adding more rigor…', 'Almost done…'] :
                            /easier|simpl|reading level|lower|accessi|scaffold/.test(r) ? ['Simplifying the language…', 'Adjusting the reading level…', 'Almost done…'] :
                            /longer|more detail|expand|add more|deeper/.test(r) ? ['Adding more depth…', 'Expanding the content…', 'Almost done…'] :
                            /different|new|change|redo|try again/.test(r) ? ['Trying a different approach…', 'Reworking the content…', 'Almost done…'] :
                            /vocab|word|term|definition/.test(r) ? ['Focusing on key vocabulary…', 'Updating the word choices…', 'Almost done…'] :
                            /format|layout|structure/.test(r) ? ['Restructuring the layout…', 'Adjusting the format…', 'Almost done…'] :
                            [`Applying: "${qgUserReply.length > 40 ? qgUserReply.slice(0, 40) + '…' : qgUserReply}"`, 'Revising the content…', 'Almost done…'];
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 }}>
                              <BriskLogo size={20} style={{ opacity: 0.7 }} />
                              <span key={quizGenLoadingIdx} className="fade-in" style={{ fontSize: 13, color: C.slate500, fontStyle: 'italic', animation: 'shimmer 1.6s ease-in-out infinite, fadeIn 0.15s ease-out both' }}>
                                {iterMsgs[quizGenLoadingIdx % iterMsgs.length]}
                              </span>
                            </div>
                          );
                        })()}
                      </>
                    )}

                    {/* Scroll anchor — always at bottom */}
                    <div ref={qgBottomRef} style={{ height: 1 }} />
                  </div>
                </div>

                {/* Bottom: question card or input bar */}
                {currentCard ? (
                  <div style={{ flexShrink: 0, padding: '4px 24px 16px' }}>
                    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)', padding: '12px 12px 16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.slate900, lineHeight: '22px' }}>{currentCard.text}</div>
                      <div style={{ fontSize: 12, lineHeight: '18px', color: '#475467', fontWeight: 400, marginTop: 2, marginBottom: 12 }}>
                        {quizGenPhase === 'q1' ? '1' : '2'} of 2
                      </div>

                      {/* Multi-select (Q1) — checkbox squares */}
                      {currentCard.type === 'multi-select' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {currentCard.options.map((opt) => {
                            const sel = quizGenQ1Sels.includes(opt);
                            return (
                              <button key={opt} onClick={() => setQuizGenQ1Sels(prev => sel ? prev.filter(x => x !== opt) : [...prev, opt])}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', padding: '10px 0', border: 'none', outline: 'none', borderRadius: 8, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: C.slate900, cursor: 'pointer', textAlign: 'left' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 2, border: sel ? 'none' : '1.5px solid #CACED1', background: sel ? '#1B6B6B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {sel && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ flex: 1 }}>{opt}</span>
                              </button>
                            );
                          })}
                          {/* Other option */}
                          <button onClick={() => { setQgQ1OtherActive(true); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', padding: '10px 0', border: 'none', outline: 'none', borderRadius: 8, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: C.slate900, cursor: 'pointer', textAlign: 'left' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 2, border: (qgQ1OtherActive && qgQ1OtherText) ? 'none' : '1.5px solid #CACED1', background: (qgQ1OtherActive && qgQ1OtherText) ? '#1B6B6B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {(qgQ1OtherActive && qgQ1OtherText) && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            {qgQ1OtherActive ? (
                              <input
                                autoFocus
                                value={qgQ1OtherText}
                                onChange={e => setQgQ1OtherText(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && qgQ1OtherText.trim()) {
                                    e.preventDefault();
                                    const val = qgQ1OtherText.trim();
                                    setQuizGenQ1Sels(prev => prev.includes(val) ? prev : [...prev, val]);
                                    setQgQ1OtherActive(false);
                                  }
                                  if (e.key === 'Escape') { setQgQ1OtherActive(false); setQgQ1OtherText(''); }
                                }}
                                placeholder="Describe another challenge…"
                                style={{ flex: 1, border: 'none', outline: 'none', borderBottom: `1px solid ${C.slate300}`, fontSize: 14, fontFamily: 'inherit', color: C.slate900, background: 'transparent', padding: '0 0 2px' }}
                              />
                            ) : (
                              <span style={{ flex: 1, color: C.slate500 }}>Other</span>
                            )}
                          </button>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <button onClick={() => { setQuizGenAnswers([]); setQuizGenPhase('q2'); }}
                              style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate200}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate400, cursor: 'pointer' }}>Skip</button>
                            <button onClick={() => {
                              const sels = [...quizGenQ1Sels];
                              if (qgQ1OtherActive && qgQ1OtherText.trim() && !sels.includes(qgQ1OtherText.trim())) sels.push(qgQ1OtherText.trim());
                              const a = sels.length > 0 ? sels.join(', ') : '—';
                              setQuizGenAnswers([{ q: currentCard.text, a }]);
                              setQuizGenPhase('q2');
                            }} style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate300}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: C.slate900, cursor: 'pointer' }}>Next</button>
                          </div>
                        </div>
                      )}

                      {/* Single-select (Q2) — default first option, selection → Finish */}
                      {currentCard.type === 'single-select' && (() => {
                        const q2Sel = quizGenQ2 || currentCard.options[0];
                        const q2IsOther = q2Sel === '__other__';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {currentCard.options.map((opt) => {
                              const isSel = q2Sel === opt;
                              return (
                                <button key={opt} onClick={() => {
                                  setQuizGenQ2(opt);
                                  setQgQ2OtherActive(false);
                                  setQuizGenAnswers(prev => [...prev, { q: currentCard.text, a: opt }]);
                                  setQuizGenPhase('answered');
                                }}
                                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F7F6F4'; }}
                                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', border: 'none', outline: 'none', borderRadius: 8, background: isSel ? '#F0EFED' : 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: C.slate900, cursor: 'pointer', textAlign: 'left' }}>
                                  <span>{opt}</span>
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: isSel ? 1 : 0, transition: 'opacity 0.1s', flexShrink: 0 }}>
                                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#0E151C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              );
                            })}
                            {/* Other option */}
                            <button onClick={() => { setQuizGenQ2('__other__'); setQgQ2OtherActive(true); }}
                              onMouseEnter={e => { if (!q2IsOther) e.currentTarget.style.background = '#F7F6F4'; }}
                              onMouseLeave={e => { if (!q2IsOther) e.currentTarget.style.background = 'transparent'; }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', border: 'none', outline: 'none', borderRadius: 8, background: q2IsOther ? '#F0EFED' : 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: C.slate900, cursor: 'pointer', textAlign: 'left' }}>
                              {qgQ2OtherActive ? (
                                <input
                                  autoFocus
                                  value={qgQ2OtherText}
                                  onChange={e => setQgQ2OtherText(e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && qgQ2OtherText.trim()) {
                                      e.preventDefault();
                                      const val = qgQ2OtherText.trim();
                                      setQuizGenAnswers(prev => [...prev, { q: currentCard.text, a: val }]);
                                      setQuizGenPhase('answered');
                                    }
                                    if (e.key === 'Escape') { setQgQ2OtherActive(false); setQgQ2OtherText(''); setQuizGenQ2(currentCard.options[0]); }
                                  }}
                                  placeholder="Describe your goal…"
                                  style={{ flex: 1, border: 'none', outline: 'none', borderBottom: `1px solid ${C.slate300}`, fontSize: 14, fontFamily: 'inherit', color: C.slate900, background: 'transparent', padding: '0 0 2px' }}
                                />
                              ) : (
                                <span style={{ color: q2IsOther ? C.slate900 : C.slate500 }}>Other</span>
                              )}
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: q2IsOther ? 1 : 0, transition: 'opacity 0.1s', flexShrink: 0 }}>
                                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#0E151C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                              <button onClick={() => { setQuizGenAnswers(prev => [...prev, { q: currentCard.text, a: '—' }]); setQuizGenPhase('answered'); }}
                                style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate200}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate400, cursor: 'pointer' }}>Skip</button>
                              <button onClick={() => {
                                const a = q2IsOther ? (qgQ2OtherText.trim() || '—') : q2Sel;
                                setQuizGenAnswers(prev => [...prev, { q: currentCard.text, a }]);
                                setQuizGenPhase('answered');
                              }} style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate300}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: C.slate900, cursor: 'pointer' }}>Finish</button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <BottomInputBar placeholder={sourcesReady ? "Share what you'd like to revise" : "Share more details"} value={input} onChange={setInput} onSubmit={() => {
                    const val = input.trim();
                    if (!val) return;
                    setQgUserReply(val);
                    setInput('');
                    setQgIterationHistory(h => [...h, val]);
                  }} disabled={false} />
                )}
              </>
            )}

            {/* SOURCES TAB */}
            {quizGenTab === 'Sources' && (
              <>
                <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 8px', background: '#FAF9F6' }}>
                  {qgSources.map(section => (
                    <div key={section.id} style={{ background: '#fff', border: '1px solid #E2E1DE', borderRadius: 10, marginBottom: 8, padding: '14px 14px 0', overflow: 'hidden' }}>
                      <button onClick={() => setQuizGenExpandedSource(quizGenExpandedSource === section.id ? null : section.id)}
                        style={{ width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '0 0 14px' }}>
                        <img src={section.icon} width={28} height={28} alt="" style={{ display: 'block', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.slate900, lineHeight: '22px' }}>{section.label}</div>
                          <div style={{ fontSize: 12, color: C.slate500, lineHeight: '18px' }}>{section.count} sources</div>
                        </div>
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ flexShrink: 0, transform: quizGenExpandedSource === section.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                          <path d="M1 1.5L6 6.5L11 1.5" stroke={C.slate400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {quizGenExpandedSource === section.id && section.content}
                    </div>
                  ))}
                  <div style={{ padding: '4px 0 12px' }}>
                    <button style={{ width: '100%', padding: '10px 0', border: `1px solid ${C.slate200}`, borderRadius: 8, background: 'none', fontFamily: 'inherit', fontSize: 14, color: C.slate700, cursor: 'pointer' }}>+ Add Source</button>
                  </div>
                </div>
              </>
            )}
          </>
        );
      })()}

      {/* ── CHAT DETAIL SCREEN ── */}
      {screen === 'chat' && (() => {
        const qs = CHAT_QUESTION_SETS[chatToolName] || CHAT_QUESTION_SETS['Ask Brisk'];
        const allAnswered = chatCurrentQ >= qs.length;
        const currentQ = !allAnswered ? qs[chatCurrentQ] : null;
        const totalQ = qs.length;

        // Default selection: first option of current single-select question
        const currentQFirstOpt = (!allAnswered && currentQ?.type === 'single-select') ? currentQ.options[0] : '';
        const chatSel = chatQCurrentSel || currentQFirstOpt;

        function answerQ(answer) {
          const q = qs[chatCurrentQ];
          setChatAnswers(prev => [...prev, { q: q.text, a: answer }]);
          setChatCurrentQ(prev => prev + 1);
          setChatOpenTextVal('');
          setChatQCurrentSel('');
          setChatOtherMode(false);
          setChatOtherText('');

          // After last question, check if the accumulated answers imply a tool+topic
          const isLastQ = chatCurrentQ >= qs.length - 1;
          if (isLastQ) {
            const allText = [chatInitialPrompt, ...chatAnswers.map(a => a.a), answer].join(' ');
            const detected = detectToolAndTopic(allText);
            if (detected) {
              setChatIsRouting(true);
              setChatRoutingTarget(detected);
            }
          }
        }

        return (
          <>
            {/* Header */}
            <div style={{ background: '#FAF9F6', borderRadius: '12px 12px 0 0', borderBottom: `1px solid ${C.slate200}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 52, gap: 8 }}>
                <ModalBackBtn onClick={() => setScreen('welcome')} />
                <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.slate900, textAlign: 'center', letterSpacing: '-0.01em' }}>{chatToolName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <ModalMenuBtn />
                  <ModalCloseBtn onClick={handleClose} />
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="scroll-area" style={{ flex: 1, overflowY: 'auto', background: '#FAF9F6', padding: '16px 24px 8px' }}>
              {/* Ask Anything: Brisk starter message */}
              {chatToolName === 'Ask Anything' && !chatInitialPrompt && chatAnswers.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <BriskLogo size={20} />
                  <div style={{ background: '#fff', border: `1px solid ${C.slate200}`, borderRadius: '0 12px 12px 12px', padding: '10px 14px', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                    What do you need help with?
                  </div>
                </div>
              )}

              {/* User's original prompt — right-aligned bubble */}
              {chatInitialPrompt ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ background: '#E9E8E6', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                    {chatInitialPrompt}
                  </div>
                </div>
              ) : null}

              {/* Completed Q&A + free-text chat messages */}
              {chatAnswers.map((pair, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <div style={{ background: '#E9E8E6', borderRadius: 12, padding: '10px 14px', maxWidth: '80%', fontSize: 14, color: C.slate900, lineHeight: '21px' }}>
                    {pair.q ? <><div style={{ marginBottom: 8 }}>Q: {pair.q}</div><div>A: {pair.a}</div></> : pair.a}
                  </div>
                </div>
              ))}

              {/* Routing shimmer — detected tool+topic, transitioning to creation screen */}
              {chatIsRouting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <BriskLogo size={20} style={{ animation: 'shimmer 1.6s ease-in-out infinite', opacity: 0.7 }} />
                  <span className="fade-in" style={{ fontSize: 13, color: C.slate500, fontStyle: 'italic', animation: 'shimmer 1.6s ease-in-out infinite, fadeIn 0.15s ease-out both' }}>
                    Got it — taking you to the {chatRoutingTarget?.label || 'tool'} creator…
                  </span>
                </div>
              )}

              {/* Loading shimmer */}
              {!chatIsRouting && allAnswered && (chatAnswers.length > 0 || chatInitialPrompt) && (() => {
                const msgs = CHAT_LOADING_MSGS[chatToolName] || CHAT_LOADING_MSGS['Ask Brisk'];
                const msg = msgs[chatLoadingMsgIdx % msgs.length];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, animation: 'shimmer 1.6s ease-in-out infinite' }}>
                    <BriskLogo size={20} />
                    <span style={{ fontSize: 13, color: C.slate500, fontStyle: 'italic' }}>{msg}</span>
                  </div>
                );
              })()}

            </div>

            {/* Bottom area — question card replaces input bar while questions remain */}
            {currentQ && !chatIsRouting ? (
              <div style={{ flexShrink: 0, padding: '4px 24px 16px' }}>
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)', padding: '12px 12px 16px' }}>

                  {/* Question + counter */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.slate900, lineHeight: '22px' }}>
                    {currentQ.text}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: '18px', color: '#475467', fontWeight: 400, marginTop: 2, marginBottom: 12 }}>
                    {chatCurrentQ + 1} of {totalQ}
                  </div>

                  {/* Single-select options — click once to submit; "Something else" opens inline text */}
                  {currentQ.type === 'single-select' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {currentQ.options.map((opt) => {
                        const isOther = opt === 'Something else';
                        return (
                          <button key={opt}
                            onClick={() => isOther ? setChatOtherMode(true) : answerQ(opt)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 10px', border: 'none', outline: 'none', borderRadius: 8, background: (chatOtherMode && isOther) ? '#F0EFED' : 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, color: C.slate900, cursor: 'pointer', textAlign: 'left' }}>
                            <span>{isOther ? 'Other' : opt}</span>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: isOther && chatOtherMode ? 1 : 0, flexShrink: 0 }}>
                              <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke={C.slate400} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        );
                      })}
                      {/* Inline text for "Other" */}
                      {chatOtherMode && (
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input
                            autoFocus
                            value={chatOtherText}
                            onChange={e => setChatOtherText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && chatOtherText.trim()) answerQ(chatOtherText.trim()); }}
                            placeholder="Type what you mean…"
                            style={{ border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: C.slate900, background: '#FAF9F6', outline: 'none', lineHeight: '20px' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => { setChatOtherMode(false); setChatOtherText(''); }}
                              style={{ height: 32, padding: '0 16px', borderRadius: 20, border: `1px solid ${C.slate200}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate400, cursor: 'pointer' }}>
                              Cancel
                            </button>
                            <button onClick={() => { if (chatOtherText.trim()) answerQ(chatOtherText.trim()); }}
                              style={{ height: 32, padding: '0 16px', borderRadius: 20, border: `1px solid ${C.slate300}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: C.slate900, cursor: 'pointer', opacity: chatOtherText.trim() ? 1 : 0.4 }}>
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Open-text */}
                  {currentQ.type === 'open-text' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={chatOpenTextVal}
                        onChange={e => setChatOpenTextVal(e.target.value)}
                        placeholder={currentQ.placeholder}
                        rows={3}
                        style={{ width: '100%', border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: C.slate900, background: '#FAF9F6', outline: 'none', resize: 'none', lineHeight: '20px', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => answerQ('—')}
                          style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate200}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, color: C.slate400, cursor: 'pointer' }}>
                          Skip
                        </button>
                        <button onClick={() => answerQ(chatOpenTextVal || '—')}
                          style={{ height: 36, padding: '0 20px', borderRadius: 20, border: `1px solid ${C.slate300}`, background: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, color: C.slate900, cursor: 'pointer' }}>
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Pinned bottom input bar — shown only after all questions answered */
              <div style={{ flexShrink: 0, background: '#FAF9F6', padding: '8px 24px 10px' }}>
                <div style={{ border: `1px solid ${C.slate200}`, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 52 }}>
                  <button className="icon-btn" style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0, padding: 0 }}>
                    <img src="/icons/Add.svg" width={22} height={22} alt="Add" style={{ display: 'block' }} />
                  </button>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Tell me more"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 400, color: C.slate900, background: 'transparent', fontFamily: 'inherit', padding: 0, margin: 0, lineHeight: 'normal', display: 'block' }}
                  />
                  {chatInput.trim() ? (
                    <button onClick={() => { if (chatInput.trim()) { setChatAnswers(prev => [...prev, { q: '', a: chatInput.trim() }]); setChatInput(''); } }} style={{ width: 40, height: 40, borderRadius: '50%', background: '#06465C', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 12 12" fill="none"><path d="M6 9.5V2.5M6 2.5L3 5.5M6 2.5L9 5.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  ) : (
                    <MicButton size={22} className="icon-btn" onTranscript={(t) => setChatInput(t)} />
                  )}
                </div>
              </div>
            )}
          </>
        );
      })()}

    </div>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={outerStyle}>
      {/* Quiz-gen docked: document preview fills full viewport, panel overlays on right */}
      {isDockedRight && (() => {
        const slidesDefault = screenOneToolLabel?.toLowerCase().includes('presentation') || screenOneToolLabel?.toLowerCase().includes('slide');
        const effectiveDocFmt = prefs.docFormat || (slidesDefault ? 'Slides' : 'Docs');
        const isSlidesTool = screenOneToolType === 'doc' && effectiveDocFmt === 'Slides';
        const isDocOutputTool = screenOneToolType === 'doc' || prefs.platform === 'Docs';
        const bgColor = isSlidesTool ? '#1e1e1e' : isDocOutputTool ? '#f1f3f4' : '#f0ebff';
        const outTitle = qgQuizData?.title || `${topic} ${screenOneToolLabel || 'Quiz'}`;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflowY: isSlidesTool ? 'hidden' : 'auto', background: bgColor }}>
            {qgFormsLoading ? (
              /* Skeleton */
              isSlidesTool ? (
                /* Slides skeleton — dark, slide-strip + slide */
                <div style={{ display: 'flex', height: '100%' }}>
                  <style>{`@keyframes skAqua{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
                  <div style={{ width: 160, background: '#2d2d2d', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ background: '#3a3a3a', borderRadius: 3, padding: 3 }}>
                        <div style={{ aspectRatio: '16/9', backgroundImage: 'linear-gradient(90deg,#3a3a3a 0%,#4a5a6a 50%,#3a3a3a 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.8s ease-in-out ${i * 0.15}s infinite`, borderRadius: 2 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ width: '100%', maxWidth: 800, aspectRatio: '16/9', background: '#2a2a2a', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', borderRadius: 3, padding: '10%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
                      <div style={{ height: 32, borderRadius: 4, width: '60%', backgroundImage: 'linear-gradient(90deg,#3a3a3a 0%,#4a6a7a 50%,#3a3a3a 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.8s ease-in-out infinite' }} />
                      <div style={{ height: 16, borderRadius: 4, width: '40%', backgroundImage: 'linear-gradient(90deg,#3a3a3a 0%,#4a6a7a 50%,#3a3a3a 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.8s ease-in-out 0.1s infinite' }} />
                    </div>
                  </div>
                </div>
              ) : isDocOutputTool ? (
                /* Doc skeleton — white page on grey */
                <div style={{ padding: '0 0 80px' }}>
                  <style>{`@keyframes skAqua{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
                  <div style={{ background: '#fff', height: 56, borderBottom: '1px solid #e0e0e0', marginBottom: 0 }} />
                  <div style={{ background: '#fff', height: 36, borderBottom: '1px solid #e0e0e0', marginBottom: 32 }} />
                  <div style={{ maxWidth: 816, margin: '0 auto', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', padding: '96px 96px 60px', minHeight: 600 }}>
                    <div style={{ height: 28, borderRadius: 4, width: '55%', marginBottom: 32, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.6s ease-in-out infinite' }} />
                    {[95,88,72,90,65,80,94,70].map((w, i) => (
                      <div key={i} style={{ height: 13, borderRadius: 4, width: `${w}%`, marginBottom: 14, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.6s ease-in-out ${i * 0.07}s infinite` }} />
                    ))}
                    <div style={{ marginTop: 32 }}>
                      <div style={{ height: 18, borderRadius: 4, width: '30%', marginBottom: 16, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.6s ease-in-out 0.5s infinite' }} />
                      {[85,60,78,55].map((w, i) => (
                        <div key={i} style={{ height: 13, borderRadius: 4, width: `${w}%`, marginBottom: 14, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.6s ease-in-out ${0.6 + i * 0.07}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Forms skeleton — cards */
                <div style={{ padding: '32px 28px 80px', maxWidth: 680, margin: '0 auto' }}>
                  <style>{`@keyframes skAqua{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
                  <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 12, border: '1px solid #e8e8e8' }}>
                    <div style={{ height: 8, backgroundImage: 'linear-gradient(90deg,#e2e2e2 0%,#CAFCF4 50%,#e2e2e2 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.6s ease-in-out infinite' }} />
                    <div style={{ padding: '22px 24px 18px' }}>
                      <div style={{ height: 26, borderRadius: 4, width: '65%', marginBottom: 10, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.6s ease-in-out 0s infinite' }} />
                      <div style={{ height: 13, borderRadius: 4, width: '38%', backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: 'skAqua 1.6s ease-in-out 0.08s infinite' }} />
                    </div>
                  </div>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ background: '#fff', borderRadius: 8, border: '1px solid #e8e8e8', padding: '18px 24px', marginBottom: 10 }}>
                      <div style={{ height: 14, borderRadius: 4, width: `${65 + i * 4}%`, marginBottom: 14, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.6s ease-in-out ${i * 0.1}s infinite` }} />
                      {[1,2,3,4].map(j => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, backgroundImage: 'linear-gradient(90deg,#e4e4e4 0%,#CAFCF4 50%,#e4e4e4 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.6s ease-in-out ${j * 0.06}s infinite` }} />
                          <div style={{ height: 12, borderRadius: 4, width: `${38 + j * 10}%`, backgroundImage: 'linear-gradient(90deg,#ececec 0%,#CAFCF4 50%,#ececec 100%)', backgroundSize: '600px 100%', animation: `skAqua 1.6s ease-in-out ${j * 0.06 + 0.04}s infinite` }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )
            ) : isSlidesTool ? (
              <GoogleSlidesPreview quiz={qgQuizData} title={outTitle} />
            ) : isDocOutputTool ? (
              <GoogleDocPreview quiz={qgQuizData} title={outTitle} />
            ) : (
              <GoogleFormsPreview quiz={qgQuizData} title={outTitle} />
            )}
          </div>
        );
      })()}

      {/* Quiz (old flow) — fixed full-screen scrollable behind panel */}
      {quizExists && !isDockedRight && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflowY: 'auto' }}>
          <GoogleFormsPreview quiz={activeQuiz} title={quizTitle} key={activeVersionIdx} />
        </div>
      )}

      {/* Background (only when no quiz yet) */}
      {!quizExists && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {pageContext?.type === 'screenshot' ? (
            <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
              <img src={pageContext.imageDataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)' }} />
            </div>
          ) : pageContextLoading ? (
            <SkeletonBackground />
          ) : pageContext?.type === 'url' ? (
            <ReaderModeBackground ctx={pageContext} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'linear-gradient(to bottom, #f9f9f9, #efefef)' }}>
              <div style={{ width: 680, height: '80vh', background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.15)', borderRadius: 2, padding: 60, overflow: 'hidden' }}>
                <div style={{ height: 16, background: '#e0e0e0', borderRadius: 3, marginBottom: 12, width: '60%' }} />
                {[90, 85, 75, 80, 88, 70, 83].map((w, i) => <div key={i} style={{ height: 12, background: '#ebebeb', borderRadius: 3, marginBottom: 8, width: `${w}%` }} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Brisk FAB + context bar — visible when panel is closed */}
      {!isOpen && (
        <>
          <button
            onClick={() => setIsOpen(true)}
            title="Open Brisk (⌘K)"
            style={{ position: 'fixed', bottom: 24, right: 24, width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#0E151C', boxShadow: '0 4px 16px rgba(0,0,0,0.28)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 4 }}>
            <img src="/icons/Brisk Logo.svg" width={28} height={28} alt="Brisk" style={{ display: 'block' }} />
          </button>

          {/* Page context bar — top of page, only when panel is closed */}
          {!quizExists && (
            <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 10px 6px 8px', minWidth: 320, maxWidth: 480 }}>
                {pageContext ? (
                  <>
                    {pageContext.type === 'url'
                      ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3"/><path d="M7 1c0 0-3 2.5-3 6s3 6 3 6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/><path d="M7 1c0 0 3 2.5 3 6s-3 6-3 6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 7h12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><rect x="1" y="2" width="12" height="10" rx="1.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/><circle cx="7" cy="7" r="1.8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/></svg>
                    }
                    <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>{pageContext.title || pageContext.url || 'Screenshot context'}</span>
                    <button onClick={() => { setPageContext(null); setPageUrl(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </button>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}><circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3"/><path d="M7 1c0 0-3 2.5-3 6s3 6 3 6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round"/><path d="M7 1c0 0 3 2.5 3 6s-3 6-3 6" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 7h12" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <input
                      type="url"
                      value={pageUrl}
                      onChange={e => { setPageUrl(e.target.value); if (!e.target.value.trim()) setPageContext(null); }}
                      onKeyDown={e => { if (e.key === 'Enter' && pageUrl.trim()) handleFetchPage(pageUrl.trim()); }}
                      placeholder="Paste URL to simulate page context…"
                      className="url-bar-input"
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, color: 'rgba(255,255,255,0.9)', background: 'transparent', fontFamily: 'inherit', lineHeight: '20px', minWidth: 0 }}
                    />
                    {pageContextLoading && <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#22c55e', animation: 'spin 0.75s linear infinite', flexShrink: 0 }} />}
                  </>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontFamily: 'inherit', fontSize: 12, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0.5" y="2.5" width="12" height="9" rx="1.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.1"/><circle cx="6.5" cy="7" r="1.8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.1"/><path d="M4.5 2.5l.7-1.3h2.6l.7 1.3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.1" strokeLinejoin="round"/></svg>
                Screenshot
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleScreenshotUpload(e.target.files[0])} />
            </div>
          )}
        </>
      )}

      {/* Spotlight — overlay + context bar + panel, shown when open */}
      {isOpen && (
        <>
          {/* Dark overlay — hidden when docked right or quiz exists */}
          {!quizExists && !isDockedRight && (
            <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9 }} />
          )}

          {/* CI Panel */}
          {panelContent}
        </>
      )}

      {/* ── Global Add Menu Dropdown — outside panel to avoid transform stacking context ── */}
      {addMenuOpen && (
        <div onMouseLeave={() => setAddMenuOpen(false)} style={{ position: 'fixed', top: addMenuPos.top, left: addMenuPos.left, width: 240, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)', zIndex: 10001, overflow: 'hidden' }}>
          {!pageChipVisible && (
            <>
              <button className="menu-item" onClick={() => { setPageChipVisible(true); setAddMenuOpen(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}><rect width="18" height="18" rx="3" fill="#4285F4"/><rect x="4.5" y="5.5" width="9" height="1.2" rx="0.6" fill="white"/><rect x="4.5" y="8.4" width="9" height="1.2" rx="0.6" fill="white"/><rect x="4.5" y="11.3" width="5.5" height="1.2" rx="0.6" fill="white"/></svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 400, lineHeight: '22px', color: '#0E151C' }}>Add Page Context</div>
                  <div style={{ fontSize: 12, color: '#475467', lineHeight: '17px', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{pageContext?.title || 'Jennifer Wong - Point of View in Summer of M...'}</div>
                </div>
              </button>
              <div style={{ height: 1, background: '#E5E4E2' }} />
            </>
          )}
          {[
            { icon: <img src="/icons/Checklist.svg" width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />, label: 'Add Standards' },
            { icon: <img src="/icons/Lightening Stroke.svg" width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />, label: 'Add Curriculum' },
            { icon: <img src="/icons/Attach.svg" width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />, label: 'Add Files or Photos', dividerAfter: true },
            { icon: <img src="/icons/Time.svg" width={20} height={20} alt="" style={{ display: 'block', flexShrink: 0 }} />, label: 'View Prompt History' },
          ].map(item => (
            <div key={item.label}>
              <button className="menu-item" onClick={() => setAddMenuOpen(false)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 400, lineHeight: '22px', color: '#0E151C', textAlign: 'left' }}>
                {item.icon}{item.label}
              </button>
              {item.dividerAfter && <div style={{ height: 1, background: '#E5E4E2' }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Global Class Picker Dropdown ── */}
      {classPickerOpen && (
        <div onMouseLeave={() => setClassPickerOpen(false)} style={{ position: 'fixed', top: classPickerPos.top, left: classPickerPos.left, width: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)', zIndex: 10001, overflow: 'hidden', padding: '4px 0' }}>
          {CLASSES.map(c => (
            <button key={c.id} className="menu-item" onClick={() => { setSelectedClass(c.id); setClassOverridden(true); const cd = CLASSES.find(x => x.id === c.id); if (cd) setPrefs(p => ({ ...p, grade: cd.grade })); setClassPickerOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              {selectedClass === c.id && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#0E151C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {selectedClass !== c.id && <div style={{ width: 14 }} />}
              <span style={{ fontSize: 13, fontWeight: selectedClass === c.id ? 500 : 400, color: '#0E151C', lineHeight: '20px' }}>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
