'use client';
import { useState, useRef, useEffect } from 'react';

const HISTORY_KEY = 'brisk_prompt_history';
const MAX_HISTORY = 15;

export function savePromptToHistory(text) {
  if (!text?.trim()) return;
  const trimmed = text.trim();
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const deduped = existing.filter(h => h !== trimmed);
    deduped.unshift(trimmed);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped.slice(0, MAX_HISTORY)));
  } catch {}
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function cleanPageTitle(title) {
  return (title || '')
    .replace(/\s*[-–|]\s*(Wikipedia|Khan Academy|YouTube|Quizlet|BrainPOP|Britannica|Newsela|CommonLit|IXL|Desmos|ReadWorks|PBS|National Geographic)[^\n]*/i, '')
    .replace(/\s*[-–|]\s*[^-–|]{3,}$/, '')
    .trim()
    .slice(0, 55);
}

function starterIdeas(toolName, pageContext, pageChipVisible) {
  const title = pageChipVisible ? cleanPageTitle(pageContext?.title) : '';
  const tool = toolName || 'Quiz';

  if (title) {
    return [
      `${tool} on "${title}" for my class`,
      `Check understanding of "${title}"`,
      `Key ideas and vocabulary from "${title}"`,
      `Higher-order thinking ${tool.toLowerCase()} about "${title}"`,
      `${tool} with scaffolding for struggling readers on "${title}"`,
    ];
  }

  const byTool = {
    Quiz: [
      'Quiz on photosynthesis for 8th grade',
      'Comprehension check on The Outsiders — Chapters 1–3',
      'Exit ticket on solving one-step equations',
      'Vocabulary quiz on the American Revolution',
      'Higher-order thinking quiz on climate change',
    ],
    Presentation: [
      'Intro slides on the water cycle for 5th graders',
      'Lesson presentation on the Civil Rights Movement',
      'Interactive slides with discussion stops on fractions',
      'Presentation on plate tectonics with visuals',
    ],
    'Lesson Plan': [
      'Lesson plan on figurative language for 7th grade ELA',
      '5E lesson plan on Newton\'s laws of motion',
      'Differentiated lesson on comparing fractions',
      'Inquiry lesson on causes of World War I',
    ],
    Rubric: [
      'Rubric for a persuasive essay — 8th grade ELA',
      'Project rubric for a science lab report',
      'Presentation rubric with 4 scoring levels',
    ],
    'Guided Notes': [
      'Guided notes on the Civil War with vocabulary blanks',
      'Fill-in-the-blank notes on cell division',
      'Guided notes on the water cycle with diagrams',
    ],
  };

  const base = byTool[tool] || byTool.Quiz;
  return tool === 'Quiz' ? base : base.map(s => s.replace(/quiz/gi, tool));
}

function enhanceIdeas() {
  return [
    'Make it harder with higher-order thinking',
    'Add scaffolding and hints for struggling students',
    'Make it shorter and more focused',
    'Adjust the reading level for ELL students',
    'Add a mix of question types',
    'Differentiate with tiered versions for multiple levels',
    'Ground it in real-world examples and applications',
  ];
}

export default function IntentChips({ toolName, input, onInputChange, pageContext, pageChipVisible, promptBoxRef }) {
  const [openChip, setOpenChip] = useState(null); // null | 'ideas' | 'history'
  const [overlayRect, setOverlayRect] = useState(null);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const [history, setHistory] = useState([]);
  const closeTimerRef = useRef(null);
  const enterTimerRef = useRef(null);
  const containerRef = useRef(null);

  const hasInput = input.trim().length > 0;
  const ideas = hasInput ? enhanceIdeas() : starterIdeas(toolName, pageContext, pageChipVisible);

  function openPanel(name) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (name === 'history') setHistory(getHistory());
    setClosing(false);
    setEntering(true);
    if (promptBoxRef?.current) {
      const r = promptBoxRef.current.getBoundingClientRect();
      setOverlayRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    setOpenChip(name);
    enterTimerRef.current = setTimeout(() => setEntering(false), 16);
  }

  function closePanel() {
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setOpenChip(null);
      setOverlayRect(null);
      setClosing(false);
    }, 200);
  }

  function toggle(name) {
    openChip === name ? closePanel() : openPanel(name);
  }

  useEffect(() => () => { clearTimeout(closeTimerRef.current); clearTimeout(enterTimerRef.current); }, []);

  useEffect(() => {
    if (openChip === null) return;
    function onDown(e) {
      if (overlayRect) {
        const { top, left, width, height } = overlayRect;
        if (!(e.clientX >= left && e.clientX <= left + width && e.clientY >= top && e.clientY <= top + height)) closePanel();
      } else if (containerRef.current && !containerRef.current.contains(e.target)) {
        closePanel();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openChip, overlayRect]);

  const chipBtn = (name, label, icon, active) => (
    <button
      onClick={() => toggle(name)}
      className="intent-chip"
      style={{
        height: 32, padding: '0 10px',
        border: `1px solid ${active ? '#06465C' : '#E5E4E2'}`,
        borderRadius: 999,
        background: active ? '#EEF4F6' : '#fff',
        fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 400,
        color: active ? '#06465C' : '#344054',
        cursor: 'pointer', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
      }}
    >
      {icon}
      {label}
    </button>
  );

  const ideasIcon = (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5.5" r="3.2" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M5.5 10.5h3M6.2 12h1.6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M5.5 9c0-.8-.5-1.5-.5-2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      <path d="M8.5 9c0-.8.5-1.5.5-2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  );

  const historyIcon = (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const rowBtn = (text, onClick, first, last) => (
    <div key={text} style={{ padding: '0 8px' }}>
      <button
        onClick={onClick}
        className="intent-prompt-row"
        style={{ width: '100%', textAlign: 'left', padding: `${first ? 6 : 10}px 8px 10px`, border: 'none', background: 'none', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0E151C', lineHeight: '20px', cursor: 'pointer', borderRadius: 8, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {text}
      </button>
      {!last && <div style={{ margin: '0 8px', borderBottom: '1px solid #F3F2F0' }} />}
    </div>
  );

  return (
    <div ref={containerRef} style={{ flexShrink: 0, padding: '4px 24px 12px' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {chipBtn('ideas', hasInput ? 'Enhance prompt' : 'Prompt ideas', ideasIcon, openChip === 'ideas')}
        {chipBtn('history', 'Prompt history', historyIcon, openChip === 'history')}
      </div>

      {openChip !== null && overlayRect && (
        <div style={{
          position: 'fixed',
          top: overlayRect.top, left: overlayRect.left,
          width: overlayRect.width, height: overlayRect.height,
          background: '#fff', border: '1px solid #E5E4E2',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          opacity: closing || entering ? 0 : 1,
          transform: closing || entering ? 'translateY(12px)' : 'translateY(0)',
          transition: entering ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
        }}>
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ padding: '6px 8px 0', display: 'flex', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: 12, color: '#74818E', lineHeight: '18px', paddingLeft: 6 }}>
                  {openChip === 'ideas'
                    ? (hasInput ? 'Add to your prompt' : 'Get started with an idea')
                    : 'Recent prompts'}
                </span>
                <button onClick={closePanel} className="intent-chip"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#475467" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </button>
              </div>

              {openChip === 'ideas' && ideas.map((idea, j) =>
                rowBtn(
                  idea,
                  () => {
                    // If there's already text, append the enhancement; otherwise replace
                    onInputChange(hasInput ? input.trim() + '. ' + idea : idea);
                    closePanel();
                  },
                  j === 0,
                  j === ideas.length - 1
                )
              )}

              {openChip === 'history' && (
                history.length === 0
                  ? <div style={{ padding: '16px', fontSize: 13, color: '#74818E', lineHeight: '20px' }}>No previous prompts yet — they'll appear here after you click Brisk It.</div>
                  : history.map((entry, j) =>
                      rowBtn(entry, () => { onInputChange(entry); closePanel(); }, j === 0, j === history.length - 1)
                    )
              )}

              <div style={{ height: 4 }} />
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)', pointerEvents: 'none', borderRadius: '0 0 12px 12px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
