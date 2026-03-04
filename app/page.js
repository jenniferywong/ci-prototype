'use client';

import { useState, useEffect, useRef } from 'react';

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
  if (/french revolution|coloniali|world war|imperialism|cold war|civil rights|capitalism/.test(s)) return 'ss10';
  if (/confederation|medieval|renaissance|indigenous|ancient civili|first nations/.test(s)) return 'ss9';
  if (/dna|evolution|chemical reaction|energy transfer|genetics|atom|molecule|periodic/.test(s)) return 'sci10';
  if (/photosynthesis|cell|ecosystem|climate|plate tectonic|matter|physical change/.test(s)) return 'sci8';
  return null;
}

function detectSubjectFromTopic(topic) {
  const t = (topic || '').toLowerCase();
  if (/fraction|algebra|geometry|ratio|equation|multiplication|division|calculus|statistic|percent|decimal|integer|polynomial|quadratic|trigonometry|exponent|factor|prime|probability|coordinate|slope|linear|arithmetic/.test(t)) return 'Math';
  if (/photosynthesis|cell|chemistry|physics|ecosystem|biology|organism|atom|molecule|force|energy|evolution|genetics|periodic|element|compound|wave|gravity|reaction|mitosis|dna/.test(t)) return 'Science';
  if (/war|revolution|democracy|coloniali|civil rights|history|government|civics|constitution|amendment|medieval|ancient|empire|treaty|suffrage|segregation|slavery|immigration|culture|civilization/.test(t)) return 'Social Studies';
  return 'ELA';
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
  header: '#0f172a', green: '#22c55e', greenDark: '#15803d',
  slate100: '#f1f5f9', slate200: '#e2e8f0', slate300: '#cbd5e1',
  slate400: '#94a3b8', slate500: '#64748b', slate600: '#475569',
  slate700: '#334155', slate900: '#0f172a',
  amber50: '#fffbeb', amber200: '#fde68a',
  formsPurple: '#673AB7',
};

// ── UI primitives ──────────────────────────────────────────────

function BriskLogo({ size = 28 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${C.green},${C.greenDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: size * 0.44 }}>B</div>;
}

function Header({ onClose }) {
  return (
    <div style={{ background: C.header, borderRadius: '11px 11px 0 0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px' }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em' }}>CURRICULUM INTELLIGENCE</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.slate300, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>✕</button>
      </div>
    </div>
  );
}

function HeaderFlat({ onClose }) {
  return (
    <div style={{ background: C.header, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px' }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em' }}>CURRICULUM INTELLIGENCE</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.slate300, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>✕</button>
      </div>
    </div>
  );
}

function PrefsHeader({ title, subtitle, onBack, onClose }) {
  return (
    <div style={{ background: '#fff', borderRadius: '11px 11px 0 0', borderBottom: `1px solid ${C.slate200}`, padding: '12px 14px', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate600, fontSize: 18, padding: 0, lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.slate900 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.slate600, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate400, fontSize: 16, padding: 0, flexShrink: 0 }}>✕</button>
      </div>
    </div>
  );
}

function SubHeader({ onBack, label = 'Quiz' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: `1px solid ${C.slate200}`, background: '#fff', flexShrink: 0 }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.slate600, fontSize: 16, padding: '2px 6px 2px 0' }}>←</button>
      <span style={{ fontSize: 13, color: C.slate600, fontWeight: 500 }}>{label}</span>
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
      <div style={{ background: '#f8fafc', border: `1px solid ${C.slate200}`, borderRadius: '0 12px 12px 12px', padding: '10px 12px', fontSize: 13, lineHeight: 1.55, color: C.slate900, maxWidth: '90%' }}>{children}</div>
    </div>
  );
}

function TeacherBubble({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: C.slate900, borderRadius: '12px 12px 0 12px', padding: '10px 12px', fontSize: 13, lineHeight: 1.55, color: '#fff', maxWidth: '80%' }}>{children}</div>
    </div>
  );
}

function TextInput({ placeholder, value, onChange, onSubmit, disabled, animatedPlaceholder, animatedPlaceholderOpacity = 1, onFocus, onBlur }) {
  return (
    <div style={{ borderTop: `1px solid ${C.slate200}`, padding: '10px 12px', background: '#fff', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <textarea rows={2} placeholder={animatedPlaceholder ? '' : placeholder} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
          onFocus={onFocus} onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          style={{ width: '100%', border: `1px solid ${C.slate200}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', color: C.slate900, lineHeight: 1.5, opacity: disabled ? 0.5 : 1, boxSizing: 'border-box' }} />
        {animatedPlaceholder && !value && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', padding: '8px 10px', fontSize: 13, color: C.slate400, lineHeight: 1.5, opacity: animatedPlaceholderOpacity, transition: 'opacity 0.35s ease' }}>
            {animatedPlaceholder}
          </div>
        )}
      </div>
      <button onClick={onSubmit} disabled={!value.trim() || disabled}
        style={{ background: value.trim() && !disabled ? C.slate900 : C.slate200, color: value.trim() && !disabled ? '#fff' : C.slate400, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: value.trim() && !disabled ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>→</button>
    </div>
  );
}

function ChoiceRow({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{ width: '100%', background: selected ? C.slate200 : C.slate100, border: `1px solid ${selected ? C.slate300 : C.slate200}`, borderRadius: 8, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: selected ? 600 : 400, color: C.slate900, textAlign: 'left' }}>
      {label}{selected && <span style={{ color: C.slate600 }}>→</span>}
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
  return <div style={{ fontSize: 11, fontWeight: 700, color: C.slate400, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '14px 14px 6px', borderTop: noBorder ? 'none' : `1px solid ${C.slate200}` }}>{label}</div>;
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
    <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 6px' }}>
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
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ background: C.formsPurple, height: 10 }} />
          <div style={{ padding: '22px 24px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 400, color: '#202124', lineHeight: 1.3 }}>{title || 'Quiz'}</div>
            <div style={{ fontSize: 13, color: '#70757a', marginTop: 4 }}>Generated by Brisk Curriculum Intelligence</div>
          </div>
        </div>

        {/* Vocabulary warm-up — amber card */}
        {quiz?.warmup?.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '16px 24px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{quiz.warmupLabel || 'Warm-Up'}</div>
            {quiz.warmup.map((w, i) => (
              <div key={i} style={{ fontSize: 14, color: '#202124', marginBottom: 6, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600 }}>{w.term}</span> — {w.definition}
              </div>
            ))}
          </div>
        )}

        {/* Questions — plain cards with blank radio buttons */}
        {quiz?.questions?.map((q, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e8e8e8', padding: '18px 24px', marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#202124', lineHeight: 1.6, marginBottom: q.hint ? 8 : 14 }}>
              <span style={{ fontWeight: 600, color: '#5f6368' }}>Q{i + 1}.&nbsp;</span>
              {q.question}
            </div>
            {q.hint && (
              <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic', marginBottom: 12 }}>
                💡 Hint: {q.hint}
              </div>
            )}

            {/* MC / TF — plain blank radio buttons */}
            {q.options?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #9e9e9e', flexShrink: 0, background: '#fff' }} />
                    <span style={{ fontSize: 14, color: '#202124' }}>{opt}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Short answer */
              <div style={{ borderBottom: '1px solid #9e9e9e', paddingBottom: 4, color: '#9e9e9e', fontSize: 13 }}>Your answer</div>
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
// MAIN
// ══════════════════════════════════════════════════════════════
const DEFAULT_PREFS = { language: 'English', grade: '8th', questionType: 'Multiple Choice', numQuestions: 10, platform: 'Forms', includeSources: false };

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

  // Auto-fetch page metadata when URL is pasted on Screen 0
  useEffect(() => {
    if (screen !== 0 || !pageUrl.trim()) return;
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

  function handleClose() {
    setScreen('welcome'); setTopic(''); setCurriculumCard(null); setCardLoading(false);
    setHardestThing(''); setFluencyAnswer(''); setNeeds2Data(null);
    setNeeds2Loading(false); setNeeds2Answer(''); setStrategy(null);
    setQuizLoading(false); setApiError(''); setDetectedSubject('');
    setScaffolds([]); setPrefs(DEFAULT_PREFS); setInput('');
    setVersions([]); setActiveVersionIdx(0); setChatLog([]); setMaxScreenReached(0);
    setSelectedClass(''); setClassOverridden(false); setClassFlashing(false);
    setPageUrl(''); setPageContext(null); setPageContextLoading(false);
    setNeedsSuggestions([]); setNeedsSuggestionsLoading(false);
    setPlaceholderIdx(0); setPlaceholderOpacity(1); setNeedsInputFocused(false);
    setWarmupAnswered('');
    setPanelPos(null);
    currentQuizRef.current = null;
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
    if (e.clientY - rect.top > 44) return; // header area only
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startLeft = rect.left, startTop = rect.top;
    function onMove(ev) {
      const h = panelRef.current?.offsetHeight || 620;
      setPanelPos({
        left: Math.max(8, Math.min(window.innerWidth - 380 - 8, startLeft + ev.clientX - startX)),
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

  // ── Styles ────────────────────────────────────────────────────
  const outerStyle = { minHeight: '100vh' };

  const panelStyle = {
    width: 380, background: '#fff', borderRadius: 11,
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    display: 'flex', flexDirection: 'column', height: 620,
    overflow: 'hidden', position: 'fixed', zIndex: 10,
    ...(panelPos ? { left: panelPos.left, top: panelPos.top } : { bottom: 24, right: 24 }),
  };

  // ── Panel content ────────────────────────────────────────────
  const panelContent = (
    <div ref={panelRef} style={panelStyle} onMouseDown={handlePanelMouseDown}>
      {/* Progress bar only on screen 8 */}
      {screen === 8 && <ProgressBar />}

      {/* Header — screen 0 renders its own header */}
      {isNumericScreen && screen !== 0
        ? (quizExists ? <HeaderFlat onClose={handleClose} /> : <Header onClose={handleClose} />)
        : !isNumericScreen
          ? (screen === '7b'
            ? <PrefsHeader title="Edit Preferences" subtitle={`Quiz: ${topic}`} onBack={() => go(7)} onClose={handleClose} />
            : screen === '7c'
              ? <PrefsHeader title="Scaffolds" onBack={() => setScreen('7b')} onClose={handleClose} />
              : null)
          : null}

      {/* ── WELCOME SCREEN ── */}
      {screen === 'welcome' && (
        <>
          <Header onClose={handleClose} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.slate900, marginBottom: 12 }}>Welcome</div>
            <p style={{ fontSize: 13, color: C.slate700, lineHeight: 1.65, margin: '0 0 14px' }}>
              Your district has uploaded their curriculum and instructional strategies to Brisk based on our latest Curriculum Intelligence feature. Now when you create resources in Brisk, they&apos;re automatically grounded in where your class is and what your district needs — no extra steps needed.
            </p>
            <p style={{ fontSize: 13, color: C.slate700, lineHeight: 1.65, margin: '0 0 22px', fontWeight: 600 }}>
              You&apos;re about to create a quiz.
            </p>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>I am a…</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {['Teacher', 'Brisk Employee', 'Other'].map(opt => (
                <label key={opt} onClick={() => setUserType(opt)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${userType === opt ? C.slate900 : C.slate200}`, background: userType === opt ? C.slate100 : '#fff', transition: 'border-color 0.1s' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${userType === opt ? C.slate900 : C.slate300}`, background: userType === opt ? C.slate900 : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {userType === opt && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 13, color: C.slate900, fontWeight: userType === opt ? 600 : 400 }}>{opt}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                logStep(sessionId, 'welcome_screen', userType, '', { user_type: userType });
                setScreen(0);
              }}
              style={{ width: '100%', background: C.slate900, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Let&apos;s go →
            </button>
          </div>
        </>
      )}

      {/* ── SCREEN 0 — Page Context ── */}
      {screen === 0 && (
        <>
          <Header onClose={handleClose} />
          <SubHeader onBack={() => setScreen('welcome')} label="Quiz" />
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.slate900, marginBottom: 4 }}>Simulate your current page</div>
            <div style={{ fontSize: 13, color: C.slate500, marginBottom: 14 }}>In the real Brisk extension, we&apos;d read the page you&apos;re on automatically. For this demo, paste a URL or upload a screenshot to simulate that.</div>

            {/* URL + upload row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleScreenshotUpload(e.target.files[0])} />
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

      {/* ── SCREEN 1 ── */}
      {screen === 1 && (
        <>
          <SubHeader onBack={() => setScreen(0)} label="Quiz" />
          <Breadcrumb active="Topic" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            <BriskBubble>What&apos;s your quiz about? Provide keywords to help me pull questions that fit where your students are right now.</BriskBubble>
          </ChatScroll>
          <TextInput placeholder="Try typing curriculum topics like 'Summer of Mariposas'" value={input} onChange={setInput} onSubmit={handleTopicSubmit} />
        </>
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

      {/* ── SCREEN 3 ── */}
      {screen === 3 && (
        <>
          <SubHeader onBack={() => go(2)} />
          <Breadcrumb active="Needs" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12, color: C.slate400 }}>1 of 2</span></div>
            <TeacherBubble>{hardestThing}</TeacherBubble>
            <BriskBubble>Are any students working below grade level on {subj}?</BriskBubble>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Some of them', 'No', 'It varies'].map(opt => (
                <ChoiceRow key={opt} label={opt} selected={fluencyAnswer === opt} onClick={() => handleFluencySelect(opt)} />
              ))}
              <OtherChoiceRow onSubmit={handleFluencySelect} />
            </div>
          </ChatScroll>
          <NavButtons onBack={() => go(2)} onSkip={() => { setFluencyAnswer('skipped'); logStep(sessionId, 'needs_fluency', 'skipped', '', { topic, subjectDetected: detectedSubject, user_type: userType }); go(4, 'skipped', ''); }} />
        </>
      )}

      {/* ── SCREEN 4 ── */}
      {screen === 4 && (
        <>
          <SubHeader onBack={() => go(3)} />
          <Breadcrumb active="Needs" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12, color: C.slate400 }}>2 of 2</span></div>
            {fluencyAnswer && fluencyAnswer !== 'skipped' && <TeacherBubble>{fluencyAnswer}</TeacherBubble>}
            {needs2Loading
              ? <BriskBubble><Spinner /></BriskBubble>
              : needs2Data ? (
                <>
                  <BriskBubble>{needs2Data.question}</BriskBubble>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {needs2Data.options.map(opt => (
                      <ChoiceRow key={opt} label={opt} selected={needs2Answer === opt} onClick={() => handleNeeds2Select(opt)} />
                    ))}
                    <OtherChoiceRow onSubmit={handleNeeds2Select} />
                  </div>
                </>
              ) : <BriskBubble>Loading question<LoadingDots /></BriskBubble>}
          </ChatScroll>
          <NavButtons onBack={() => go(3)} onSkip={() => {
            setNeeds2Answer('skipped');
            const s = pickStrategy(detectedSubject || curriculumCard?.subject || '', hardestThing, '');
            setStrategy(s);
            logStep(sessionId, 'needs_struggle', 'skipped', '', { topic, subjectDetected: detectedSubject, scaffoldStrategy: s?.name, user_type: userType });
            go(5, 'skipped', '');
          }} />
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
          <div style={{ flex: 1, overflowY: 'auto' }}>
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            {scaffolds.length === 0 && <div style={{ padding: '20px 14px', textAlign: 'center', color: C.slate400, fontSize: 13 }}>No scaffolds yet. Add one below.</div>}
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

      {/* ── SCREEN 9 ── */}
      {screen === 9 && (
        <>
          <SubHeader onBack={() => go(7)} />
          <Breadcrumb active="Create" visited={visitedSteps} onStepClick={handleBreadcrumbNav} />
          <ChatScroll>
            {chatLog.map(entry => {
              if (entry.type === 'teacher') {
                return <TeacherBubble key={entry.id}>{entry.text}</TeacherBubble>;
              }
              if (entry.type === 'brisk') {
                return (
                  <BriskBubble key={entry.id}>
                    {entry.text}{entry.isUpdating && <LoadingDots />}
                    {entry.hasRetry && (
                      <button
                        onClick={() => doRefine(retryFeedbackRef.current, retryQuizRef.current, entry.id)}
                        style={{ display: 'block', marginTop: 8, background: C.slate900, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Retry
                      </button>
                    )}
                  </BriskBubble>
                );
              }
              if (entry.type === 'version') {
                const v = versions[entry.versionIdx];
                if (!v) return null;
                return (
                  <VersionTile
                    key={entry.id}
                    version={v}
                    versionNum={entry.versionIdx + 1}
                    isActive={activeVersionIdx === entry.versionIdx}
                    onClick={() => setActiveVersionIdx(entry.versionIdx)}
                  />
                );
              }
              return null;
            })}
            {apiError && (
              <div style={{ background: '#fef3f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: C.slate700, textAlign: 'center' }}>
                <div style={{ marginBottom: 10 }}>Having trouble — try again?</div>
                <button onClick={() => { setApiError(''); setScreen(8); }}
                  style={{ background: C.slate900, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 18px', fontFamily: 'inherit', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Retry</button>
              </div>
            )}
          </ChatScroll>
          <TextInput placeholder="Add more details to make adjustments" value={input} onChange={setInput} onSubmit={handleRefineSubmit} disabled={quizLoading} />
        </>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={outerStyle}>
      {/* Quiz — fixed full-screen scrollable behind panel */}
      {quizExists && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, overflowY: 'auto', paddingRight: 416 }}>
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

      {/* CI Panel */}
      {panelContent}
    </div>
  );
}
