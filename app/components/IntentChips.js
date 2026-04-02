'use client';
import { useState, useRef, useEffect } from 'react';
import { INTENT_PROMPTS, GENERIC_CHIPS } from '../../lib/intentPrompts.js';

function hydrate(template, topic) {
  return template.replace(/\{topic\}/g, topic || 'your topic');
}

function cleanPageTitle(title) {
  return (title || '')
    .replace(/\s*[-–|]\s*(Wikipedia|Khan Academy|YouTube|Quizlet|BrainPOP|Britannica|Newsela|CommonLit|IXL|Desmos|ReadWorks|PBS|National Geographic)[^\n]*/i, '')
    .replace(/\s*[-–|]\s*[^-–|]{3,}$/, '')
    .trim()
    .slice(0, 50);
}

function deriveTopic(input, pageContext, pageChipVisible, toolName) {
  const typed = (input || '').trim();
  const pageTitle = pageChipVisible ? cleanPageTitle(pageContext?.title) : '';

  if (typed && pageTitle) {
    return typed.length > 30 ? typed.slice(0, 60) : `${typed} (${pageTitle})`;
  }
  if (typed) return typed.slice(0, 60);
  if (pageTitle) return pageTitle;
  return `your ${(toolName || 'content').toLowerCase()}`;
}

export default function IntentChips({ toolName, input, onInputChange, pageContext, pageChipVisible, promptBoxRef }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [overlayRect, setOverlayRect] = useState(null);
  const [closing, setClosing] = useState(false);
  const [entering, setEntering] = useState(false);
  const closeTimerRef = useRef(null);
  const enterTimerRef = useRef(null);
  const containerRef = useRef(null);

  const chips = INTENT_PROMPTS[toolName] || GENERIC_CHIPS;
  const topic = deriveTopic(input, pageContext, pageChipVisible, toolName);

  function openChip(i) {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    setClosing(false);
    setEntering(true);
    if (promptBoxRef?.current) {
      const r = promptBoxRef.current.getBoundingClientRect();
      setOverlayRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    setOpenIdx(i);
    enterTimerRef.current = setTimeout(() => setEntering(false), 16);
  }

  function closeChip() {
    setClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setOpenIdx(null);
      setOverlayRect(null);
      setClosing(false);
    }, 200);
  }

  useEffect(() => () => { clearTimeout(closeTimerRef.current); clearTimeout(enterTimerRef.current); }, []);

  // Close on outside click
  useEffect(() => {
    if (openIdx === null) return;
    function onDown(e) {
      if (overlayRect) {
        const { top, left, width, height } = overlayRect;
        const inOverlay =
          e.clientX >= left && e.clientX <= left + width &&
          e.clientY >= top && e.clientY <= top + height;
        if (!inOverlay) closeChip();
      } else if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeChip();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openIdx, overlayRect]);

  return (
    <div ref={containerRef} style={{ flexShrink: 0, padding: '4px 24px 12px' }}>
      {/* Chip row */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {chips.map((chip, i) => {
          const active = openIdx === i;
          return (
            <button
              key={chip.label}
              onClick={() => openIdx === i ? closeChip() : openChip(i)}
              className="intent-chip"
              style={{
                height: 40,
                padding: '8px 12px',
                border: `1px solid ${active ? '#06465C' : '#E5E4E2'}`,
                borderRadius: 999,
                background: active ? '#EEF4F6' : '#fff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 400,
                lineHeight: '22px',
                color: active ? '#06465C' : '#344054',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.12s, border-color 0.12s, color 0.12s',
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Overlay — fixed over the prompt box */}
      {openIdx !== null && overlayRect && (
        <div
          style={{
            position: 'fixed',
            top: overlayRect.top,
            left: overlayRect.left,
            width: overlayRect.width,
            height: overlayRect.height,
            background: '#fff',
            border: '1px solid #E5E4E2',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: closing || entering ? 0 : 1,
            transform: closing ? 'translateY(12px)' : entering ? 'translateY(12px)' : 'translateY(0)',
            transition: entering ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {/* Prompt list */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <div style={{ padding: '6px 8px 0px', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 400, color: '#74818E', lineHeight: '18px', paddingLeft: 6 }}>Select starter prompt</span>
              <button
                onClick={closeChip}
                className="intent-chip"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1L9 9M9 1L1 9" stroke="#475467" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </button>
            </div>
            {chips[openIdx].prompts.map((prompt, j) => (
              <div key={j} style={{ padding: '0 8px' }}>
                <button
                  onClick={() => {
                    onInputChange(hydrate(prompt, topic));
                    closeChip();
                  }}
                  className="intent-prompt-row"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: `${j === 0 ? 6 : 10}px 8px 10px`,
                    border: 'none',
                    background: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: 400,
                    color: '#0E151C',
                    lineHeight: '20px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'block',
                  }}
                >
                  {hydrate(prompt, topic)}
                </button>
                {j < chips[openIdx].prompts.length - 1 && (
                  <div style={{ margin: '0 8px', borderBottom: '1px solid #F3F2F0' }} />
                )}
              </div>
            ))}
            <div style={{ height: 4 }} />
          </div>
          {/* Scroll fade overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 40,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)',
            pointerEvents: 'none',
            borderRadius: '0 0 12px 12px',
          }} />
          </div>
        </div>
      )}
    </div>
  );
}
