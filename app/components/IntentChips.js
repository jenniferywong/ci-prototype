'use client';
import { useState, useRef, useEffect } from 'react';
import { INTENT_PROMPTS, GENERIC_CHIPS } from '../../lib/intentPrompts.js';

function hydrate(template, topic) {
  return template.replace(/\{topic\}/g, topic || 'your topic');
}

function deriveTopic(input, pageContext, pageChipVisible, toolName) {
  // 3+ words typed by user → use their input as the topic
  if (input && input.trim().split(/\s+/).filter(Boolean).length >= 3) {
    return input.trim().slice(0, 60);
  }
  // Page context chip visible → use cleaned page title
  if (pageChipVisible && pageContext?.title) {
    return pageContext.title
      .replace(/\s*[-–|]\s*[^-–|]{3,}$/, '')
      .trim()
      .slice(0, 60) || pageContext.title;
  }
  return `your ${(toolName || 'content').toLowerCase()}`;
}

export default function IntentChips({ toolName, input, onInputChange, pageContext, pageChipVisible }) {
  const [openIdx, setOpenIdx] = useState(null);
  const containerRef = useRef(null);

  const chips = INTENT_PROMPTS[toolName] || GENERIC_CHIPS;
  const topic = deriveTopic(input, pageContext, pageChipVisible, toolName);

  // Close on outside click
  useEffect(() => {
    if (openIdx === null) return;
    function onDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenIdx(null);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openIdx]);

  return (
    <div ref={containerRef} style={{ flexShrink: 0, padding: '4px 24px 12px', position: 'relative' }}>
      {/* Chip row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {chips.map((chip, i) => {
          const active = openIdx === i;
          return (
            <button
              key={chip.label}
              onClick={() => setOpenIdx(active ? null : i)}
              className="intent-chip"
              style={{
                height: 30,
                padding: '0 12px',
                border: `1px solid ${active ? '#06465C' : '#E5E4E2'}`,
                borderRadius: 999,
                background: active ? '#EEF4F6' : '#fff',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
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

      {/* Popovers — one per chip, CSS-animated */}
      {chips.map((chip, i) => (
        <div
          key={chip.label + '-pop'}
          className={openIdx === i ? 'intent-popover intent-popover--open' : 'intent-popover'}
          style={{
            position: 'absolute',
            top: '100%',
            left: 24,
            right: 24,
            marginTop: 4,
            background: '#fff',
            border: '1px solid #E5E4E2',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {chip.prompts.map((prompt, j) => (
            <button
              key={j}
              onClick={() => {
                onInputChange(hydrate(prompt, topic));
                setOpenIdx(null);
              }}
              className="intent-prompt-row"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                borderBottom: j < chip.prompts.length - 1 ? '1px solid #F3F2F0' : 'none',
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
      ))}
    </div>
  );
}
