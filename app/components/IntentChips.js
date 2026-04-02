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

  // Both typed input AND page context — combine them
  if (typed && pageTitle) {
    return typed.length > 30 ? typed.slice(0, 60) : `${typed} (${pageTitle})`;
  }
  // Just typed input — any length counts
  if (typed) return typed.slice(0, 60);
  // Just page context
  if (pageTitle) return pageTitle;
  return `your ${(toolName || 'content').toLowerCase()}`;
}

export default function IntentChips({ toolName, input, onInputChange, pageContext, pageChipVisible, promptBoxRef }) {
  const [openIdx, setOpenIdx] = useState(null);
  const [overlayRect, setOverlayRect] = useState(null);
  const containerRef = useRef(null);

  const chips = INTENT_PROMPTS[toolName] || GENERIC_CHIPS;
  const topic = deriveTopic(input, pageContext, pageChipVisible, toolName);

  function openChip(i) {
    if (promptBoxRef?.current) {
      const r = promptBoxRef.current.getBoundingClientRect();
      setOverlayRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    setOpenIdx(i);
  }

  function closeChip() {
    setOpenIdx(null);
    setOverlayRect(null);
  }

  // Close on outside click
  useEffect(() => {
    if (openIdx === null) return;
    function onDown(e) {
      // Close if click is outside the overlay area
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
      <div style={{ display: 'flex', gap: 4 }}>
        {chips.map((chip, i) => {
          const active = openIdx === i;
          return (
            <button
              key={chip.label}
              onClick={() => openIdx === i ? closeChip() : openChip(i)}
              className="intent-chip"
              style={{
                height: 28,
                padding: '0 11px',
                border: `1px solid ${active ? '#06465C' : '#E5E4E2'}`,
                borderRadius: 999,
                background: active ? '#EEF4F6' : '#fff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 500,
                color: active ? '#06465C' : '#57534e',
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
          className="intent-popover intent-popover--open"
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
          }}
        >
          {/* Prompt list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chips[openIdx].prompts.map((prompt, j) => (
              <button
                key={j}
                onClick={() => {
                  onInputChange(hydrate(prompt, topic));
                  closeChip();
                }}
                className="intent-prompt-row"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 14px',
                  border: 'none',
                  borderBottom: j < chips[openIdx].prompts.length - 1 ? '1px solid #F3F2F0' : 'none',
                  background: 'none',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#0E151C',
                  lineHeight: '20px',
                  cursor: 'pointer',
                }}
              >
                {hydrate(prompt, topic)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
